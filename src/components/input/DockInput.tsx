'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Command, PlusCircle, ArrowUpCircle, Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react';
import { useCanvas } from '@/contexts/CanvasContext';

interface DockInputProps {
  variant?: 'global' | 'node';
  nodeId?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function DockInput({ 
  variant = 'global', 
  nodeId, 
  placeholder,
  autoFocus = false 
}: DockInputProps) {
  const [input, setInput] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const { spawnChildNode, nodes } = useCanvas();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasNodes = nodes.length > 0;
  const isGlobal = variant === 'global';

  // Handle file preview cleanup
  useEffect(() => {
    // Generate new previews
    const newPreviews = files.map(file => 
      file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
    );
    setPreviews(newPreviews);

    // Cleanup function to revoke URLs
    return () => {
      newPreviews.forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [files]);

  // Helper to convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async () => {
    if (!input.trim() && files.length === 0) return;
    
    // Convert files to base64 attachments
    const attachments = await Promise.all(
      files.map(async (file) => ({
        type: file.type,
        url: await fileToBase64(file)
      }))
    );

    const finalPrompt = input.trim();

    if (isGlobal) {
      // 通过 ChatHandler 自动创建第一个节点
      spawnChildNode('root', finalPrompt, attachments); 
    } else if (nodeId) {
      spawnChildNode(nodeId, finalPrompt, attachments);
    }
    
    setInput('');
    setFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  // Sync height whenever input changes (handles programmatic updates like clipboard)
  useEffect(() => {
    adjustHeight();
  }, [input]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      addValidFiles(newFiles);
    }
  };

  const addValidFiles = (newFiles: File[]) => {
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    
    setFiles(prev => {
      const validFiles = newFiles.filter(file => {
        if (file.size > MAX_SIZE) {
          alert(`File "${file.name}" is too large. Maximum size is 5MB.`);
          return false;
        }
        // Simple de-duplication: check if file with same name and size already exists
        const isDuplicate = prev.some(p => p.name === file.name && p.size === file.size);
        return !isDuplicate;
      });
      return [...prev, ...validFiles];
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const lastAutoFilledRef = useRef<string>('');
  const lastFilesFingerprintRef = useRef<string>('');

  // Helper to process clipboard items (used by both auto-read and manual paste)
  const processClipboardItems = async (items: ClipboardItem[] | DataTransferItemList) => {
    const newFiles: File[] = [];
    let textContent = '';

    for (const item of Array.from(items)) {
      // Handle ClipboardItem (from navigator.clipboard.read)
      if (item instanceof ClipboardItem) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const extension = type.split('/')[1] || 'png';
            const file = new File([blob], `pasted-image-${blob.size}.${extension}`, { type });
            newFiles.push(file);
          } else if (type === 'text/plain') {
            const blob = await item.getType(type);
            textContent = await blob.text();
          }
        }
      } 
      // Handle DataTransferItem (from onPaste event)
      else if (item instanceof DataTransferItem) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            const renamedFile = new File([file], `pasted-image-${file.size}.${file.type.split('/')[1]}`, { type: file.type });
            newFiles.push(renamedFile);
          }
        } else if (item.type === 'text/plain') {
          textContent = await new Promise<string>(resolve => item.getAsString(resolve));
        }
      }
    }

