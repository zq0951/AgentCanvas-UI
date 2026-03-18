'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Paperclip, Mic, SendHorizontal, Image as ImageIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useCanvas } from '@/contexts/CanvasContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SYSTEM_PROMPT_EXTENSION = `\n\n[INSTRUCTION]: 
1. At the very end of your response, provide exactly 3 follow-up suggestion chips.
2. Use the SAME LANGUAGE as your response for the chips. (e.g., if you replied in Chinese, the chips must be in Chinese).
3. Follow this exact format: [NEXT: Action Label]. 
Example for Chinese response: [NEXT: 深度分析], [NEXT: 实际案例], [NEXT: 总结核心].`;

export default function DockInput() {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const { addNode, updateNodeData, connectNodes, nodes, sessionId, setSessionId, registerSendMessageHandler } = useCanvas();

  const handleSend = useCallback(async (textOverride?: string, parentId?: string) => {
    const prompt = textOverride || input.trim();
    if (!prompt || isSending) return;

    let currentId = sessionId;
    if (!currentId) {
      currentId = crypto.randomUUID();
      setSessionId(currentId);
    }

    if (!textOverride) setInput('');
    setIsSending(true);

    const nodeId = `ai-node-${Date.now()}`;
    let xPos = 100 + (nodes.length * 30);
    let yPos = 100 + (nodes.length * 30);

    if (parentId) {
      const parentNode = nodes.find(n => n.id === parentId);
      if (parentNode) {
        xPos = parentNode.position.x + 600;
        yPos = parentNode.position.y;
      }
    }

    addNode({
      id: nodeId,
      type: 'markdown',
      position: { x: xPos, y: yPos },
      data: { text: '', isGenerating: true },
    });

    if (parentId) {
      setTimeout(() => connectNodes(parentId, nodeId), 50);
    }

    try {
      const savedConfigStr = localStorage.getItem('nexus-model-config');
      const config = savedConfigStr ? JSON.parse(savedConfigStr) : null;
      if (!config) throw new Error("API Config missing");

      const messages = [];
      if (parentId) {
        const parentNode = nodes.find(n => n.id === parentId);
        if (parentNode?.data?.text) {
          messages.push({ 
            role: 'user', 
            content: `CONTEXT DATA:\n${parentNode.data.text}\n\nTask: ${prompt}${SYSTEM_PROMPT_EXTENSION}` 
          });
        }
      } else {
        messages.push({ role: 'user', content: `${prompt}${SYSTEM_PROMPT_EXTENSION}` });
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, messages })
      });

      const data = await response.json();
      updateNodeData(nodeId, { text: data.text, isGenerating: false });
    } catch (error: any) {
      updateNodeData(nodeId, { text: `**⚠️ Error:** ${error.message}`, isGenerating: false });
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, nodes, sessionId, addNode, updateNodeData, connectNodes, setSessionId]);

  useEffect(() => {
    registerSendMessageHandler(handleSend);
  }, [handleSend, registerSendMessageHandler]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div 
        className={cn(
          "w-full bg-white border-2 border-slate-300 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.2)] transition-all",
          isFocused ? "ring-4 ring-indigo-500/10 border-indigo-600" : ""
        )}
      >
        <div className="flex items-end p-2 gap-2">
          <div className="flex items-center gap-1 pb-1 pl-1">
            <button className="p-2 hover:bg-slate-100 rounded-xl text-slate-500"><Paperclip size={20} /></button>
          </div>
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            placeholder={isSending ? "Reasoning..." : "Type your command..."}
            className="flex-1 max-h-48 py-2.5 px-2 bg-transparent border-none focus:ring-0 text-sm font-black text-slate-900 placeholder:text-slate-400 resize-none min-h-[40px]"
          />
          <div className="flex items-center gap-1 pb-1 pr-1">
             <button onClick={() => handleSend()} disabled={!input.trim() || isSending} className={cn("p-2 rounded-xl transition-all", input.trim() && !isSending ? "bg-slate-900 text-white shadow-lg" : "bg-slate-100 text-slate-300")}>
              {isSending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <SendHorizontal size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
