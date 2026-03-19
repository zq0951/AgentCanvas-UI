'use client';

import { useEffect, useRef } from 'react';
import { useCanvas } from '@/contexts/CanvasContext';
import { useReactFlow } from 'reactflow';

export default function ChatHandler() {
  const { registerSendMessageHandler, updateNodeData, addNode, connectNodes, selectNode, nodes } = useCanvas();
  const { setCenter, fitView, getNodes } = useReactFlow();
  const nodesRef = useRef(nodes);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    registerSendMessageHandler(async (prompt, parentId, attachments) => {
      const config = JSON.parse(localStorage.getItem('nexus-model-config') || '{}');
      
      let targetNodeId: string;
      let targetPosition = { x: 400, y: 300 };
      
      // Node Creation Logic
      if (parentId === 'root' || !parentId) {
        targetNodeId = `node-${Date.now()}`;
        addNode({
          id: targetNodeId,
          type: 'markdown',
          position: targetPosition,
          data: { prompt, text: '', isGenerating: true },
          style: { width: 600, height: 500 },
          selected: true
        });
      } else {
        const parentNode = nodesRef.current.find(n => n.id === parentId);
        targetNodeId = `node-${Date.now()}`;
        const px = parentNode?.position.x ?? 400;
        const py = parentNode?.position.y ?? 300;
        targetPosition = { x: px, y: py + 600 };
        
        addNode({
          id: targetNodeId,
          type: 'markdown',
          position: targetPosition,
          data: { prompt, text: '', isGenerating: true },
          style: { width: 600, height: 500 },
          selected: true
        });
        connectNodes(parentId, targetNodeId);
      }

      // 核心移动逻辑：使用 setCenter 进行纯坐标平移
      // 这种方式不依赖 DOM 渲染和 fitView 内部测量，100% 可靠
      const moveToNode = () => {
        // 计算卡片中心点 (600x500 尺寸)
        const centerX = targetPosition.x + 300;
        const centerY = targetPosition.y + 250;
        
        // 平滑移动视口
        setCenter(centerX, centerY, { zoom: 0.55, duration: 1000 });
      };

      // 稍微给一点延迟 (200ms) 让 React Flow 内部坐标系同步
      setTimeout(moveToNode, 200);

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
