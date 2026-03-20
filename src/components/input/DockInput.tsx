'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Command, PlusCircle, ArrowUpCircle, Paperclip, X, FileText } from 'lucide-react';
import { useCanvas } from '@/contexts/CanvasContext';
import { useUndoTimer } from '@/hooks/use-undo-timer';
import { useClipboardCapture } from '@/hooks/use-clipboard-capture';
import ZeroFrictionPredictor from './ZeroFrictionPredictor';

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
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const { spawnChildNode, nodes } = useCanvas();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const undoValueRef = useRef<string>('');

  const isGlobal = variant === 'global';
  const hasNodes = nodes.length > 0;

  const { showUndoToast, countdown, triggerToast, hideToast } = useUndoTimer(5);

  const addValidFiles = useCallback((newFiles: File[]) => {
    const MAX_SIZE = 5 * 1024 * 1024;
    setFiles(prev => {
      const validFiles = newFiles.filter(file => {
        if (file.size > MAX_SIZE) return false;
        return !prev.some(p => p.name === file.name && p.size === file.size);
      });
      return [...prev, ...validFiles];
    });
  }, []);

  const { handleManualPaste, markAsDeleted, resetAutoFillMemory, checkClipboard } = useClipboardCapture({
    enabled: isGlobal,
    inputEmpty: input.trim() === '',
    hasNoFiles: files.length === 0,
    onCapture: (text, newFiles) => {
      undoValueRef.current = input;
      if (text) setInput(text);
      if (newFiles.length > 0) addValidFiles(newFiles);
      triggerToast();
    },
    onManualPaste: (text, newFiles) => {
      if ((text || newFiles.length > 0) && !input && files.length === 0) {
        undoValueRef.current = '';
        if (text) setInput(text);
        if (newFiles.length > 0) addValidFiles(newFiles);
        triggerToast();
      } else if (text) {
        const start = textareaRef.current?.selectionStart || 0;
        const end = textareaRef.current?.selectionEnd || 0;
        setInput(prev => prev.substring(0, start) + text + prev.substring(end));
      }
    }
  });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const newPreviews = files.map(file => file.type.startsWith('image/') ? URL.createObjectURL(file) : '');
    setPreviews(newPreviews);
    return () => newPreviews.forEach(url => url && URL.revokeObjectURL(url));
  }, [files]);

  const handleUndo = () => {
    setInput(undoValueRef.current);
    setFiles([]);
    hideToast();
  };

  const handleSubmit = async () => {
    if (!input.trim() && files.length === 0) return;

    const fileToBase64 = (file: File): Promise<string> => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

    const attachments = await Promise.all(files.map(async (file) => ({
      type: file.type,
      url: await fileToBase64(file)
    })));

    if (isGlobal) spawnChildNode('root', input.trim(), attachments);
    else if (nodeId) spawnChildNode(nodeId, input.trim(), attachments);

    markAsDeleted();
    setInput('');
    setFiles([]);
    hideToast();
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (input.trim() !== '') resetAutoFillMemory();
  }, [input, resetAutoFillMemory]);

  const removeFile = (index: number) => {
    markAsDeleted();
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const isActive = input.trim().length > 0 || files.length > 0;
  const globalContainerClasses = `fixed bottom-8 left-1/2 -translate-x-1/2 z-[1000] transition-all duration-500 ease-out 
    ${(hasNodes && !isHovered && !isActive) ? 'translate-y-24 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`;

  const undoToastContent = isGlobal && showUndoToast && (
    <div className="fixed top-12 left-[calc(50%+144px)] -translate-x-1/2 z-[99999] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-white/20 px-6 py-3 rounded-full shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] flex items-center gap-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping absolute" />
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 relative z-10" />
          <span className="text-[13px] font-black text-white uppercase tracking-[0.2em]">Captured</span>
        </div>
        <button onClick={handleUndo} className="text-[13px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-[0.2em]">
          Undo <span className="opacity-50 ml-1">({countdown}s)</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {mounted && createPortal(undoToastContent, document.body)}
      {isGlobal && hasNodes && (
        <div onMouseEnter={() => setIsHovered(true)} className="fixed bottom-0 left-1/2 -translate-x-1/2 w-64 h-8 z-[999] group cursor-pointer flex justify-center items-start">
          <div className="w-16 h-1.5 bg-slate-300 rounded-full mt-3 group-hover:bg-indigo-500 transition-colors" />
        </div>
      )}
      <div className={isGlobal ? globalContainerClasses : 'w-full'} onMouseEnter={() => isGlobal && setIsHovered(true)} onMouseLeave={() => isGlobal && setIsHovered(false)}>
        <div className={`relative flex flex-col bg-white border-2 transition-all duration-300 ${isGlobal ? 'w-[700px] rounded-[2.5rem] shadow-[0_25px_70px_rgba(0,0,0,0.15)]' : 'w-full rounded-xl'} border-slate-200 focus-within:border-indigo-600 focus-within:ring-8 focus-within:ring-indigo-500/10`}>
          {files.length > 0 && (
            <div className={`flex flex-wrap gap-2 border-b border-slate-50 ${isGlobal ? 'px-6 pt-4 pb-2' : 'px-3 pt-2 pb-1'}`}>
              {files.map((file, i) => (
                <div key={i} className="group relative flex items-center gap-2 bg-slate-50 border-2 border-slate-100 rounded-lg px-3 py-2">
                  {file.type.startsWith('image/') ? (
                    <img src={previews[i]} className="w-8 h-8 rounded-md object-cover" alt="preview" />
                  ) : (
                    <FileText size={16} className="text-indigo-600" />
                  )}
                  <span className="font-bold text-slate-600 text-[12px] max-w-[120px] truncate">{file.name}</span>
                  <button onClick={() => removeFile(i)} className="p-1 bg-red-500 text-white rounded-full absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity"><X size={8} strokeWidth={4} /></button>
                </div>
              ))}
            </div>
          )}
          <div className={`flex items-center gap-2 ${isGlobal ? 'p-4' : 'p-2'}`}>
            <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && addValidFiles(Array.from(e.target.files))} multiple className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center w-12 h-12 rounded-xl text-slate-400 hover:text-indigo-600 shrink-0"><Paperclip size={24} /></button>
            <div className={`flex-1 flex items-center px-3 ${isGlobal ? 'bg-slate-50 min-h-[48px] rounded-2xl' : 'min-h-[40px]'}`}>
              <textarea 
                ref={textareaRef} 
                rows={1} 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit())} 
                onPaste={handleManualPaste} 
                onFocus={() => nodes.length === 0 && checkClipboard(true)} 
                placeholder={placeholder || "Create a new concept..."} 
                className="w-full bg-transparent border-none focus:ring-0 resize-none py-2.5 font-bold text-black outline-none scrollbar-hide flex items-center" 
              />
            </div>
            <button onClick={handleSubmit} disabled={!input.trim() && files.length === 0} className={`flex items-center justify-center w-12 h-12 rounded-xl transition-all shrink-0 ${isActive ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-300'}`}><ArrowUpCircle size={28} strokeWidth={2.5} /></button>
          </div>

          {isGlobal && (
            <div className="px-6 py-3 flex items-center justify-between border-t border-slate-100 mt-1">
              <div className="flex items-center gap-4 text-slate-400">
                <div className="flex items-center gap-1.5"><Command size={14} /><span className="text-[11px] font-black uppercase">Enter to send</span></div>
                <div className="flex items-center gap-1.5"><PlusCircle size={14} /><span className="text-[11px] font-black uppercase">Shift+Enter newline</span></div>
              </div>
              <ZeroFrictionPredictor
                input={input}
                files={files}
                onComplete={() => {
                  setInput('');
                  setFiles([]);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
