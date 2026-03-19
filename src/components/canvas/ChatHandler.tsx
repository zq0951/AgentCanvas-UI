'use client';

import { useEffect, useRef } from 'react';
import { useCanvas } from '@/contexts/CanvasContext';
import { useReactFlow } from 'reactflow';

export default function ChatHandler() {
  const { registerSendMessageHandler, updateNodeData, addNode, connectNodes, selectNode, nodes, sessionId } = useCanvas();
  const { setCenter, fitView, getViewport } = useReactFlow();
  const nodesRef = useRef(nodes);
  const lastCreatedNodeIdRef = useRef<string | null>(null);
  const isGeneratingRef = useRef(false);

  useEffect(() => {
    nodesRef.current = nodes;

    // 监听新节点产生并执行平滑移动
    if (lastCreatedNodeIdRef.current) {
      const newNode = nodes.find(n => n.id === lastCreatedNodeIdRef.current);
      if (newNode) {
        const cardWidth = newNode.style?.width ? Number(newNode.style.width) : 800;
        const cardHeight = newNode.style?.height ? Number(newNode.style.height) : 600;
        const centerX = newNode.position.x + cardWidth / 2;
        const centerY = newNode.position.y + cardHeight / 2;
        
        const currentZoom = getViewport().zoom;
        const targetZoom = currentZoom < 0.5 ? 0.8 : currentZoom;
        
        setCenter(centerX, centerY, { zoom: targetZoom, duration: 600 });
        lastCreatedNodeIdRef.current = null; // 消费掉标记，避免重复移动
      }
    }
  }, [nodes]);

  // 当切换历史会话 (sessionId 变化) 时，自动调整视口以显示所有卡片
  useEffect(() => {
    // 如果是用户正在生成新卡片导致的 sessionId 变化（即从 null 变为第一个 ID），则不触发 fitView
    if (isGeneratingRef.current) return;

    if (nodes.length > 0) {
      const timer = setTimeout(() => {
        fitView({ padding: 0.2, duration: 800 });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [sessionId]);

  useEffect(() => {
    registerSendMessageHandler(async (prompt, parentId, attachments) => {
      const config = JSON.parse(localStorage.getItem('nexus-model-config') || '{}');
      isGeneratingRef.current = true;
      
      let targetNodeId: string;
      let targetPosition = { x: 400, y: 300 };
      
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // 宽度占据视口 80%，在 800px 到 1600px 之间波动
      const cardWidth = Math.min(Math.max(viewportWidth * 0.8, 800), 1600);
      // 高度占据视口 80%，在 600px 到 1000px 之间波动
      const cardHeight = Math.min(Math.max(viewportHeight * 0.8, 600), 1000);

      if (parentId === 'root' || !parentId) {
        targetNodeId = `node-${Date.now()}`;
        const { x, y, zoom } = getViewport();
        const flowX = (window.innerWidth / 2 - x) / zoom;
        const flowY = (window.innerHeight / 2 - y) / zoom;
        targetPosition = { x: flowX - cardWidth / 2, y: flowY - cardHeight / 2 };
      } else {
        const parentNode = nodesRef.current.find(n => n.id === parentId);
        targetNodeId = `node-${Date.now()}`;
        const px = parentNode?.position.x ?? 400;
        const py = parentNode?.position.y ?? 300;
        const parentWidth = parentNode?.style?.width ? Number(parentNode.style.width) : 600;
        const parentHeight = parentNode?.style?.height ? Number(parentNode.style.height) : 500;
        targetPosition = { 
          x: px + (parentWidth / 2) - (cardWidth / 2), 
          y: py + parentHeight + 150 
        };
      }

      // 记录新节点 ID，触发上面的 useEffect 移动逻辑
      lastCreatedNodeIdRef.current = targetNodeId;

      addNode({
        id: targetNodeId,
        type: 'markdown',
        position: targetPosition,
        data: { prompt, text: '', isGenerating: true },
        style: { width: cardWidth, height: cardHeight },
        selected: true
      });

      if (parentId && parentId !== 'root') {
        connectNodes(parentId, targetNodeId);
      }

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ 
              role: 'user', 
              content: prompt,
              attachments: attachments 
            }],
            model: config.model,
            apiKey: config.apiKey,
            provider: config.provider
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'API Error');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let chunkBuffer = ''; // 原始数据块缓冲区

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            chunkBuffer += chunk;

            if (config.provider === 'gemini') {
              // 稳健提取逻辑：使用正则从全局 chunkBuffer 中寻找所有完整的 "text": "..."
              // 我们不清除 chunkBuffer，因为最后一个 chunk 可能是半截的
              const regex = /"text":\s*"((?:[^"\\]|\\.)*)"/g;
              let match;
              let tempFullText = '';
              while ((match = regex.exec(chunkBuffer)) !== null) {
                let text = match[1];
                text = text.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                tempFullText += text;
              }
              fullText = tempFullText;
              updateNodeData(targetNodeId, { text: fullText });
            } else {
              // OpenAI SSE 格式处理
              const lines = chunkBuffer.split('\n');
              chunkBuffer = lines.pop() || ''; 
              for (const line of lines) {
                const cleanLine = line.trim();
                if (!cleanLine || cleanLine === 'data: [DONE]') continue;
                if (cleanLine.startsWith('data: ')) {
                  try {
                    const json = JSON.parse(cleanLine.replace('data: ', ''));
                    const content = json.choices?.[0]?.delta?.content || '';
                    if (content) {
                      fullText += content;
                      updateNodeData(targetNodeId, { text: fullText });
                    }
                  } catch (e) {}
                }
              }
            }
          }
        }
        
        updateNodeData(targetNodeId, { isGenerating: false });

      } catch (error: any) {
        console.error('Chat failed:', error);
        updateNodeData(targetNodeId, { 
          text: `Error: ${error.message || 'Failed to connect.'}`,
          isGenerating: false 
        });
      }
    });
  }, [registerSendMessageHandler, addNode, connectNodes, updateNodeData]);

  return null;
}
