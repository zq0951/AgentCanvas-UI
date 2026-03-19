'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  type?: 'default' | 'danger' | 'warning' | 'success';
}

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  type = 'default' 
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => {
        setShouldRender(false);
        document.body.style.overflow = 'unset';
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!mounted || !shouldRender) return null;

  const typeStyles = {
    default: 'bg-indigo-600',
    danger: 'bg-red-600',
    warning: 'bg-amber-500',
    success: 'bg-emerald-600'
  };

  return createPortal(
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className={`relative bg-white w-full max-w-md rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border-2 border-white overflow-hidden transition-all duration-300 transform ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        
        {/* Header */}
        <div className="px-8 pt-8 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-2xl shadow-lg text-white ${typeStyles[type]}`}>
              <AlertCircle size={20} strokeWidth={3} />
            </div>
            <h3 className="text-xl font-black text-black uppercase tracking-tight">{title}</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-black"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="px-8 py-4 text-slate-600 font-bold leading-relaxed text-[16px]">
          {children}
        </div>

        {/* Footer */}
        <div className="p-8 mt-2 bg-slate-50 border-t-2 border-slate-100 flex items-center justify-end gap-3">
          {footer || (
            <button 
              onClick={onClose}
              className="px-6 py-3 bg-black text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
            >
              Understand
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
