'use client';

import React, { memo, useMemo, useState } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, GripHorizontal, Trash2, Sparkles, FileCode, FileText, CheckCircle2, SendHorizontal } from 'lucide-react';
import { useCanvas } from '@/contexts/CanvasContext';

function MarkdownNode({ id, data, selected }: { id: string, data: { text: string; isGenerating?: boolean }, selected: boolean }) {
  const { deleteNode, spawnChildNode } = useCanvas();
  const [copiedMD, setCopiedMD] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [localInput, setLocalInput] = useState('');

  const parsed = useMemo(() => {
    if (!data.text) return { cleanText: '', chips: [] };
    const chipRegex = /\[NEXT:\s*(.+?)\]/g;
    const chips: string[] = [];
    let match;
    while ((match = chipRegex.exec(data.text)) !== null) {
      chips.push(match[1]);
    }
    const cleanText = data.text.replace(chipRegex, '').trim().replace(/[,，\s]+$/, ''); 
    return { cleanText, chips };
  }, [data.text]);

  const copyMarkdown = async () => {
    await navigator.clipboard.writeText(parsed.cleanText);
    setCopiedMD(true);
    setTimeout(() => setCopiedMD(false), 2000);
  };

  const copyPlainText = async () => {
    const plainText = parsed.cleanText.replace(/[#*`~]/g, '').replace(/\[(.+?)\]\(.+?\)/g, '$1');
    await navigator.clipboard.writeText(plainText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleLocalSubmit = () => {
    if (!localInput.trim()) return;
    spawnChildNode(id, localInput.trim());
    setLocalInput('');
  };

  return (
    <div className={`nexus-force-light border-2 shadow-[0_30px_80px_rgba(0,0,0,0.4)] rounded-[2.5rem] w-full h-full flex flex-col overflow-hidden transition-all ${selected ? 'border-indigo-600 ring-8 ring-indigo-500/10' : 'border-slate-400'} group/node relative bg-white`}>
      
      {/* Invisible but large resizer handles */}
      <NodeResizer 
        minWidth={480} 
        minHeight={300} 
        isVisible={selected} 
        lineClassName="border-indigo-500 border-[3px] opacity-0 group-hover/node:opacity-30" 
        handleClassName="!w-12 !h-12 !bg-transparent !border-none !-m-6" 
      />

      <Handle type="target" position={Position.Top} className="!w-6 !h-6 !bg-indigo-600 !border-[3px] !border-white !-top-3 shadow-xl z-50" />
      
      {/* Header - Drag Only */}
      <div className="bg-slate-100 px-6 py-5 border-b-2 border-slate-200 flex items-center justify-between cursor-grab active:cursor-grabbing custom-drag-handle shrink-0">
        <div className="flex items-center gap-3.5">
          <div className={`p-2 rounded-2xl shadow-lg ${data.isGenerating ? 'bg-indigo-600 text-white animate-pulse' : 'bg-black text-white'}`}>
            <Bot size={22} strokeWidth={3} />
          </div>
          <span className="text-[14px] font-black text-black uppercase tracking-widest truncate max-w-[200px]">
            {data.isGenerating ? 'Synthesizing...' : 'Nexus Insight'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
           <button onClick={() => deleteNode(id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover/node:opacity-100">
            <Trash2 size={20} />
          </button>
          <GripHorizontal size={26} className="text-slate-400 group-hover/node:text-slate-600 ml-1" />
        </div>
      </div>

      {/* Content Body */}
      <div className="p-10 flex-1 overflow-y-auto nowheel bg-white selection:bg-indigo-100">
        <div className="prose prose-slate max-w-none 
          prose-p:!text-black prose-p:font-bold prose-p:leading-[1.9] prose-p:text-[18px] prose-p:mb-6
          prose-headings:!text-black prose-headings:font-black
          prose-strong:!text-indigo-800 prose-strong:font-black
          prose-code:!text-pink-600 prose-code:bg-slate-100 prose-code:px-2 prose-code:py-1 prose-code:rounded-lg
          prose-pre:bg-black prose-pre:text-white prose-pre:rounded-3xl prose-pre:p-8
          prose-table:border-2 prose-table:border-slate-200 prose-table:rounded-2xl prose-table:overflow-hidden">
          {parsed.cleanText ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsed.cleanText}</ReactMarkdown>
          ) : (
             data.isGenerating && (
              <div className="flex flex-col gap-8 py-4">
                <div className="h-6 bg-slate-100 rounded-full w-4/5 animate-pulse" />
                <div className="h-6 bg-slate-100 rounded-full w-full animate-pulse" />
                <div className="h-6 bg-slate-100 rounded-full w-2/3 animate-pulse" />
              </div>
            )
          )}
        </div>
      </div>

      {/* Footer Area */}
      {!data.isGenerating && (
        <div className="px-8 py-7 bg-slate-50 border-t-2 border-slate-200 flex flex-col gap-4 shrink-0">
          
          {/* Action Row: Chips (Left) & Copy Buttons (Right) */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2.5">
              {parsed.chips.map((label, idx) => (
                <button 
                  key={idx}
                  onClick={() => spawnChildNode(id, label)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-300 rounded-xl text-[11px] font-black text-black hover:bg-black hover:text-white hover:border-black transition-all shadow-sm uppercase tracking-tighter"
                >
                  <Sparkles size={12} className="text-indigo-500" />
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={copyMarkdown} title="Copy Markdown" className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-xl transition-all border-2 border-transparent hover:border-slate-200">
                {copiedMD ? <CheckCircle2 size={18} className="text-green-600" /> : <FileCode size={18} />}
              </button>
              <button onClick={copyPlainText} title="Copy Plain Text" className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-xl transition-all border-2 border-transparent hover:border-slate-200">
                {copiedText ? <CheckCircle2 size={18} className="text-green-600" /> : <FileText size={18} />}
              </button>
            </div>
          </div>

          {/* Follow-up Input */}
          <div className="relative group/input">
            <input 
              type="text"
              value={localInput}
              onChange={(e) => setLocalInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLocalSubmit()}
              placeholder="Ask a follow-up..."
              className="w-full pl-6 pr-14 py-4 bg-white border-2 border-slate-300 rounded-2xl text-[15px] font-bold text-black focus:border-indigo-600 outline-none transition-all shadow-inner"
            />
            <button 
              onClick={handleLocalSubmit}
              disabled={!localInput.trim()}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all ${localInput.trim() ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300'}`}
            >
              <SendHorizontal size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Visual Resize Fold/Corner (The Only Resize Cue) */}
      <div className="absolute bottom-3 right-3 w-12 h-12 pointer-events-none flex items-end justify-end opacity-20 group-hover/node:opacity-100 transition-opacity">
        <div className="w-10 h-10 border-r-[6px] border-b-[6px] border-indigo-600 rounded-br-3xl" />
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-6 !h-6 !bg-black !border-[3px] !border-white !-bottom-3 shadow-xl z-50" />
    </div>
  );
}

export default memo(MarkdownNode);
