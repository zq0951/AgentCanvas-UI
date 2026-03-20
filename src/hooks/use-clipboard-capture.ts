'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseClipboardOptions {
  enabled: boolean;
  onCapture: (text: string, files: File[]) => void;
  onManualPaste?: (text: string, files: File[]) => void;
  inputEmpty: boolean;
  hasNoFiles: boolean;
}

/**
 * 封装剪贴板自动捕获与手动粘贴逻辑
 */
export function useClipboardCapture({
  enabled,
  onCapture,
  onManualPaste,
  inputEmpty,
  hasNoFiles
}: UseClipboardOptions) {
  const lastAutoFilledRef = useRef<string>('');
  const lastFilesFingerprintRef = useRef<string>('');
  const lastDeletedFingerprintRef = useRef<string>('');

  const processClipboardItems = useCallback(async (items: ClipboardItem[] | DataTransferItemList) => {
    const newFiles: File[] = [];
    let textContent = '';

    for (const item of Array.from(items as any)) {
      if (item instanceof ClipboardItem) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const file = new File([blob], `pasted-image-${blob.size}.${type.split('/')[1] || 'png'}`, { type });
            newFiles.push(file);
          } else if (type === 'text/plain') {
            const blob = await item.getType(type);
            textContent = await blob.text();
          }
        }
      } else if (item instanceof DataTransferItem) {
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
    return { text: textContent, files: newFiles };
  }, []);

  const checkClipboard = useCallback(async (isFocusTrigger = false) => {
    if (!enabled) return;
    
    const configStr = typeof window !== 'undefined' ? localStorage.getItem('nexus-model-config') : null;
    if (!configStr) return;
    const config = JSON.parse(configStr);
    if (!config.autoReadClipboard) return;

    try {
      const items = await navigator.clipboard.read();
      let currentFingerprint = items.map(item => item.types.join('|')).join('||');

      // 核心修复：如果指纹没变，或者属于已删除指纹，直接跳过
      if (currentFingerprint === lastFilesFingerprintRef.current || currentFingerprint === lastDeletedFingerprintRef.current) {
        return;
      }

      const { text, files } = await processClipboardItems(items);
      const trimmedText = text?.trim();
      const hasNewContent = (trimmedText && trimmedText !== lastAutoFilledRef.current) || files.length > 0;

      if (inputEmpty && hasNoFiles && hasNewContent) {
        onCapture(trimmedText, files);
        lastAutoFilledRef.current = trimmedText;
      }

      lastFilesFingerprintRef.current = currentFingerprint;
    } catch (err) {
      if (!(err instanceof Error && err.name === 'NotAllowedError')) {
        console.warn('Auto-read clipboard failed:', err);
      }
    }
  }, [enabled, inputEmpty, hasNoFiles, onCapture, processClipboardItems]);

  useEffect(() => {
    if (!enabled) return;
    checkClipboard();
    const handleFocus = () => setTimeout(() => checkClipboard(true), 300);
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [enabled, checkClipboard]);

  const handleManualPaste = useCallback(async (e: React.ClipboardEvent) => {
    if (e.clipboardData?.items) {
      e.preventDefault();
      const { text, files } = await processClipboardItems(e.clipboardData.items);
      
      let manualFingerprint = Array.from(e.clipboardData.items).map(item => item.type).join('|');
      lastFilesFingerprintRef.current = manualFingerprint;
      lastDeletedFingerprintRef.current = '';

      if (onManualPaste) {
        onManualPaste(text, files);
      }
    }
  }, [onManualPaste, processClipboardItems]);

  const markAsDeleted = useCallback(() => {
    lastDeletedFingerprintRef.current = lastFilesFingerprintRef.current;
  }, []);

  const resetAutoFillMemory = useCallback(() => {
    lastAutoFilledRef.current = '';
  }, []);

  return {
    handleManualPaste,
    markAsDeleted,
    resetAutoFillMemory,
    checkClipboard
  };
}
