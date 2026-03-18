'use client';

import React, { useState, useEffect } from 'react';
import { PanelLeft, Plus, History, Settings, Trash2, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getSessions, saveSession } from '@/lib/db';
import ModelSettingsPanel from '../settings/ModelSettingsPanel';
import { useCanvas } from '@/contexts/CanvasContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { sessionId, setSessionId, clearCanvas } = useCanvas();

  const refreshSessions = async () => {
    const data = await getSessions();
    setSessions(data.sort((a: any, b: any) => b.updatedAt - a.updatedAt));
  };

  useEffect(() => {
    refreshSessions();
    // Refresh periodically or on focus
    window.addEventListener('focus', refreshSessions);
    return () => window.removeEventListener('focus', refreshSessions);
  }, []);

  const handleCreateSession = async () => {
    const newId = crypto.randomUUID();
    setSessionId(newId);
    clearCanvas();
  };

  return (
    <>
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed left-4 top-4 p-2 bg-white border border-slate-300 shadow-xl rounded-xl z-[60] text-slate-600 hover:scale-110 transition-all"
        >
          <PanelLeft size={20} />
        </button>
      )}

      <aside 
        className={cn(
          "h-full border-r border-slate-200 bg-slate-50 transition-all duration-300 flex flex-col z-40 relative shrink-0",
          isOpen ? "w-72" : "w-0 overflow-hidden opacity-0"
        )}
      >
        <div className="p-5 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-3 font-black text-slate-900 tracking-tighter text-lg">
            <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
              <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
            </div>
            <span>NexusBoard</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500"><X size={18} /></button>
        </div>

        <div className="p-4">
          <button 
            onClick={handleCreateSession}
            className="w-full py-3 px-4 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-black transition-all shadow-xl shadow-slate-200 active:scale-95"
          >
            <Plus size={18} strokeWidth={3} />
            NEW CANVAS
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 py-2">Local Archives</div>
          {sessions.map((s) => (
            <div key={s.id} className="group relative">
              <button 
                onClick={() => setSessionId(s.id)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition-all pr-10 border-2",
                  sessionId === s.id ? "bg-white border-indigo-500 text-indigo-600 shadow-md" : "bg-transparent border-transparent text-slate-500 hover:bg-slate-200/50"
                )}
              >
                <History size={16} className={sessionId === s.id ? "text-indigo-500" : "text-slate-400"} />
                <span className="truncate text-xs uppercase tracking-tight">{s.title || 'Draft Canvas'}</span>
              </button>
              <button 
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                onClick={async (e) => {
                  e.stopPropagation();
                  const db = await (await import('@/lib/db')).getDB();
                  if (db) {
                    await db.delete('sessions', s.id);
                    if (sessionId === s.id) setSessionId(null);
                    refreshSessions();
                  }
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-200 bg-white/50">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black text-slate-600 hover:bg-slate-900 hover:text-white rounded-xl transition-all uppercase tracking-widest"
          >
            <Settings size={18} />
            Control Center
          </button>
        </div>
      </aside>

      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-[0_32px_64px_rgba(0,0,0,0.2)] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3 font-black text-slate-900 uppercase tracking-tighter">
                <Settings size={20} className="text-indigo-600" />
                <span>Global Configuration</span>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8"><ModelSettingsPanel /></div>
          </div>
        </div>
      )}
    </>
  );
}