    if (newFiles.length > 0) {
      addValidFiles(newFiles);
    }
    return textContent;
  };

  // Helper to get a fingerprint of clipboard items to avoid repeated auto-reading
  const getClipboardFingerprint = async (items: ClipboardItem[]) => {
    let fingerprint = '';
    for (const item of items) {
      fingerprint += item.types.join(',') + '-';
      if (item.types.includes('text/plain')) {
        try {
          const blob = await item.getType('text/plain');
          const text = await blob.text();
          fingerprint += `text:${text.length}:${text.slice(0, 20)}`;
        } catch (e) {}
      }
      if (item.types.some(t => t.startsWith('image/'))) {
        fingerprint += `img:${item.types.find(t => t.startsWith('image/'))}`;
        // We can't easily get the size without reading the whole blob,
        // so we'll rely on the combination of types and text for the fingerprint
      }
    }
    return fingerprint;
  };

  // Auto-read clipboard logic
  useEffect(() => {
    if (!isGlobal) return;

    const checkClipboard = async () => {
      const config = JSON.parse(localStorage.getItem('nexus-model-config') || '{}');
      if (!config.autoReadClipboard) return;

      try {
        const items = await navigator.clipboard.read();
        
        // Generate a fingerprint of current clipboard
        let currentFingerprint = '';
        for (const item of items) {
          currentFingerprint += item.types.join('|');
        }

        // If clipboard fingerprint hasn't changed, don't auto-read again
        // This is the key fix: if user deleted the last auto-read content, 
        // we don't re-add it until they copy something NEW.
        if (currentFingerprint === lastFilesFingerprintRef.current) return;

        // Also avoid reading if we already have files and it's a focus trigger
        if (files.length > 0) return;

        const currentInput = textareaRef.current?.value || '';
        const textContent = await processClipboardItems(items);
        const trimmedText = textContent?.trim();

        if (currentInput.trim() === '' && trimmedText && trimmedText !== lastAutoFilledRef.current) {
          setInput(trimmedText);
          lastAutoFilledRef.current = trimmedText;
        }
        
        // Record this clipboard state as "processed"
        lastFilesFingerprintRef.current = currentFingerprint;
        
      } catch (err) {
        console.warn('Auto-read clipboard failed:', err);
      }
    };

    // Initial check and on focus
    checkClipboard();
    const handleFocus = () => {
      // Small delay to ensure clipboard is ready
      setTimeout(checkClipboard, 100);
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isGlobal, files.length]);

  // If user clears everything or changes something manually, we might want to reset fingerprint?
  // No, the safest is to only reset when they copy something else.

  // Handle manual paste event for better UX
  const handlePaste = async (e: React.ClipboardEvent) => {
    if (e.clipboardData?.items) {
      e.preventDefault();
      const text = await processClipboardItems(e.clipboardData.items);
      
      // Update fingerprint so auto-read doesn't try to "re-add" what was just manually pasted
      let manualFingerprint = '';
      for (const item of Array.from(e.clipboardData.items)) {
        manualFingerprint += item.type + '|';
      }
      lastFilesFingerprintRef.current = manualFingerprint;

      if (text && !input) {
        setInput(text);
      } else if (text) {
        const start = textareaRef.current?.selectionStart || 0;
        const end = textareaRef.current?.selectionEnd || 0;
        const newValue = input.substring(0, start) + text + input.substring(end);
        setInput(newValue);
      }
    }
  };

  // Clear the memory if the user starts typing something else
  useEffect(() => {
    if (input.trim() !== '' && input !== lastAutoFilledRef.current) {
      lastAutoFilledRef.current = '';
    }
  }, [input]);

  const isActive = input.trim().length > 0 || files.length > 0;
  
  // 核心修复：只要 isActive 为真，就绝对不隐藏
  const globalContainerClasses = `fixed bottom-8 left-1/2 -translate-x-1/2 z-[1000] transition-all duration-500 ease-out 
    ${(hasNodes && !isHovered && !isActive) ? 'translate-y-24 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`;

  const triggerBar = isGlobal && hasNodes && (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-64 h-8 z-[999] group cursor-pointer flex justify-center items-start"
    >
      <div className="w-16 h-1.5 bg-slate-300 rounded-full mt-3 group-hover:bg-indigo-500 transition-colors" />
    </div>
  );

  return (
    <>
      {triggerBar}
      <div 
        className={isGlobal ? globalContainerClasses : 'w-full'}
        onMouseEnter={() => isGlobal && setIsHovered(true)}
        onMouseLeave={() => isGlobal && setIsHovered(false)}
      >
        <div className={`
          relative flex flex-col bg-white border-2 transition-all duration-300
          ${isGlobal 
            ? 'w-[700px] rounded-[2.5rem] shadow-[0_25px_70px_rgba(0,0,0,0.15)] border-slate-200' 
            : 'w-full rounded-xl border-slate-200 shadow-sm'}
          focus-within:border-indigo-600 focus-within:ring-8 focus-within:ring-indigo-500/10
        `}>
          
          {/* File Previews */}
          {files.length > 0 && (
            <div className={`flex flex-wrap gap-2 border-b border-slate-50 ${isGlobal ? 'px-6 pt-4 pb-2' : 'px-3 pt-2 pb-1'}`}>
              {files.map((file, i) => (
                <div key={i} className={`group relative flex items-center gap-2 bg-slate-50 border-2 border-slate-100 rounded-lg hover:border-indigo-200 transition-all ${isGlobal ? 'px-3 py-2' : 'px-2 py-1'}`}>
                  {file.type.startsWith('image/') ? (
                    <div className={`${isGlobal ? 'w-8 h-8' : 'w-6 h-6'} rounded-md overflow-hidden bg-slate-200`}>
                      <img src={previews[i]} className="w-full h-full object-cover" alt="preview" />
                    </div>
                  ) : (
                    <div className={`${isGlobal ? 'w-8 h-8' : 'w-6 h-6'} rounded-md bg-indigo-50 flex items-center justify-center text-indigo-600`}>
                      <FileText size={isGlobal ? 16 : 12} />
                    </div>
                  )}
                  <span className={`font-bold text-slate-600 truncate ${isGlobal ? 'text-[12px] max-w-[120px]' : 'text-[10px] max-w-[80px]'}`}>{file.name}</span>
                  <button 
                    onClick={() => removeFile(i)}
                    className="p-1 bg-red-500 text-white rounded-full absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
                  >
                    <X size={8} strokeWidth={4} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={`flex items-end gap-2 ${isGlobal ? 'p-4' : 'p-2'}`}>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center justify-center rounded-xl transition-all shrink-0 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 ${isGlobal ? 'w-12 h-12' : 'w-9 h-9'}`}
            >
              <Paperclip size={isGlobal ? 24 : 18} />
            </button>

            <div className={`flex-1 flex items-center px-3 ${isGlobal ? 'bg-slate-50 min-h-[48px] rounded-2xl' : 'bg-transparent min-h-[36px]'} transition-colors`}>
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={placeholder || (isGlobal ? "Create a new concept..." : "Ask a follow-up...")}
                className={`w-full bg-transparent border-none focus:ring-0 resize-none py-2 font-bold text-black placeholder:text-slate-400 outline-none scrollbar-hide ${isGlobal ? 'text-[16px]' : 'text-[13px]'}`}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!input.trim() && files.length === 0}
              className={`
                flex items-center justify-center rounded-xl transition-all shrink-0
                ${isGlobal ? 'w-12 h-12' : 'w-9 h-9'}
                ${(input.trim() || files.length > 0)
                  ? 'bg-indigo-600 text-white shadow-lg hover:scale-105 active:scale-95' 
                  : 'bg-slate-100 text-slate-300'}
              `}
            >
              <ArrowUpCircle size={isGlobal ? 28 : 22} strokeWidth={2.5} />
            </button>
          </div>

          {isGlobal && (
            <div className="px-6 pb-3 flex items-center justify-between border-t border-slate-100 mt-1">
              <div className="flex items-center gap-4 text-slate-400">
                <div className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors cursor-help">
                  <Command size={14} />
                  <span className="text-[11px] font-black uppercase tracking-tighter">Enter to send</span>
                </div>
                <div className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors cursor-help">
                  <PlusCircle size={14} />
                  <span className="text-[11px] font-black uppercase tracking-tighter">Shift+Enter for newline</span>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full">
                <Sparkles size={12} className="text-indigo-600" />
                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Multi-modal ON</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
