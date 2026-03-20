'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, Wand2, CheckCircle2 } from 'lucide-react';
import { useCanvas } from '@/contexts/CanvasContext';

interface ZeroFrictionPredictorProps {
  input: string;
  files: File[];
  onComplete?: () => void;
}

/**
 * @component ZeroFrictionPredictor
 * @description 零摩擦意图预测按钮
 * 它是独立的，拥有自己的 API 调用链，不阻塞主输入框的消息流。
 */
export default function ZeroFrictionPredictor({ input, files, onComplete }: ZeroFrictionPredictorProps) {
  const [status, setStatus] = useState<'idle' | 'ready' | 'loading' | 'success'>('idle');
  const { spawnChildNode } = useCanvas();

  // 1. 意图预测逻辑：根据输入内容判断是否具备“高质量预测”价值
  useEffect(() => {
    if (status === 'loading' || status === 'success') return;

    const hasSignificantInput = input.trim().length > 10;
    const hasFiles = files.length > 0;

    if (hasSignificantInput || hasFiles) {
      setStatus('ready');
    } else {
      setStatus('idle');
    }
  }, [input, files, status]);

  // 2. 独立 API 调用
  const handlePredict = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (status !== 'ready') return;

    setStatus('loading');

    try {
      // 模拟独立接口调用，该接口只负责预测意图，不负责完整的 Chat
      // 这里的逻辑可以改为调用 /api/predict 等独立端点
      await new Promise(resolve => setTimeout(resolve, 1200)); 

      // 假设预测结果是生成一个带图表的节点或总结节点
      spawnChildNode('root', `Insight: Based on your input "${input.slice(0, 20)}...", I've generated this analysis.`, []);
      
      setStatus('success');
      onComplete?.();

      // 3秒后回到初始态，等待下一次输入
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error('Prediction failed:', error);
      setStatus('ready');
    }
  };

  if (status === 'idle') return null;

  return (
    <button
      onClick={handlePredict}
      disabled={status === 'loading'}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-500 border-2
        ${status === 'ready' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 animate-pulse hover:scale-105' : ''}
        ${status === 'loading' ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : ''}
        ${status === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : ''}
      `}
    >
      {status === 'loading' ? (
        <Loader2 size={12} className="animate-spin" />
      ) : status === 'success' ? (
        <CheckCircle2 size={12} className="text-emerald-500" />
      ) : (
        <Sparkles size={12} className="text-indigo-600" />
      )}
      
      <span className="text-[10px] font-black uppercase tracking-wider">
        {status === 'loading' ? 'Predicting...' : status === 'success' ? 'Predicted' : 'Auto Predict'}
      </span>
      
      {status === 'ready' && (
        <Wand2 size={10} className="ml-0.5 opacity-50" />
      )}
    </button>
  );
}
