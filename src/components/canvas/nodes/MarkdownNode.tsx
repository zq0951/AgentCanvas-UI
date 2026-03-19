'use client';

import React, { memo, useMemo, useState } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, GripHorizontal, Trash2, Sparkles, FileCode, FileText, CheckCircle2, RefreshCw } from 'lucide-react';
import DockInput from '@/components/input/DockInput';
import { useCanvas } from '@/contexts/CanvasContext';
import { NodeData } from '@/types/canvas';
import Modal from '@/components/ui/Modal';

function MarkdownNode({ id, data, selected }: { id: string, data: NodeData, selected: boolean }) {
  const { deleteNode, spawnChildNode, retryNode } = useCanvas();
  const [copiedMD, setCopiedMD] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const parsed = useMemo(() => {
    if (!data.text) return { cleanText: '', chips: [] };
    const chipRegex = /\[NEXT:\s*(.+?)\]/g;
    const chips: string[] = [];
    let match;
    while ((match = chipRegex.exec(data.text)) !== null) {
      chips.push(match[1]);
    }
    const cleanText = data.text.replace(chipRegex, '').trim().replace(/[,，\s]+$/, ''); 
    
    const config = JSON.parse(localStorage.getItem('nexus-model-config') || '{}');
    const limit = config.zeroFrictionCount ?? 3;
    
    return { cleanText, chips: chips.slice(0, limit) };
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

  const handleDelete = () => {
    deleteNode(id);
    setShowDeleteConfirm(false);
  };

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`nexus-force-light border-2 rounded-[2.5rem] w-full h-full flex flex-col transition-[border-color,box-shadow,ring] duration-300 ${selected ? 'border-indigo-600 ring-8 ring-indigo-500/10 shadow-[0_30px_100px_rgba(0,0,0,0.3)]' : 'border-slate-300 shadow-[0_10px_30px_rgba(0,0,0,0.1)]'} group/node relative bg-white overflow-visible`}>
      
      {/* Custom Delete Modal */}
      <Modal 
        isOpen={showDeleteConfirm} 
        onClose={() => setShowDeleteConfirm(false)}
        title="Discard Insight?"
        type="danger"
        footer={
          <div className="flex gap-3">
            <button 
              onClick={() => setShowDeleteConfirm(false)}
              className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleDelete}
              className="px-6 py-3 bg-red-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-200 transition-all active:scale-95"
            >
              Discard Node
            </button>
          </div>
        }
      >
        You are about to remove this insight node. This action cannot be undone. Are you sure you want to proceed?
      </Modal>

      <div className="flex-1 flex flex-col overflow-hidden rounded-[2.35rem] w-full h-full">
        {/* Header */}
        <div className="bg-slate-100 px-6 py-3 border-b-2 border-slate-200 flex items-center justify-between cursor-grab active:cursor-grabbing custom-drag-handle shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-xl shadow-md ${data.isGenerating ? 'bg-indigo-600 text-white animate-pulse' : 'bg-black text-white'}`}>
              <Bot size={18} strokeWidth={3} />
            </div>
            <span className="text-[12px] font-black text-black uppercase tracking-widest truncate max-w-[200px]">
              {data.isGenerating ? 'Synthesizing...' : 'Nexus Insight'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowDeleteConfirm(true)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover/node:opacity-100">
              <Trash2 size={18} />
            </button>
            <GripHorizontal size={22} className="text-slate-400 group-hover/node:text-slate-600" />
          </div>
        </div>

        {/* Content Body */}
        <div className="p-8 flex-1 overflow-y-auto nowheel nodrag bg-white selection:bg-indigo-100 select-text cursor-auto">
          {data.prompt && (
            <div className="mb-6">
              <div className="text-[14px] uppercase tracking-widest text-slate-400 font-black mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-300" />
                Your Inquiry
              </div>
              <p className="text-[17px] font-bold text-slate-600 italic leading-relaxed">
                {data.prompt}
              </p>

              {/* User Attachments Display */}
              {data.attachments && data.attachments.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {data.attachments.map((att, idx) => (
                    <div key={idx} className="relative group/att w-24 h-24 rounded-xl overflow-hidden border-2 border-slate-100 shadow-sm">
                      {att.type.startsWith('image/') ? (
                        <img src={att.url} alt="attachment" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-400">
                          <FileText size={24} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 mb-8 border-b-2 border-dashed border-slate-100" />
            </div>
          )}

          <div className="prose prose-slate max-w-none select-text
            prose-p:!text-black prose-p:font-bold prose-p:leading-[1.7] prose-p:text-[17px] prose-p:mb-4
            prose-headings:!text-black prose-headings:font-black prose-headings:mb-4
            prose-strong:!text-indigo-800 prose-strong:font-black
            prose-code:!text-pink-600 prose-code:bg-slate-100 prose-code:px-2 prose-code:py-0.5 prose-code:rounded-lg
            prose-pre:bg-black prose-pre:text-white prose-pre:rounded-2xl prose-pre:p-6
            prose-table:border-2 prose-table:border-slate-200 prose-table:rounded-xl">
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

          {data.isError && !data.isGenerating && (
            <div className="mt-8 pt-6 border-t border-red-100 flex justify-center">
              <button
                onClick={() => retryNode(id)}
                className="group flex items-center gap-3 px-8 py-4 bg-red-50 hover:bg-red-600 border-2 border-red-200 hover:border-red-600 rounded-2xl text-red-600 hover:text-white font-black transition-all shadow-lg active:scale-95"
              >
                <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                RETRY GENERATION
              </button>
            </div>
          )}
        </div>

        {/* Footer Area */}
        {!data.isGenerating && (
          <div className="px-6 py-4 bg-slate-50 border-t-2 border-slate-200 flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {parsed.chips.map((label, idx) => (
                  <button key={idx} onClick={() => spawnChildNode(id, label)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-slate-300 rounded-lg text-[10px] font-black text-black hover:bg-black hover:text-white hover:border-black transition-all shadow-sm uppercase tracking-tighter">
                    <Sparkles size={10} className="text-indigo-500" />
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={copyMarkdown} title="Copy Markdown" className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-all border-2 border-transparent hover:border-slate-200">
                  {copiedMD ? <CheckCircle2 size={16} className="text-green-600" /> : <FileCode size={16} />}
                </button>
                <button onClick={copyPlainText} title="Copy Plain Text" className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-all border-2 border-transparent hover:border-slate-200">
                  {copiedText ? <CheckCircle2 size={16} className="text-green-600" /> : <FileText size={16} />}
                </button>
              </div>
            </div>
            <DockInput variant="node" nodeId={id} />
          </div>
        )}
      </div>
      
      <NodeResizer minWidth={480} minHeight={300} isVisible={selected || isHovered} lineClassName="border-indigo-500 border-[3px] opacity-0 group-hover/node:opacity-30" handleClassName="!w-12 !h-12 !bg-transparent !border-none !-m-6" />
      <Handle type="target" position={Position.Top} className="!w-6 !h-6 !bg-indigo-600 !border-[3px] !border-white !-top-3 shadow-xl z-50" />
      <div className="absolute bottom-3 right-3 w-12 h-12 pointer-events-none flex items-end justify-end opacity-20 group-hover/node:opacity-100 transition-opacity">
        <div className="w-10 h-10 border-r-[6px] border-b-[6px] border-indigo-600 rounded-br-3xl" />
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-6 !h-6 !bg-black !border-[3px] !border-white !-bottom-3 shadow-xl z-50" />
    </div>
  );
}

const areEqual = (prevProps: { selected: boolean, data: NodeData }, nextProps: { selected: boolean, data: NodeData }) => {
  return (
    prevProps.selected === nextProps.selected &&
    prevProps.data.text === nextProps.data.text &&
    prevProps.data.prompt === nextProps.data.prompt &&
    prevProps.data.isGenerating === nextProps.data.isGenerating &&
    prevProps.data.isError === nextProps.data.isError
  );
};

export default memo(MarkdownNode, areEqual);

