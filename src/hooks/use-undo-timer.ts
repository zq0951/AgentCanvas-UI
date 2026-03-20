'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * 处理撤销倒计时与 Toast 显示逻辑
 * @param duration 倒计时时长（秒）
 * @returns 
 */
export function useUndoTimer(duration: number = 5) {
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [countdown, setCountdown] = useState(duration);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showUndoToast) {
      setCountdown(duration);
      interval = setInterval(() => {
        setCountdown(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showUndoToast, duration]);

  const triggerToast = () => {
    setShowUndoToast(true);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    undoTimeoutRef.current = setTimeout(() => {
      setShowUndoToast(false);
    }, duration * 1000);
  };

  const hideToast = () => {
    setShowUndoToast(false);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
  };

  return {
    showUndoToast,
    countdown,
    triggerToast,
    hideToast
  };
}
