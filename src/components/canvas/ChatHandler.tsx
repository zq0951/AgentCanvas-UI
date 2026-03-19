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

  const getConversationHistory = (nodeId: string): any[] => {
    const history: any[] = [];
    let currentNodeId: string | null = nodeId;

    while (currentNodeId && currentNodeId !== 'root') {
      const node = nodesRef.current.find(n => n.id === currentNodeId);
      if (node) {
        // Add assistant response
        history.unshift({ role: 'assistant', content: node.data.text || '' });
        
        // Add user prompt with attachments if any
        history.unshift({ 
          role: 'user', 
          content: node.data.prompt || '',
          attachments: node.data.attachments || []
        });
        
        currentNodeId = node.data.parentId;
      } else {
        currentNodeId = null;
      }
    }

    return history;
  };

  useEffect(() => {
    registerSendMessageHandler(async (prompt, parentId, attachments, existingNodeId) => {
      const config = JSON.parse(localStorage.getItem('nexus-model-config') || '{}');
      isGeneratingRef.current = true;
      
      let targetNodeId: string;
      let targetPosition = { x: 400, y: 300 };
      
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      const cardWidth = Math.min(Math.max(viewportWidth * 0.8, 800), 1600);
      const cardHeight = Math.min(Math.max(viewportHeight * 0.8, 600), 1000);

      // Get history if it's a follow-up or retry
      let history: any[] = [];
      const actualParentId = existingNodeId 
        ? nodesRef.current.find(n => n.id === existingNodeId)?.data?.parentId 
        : parentId;

      if (actualParentId && actualParentId !== 'root') {
        history = getConversationHistory(actualParentId);
      }

      if (existingNodeId) {
        targetNodeId = existingNodeId;
        updateNodeData(targetNodeId, { text: '', isGenerating: true, attachments, isError: false, prompt });
      } else {
        targetNodeId = `node-${Date.now()}`;
        if (parentId === 'root' || !parentId) {
          const { x, y, zoom } = getViewport();
          const flowX = (window.innerWidth / 2 - x) / zoom;
          const flowY = (window.innerHeight / 2 - y) / zoom;
          
          // Calculate stagger for root nodes to prevent overlapping in the center
          const rootNodes = nodesRef.current.filter(n => !n.data?.parentId || n.data.parentId === 'root');
          const staggerIndex = rootNodes.length;
          
          targetPosition = { 
            x: flowX - (cardWidth / 2) + (staggerIndex * 120), 
            y: flowY - (cardHeight / 2) + (staggerIndex * 80) 
          };
        } else {
          const parentNode = nodesRef.current.find(n => n.id === parentId);
          const px = parentNode?.position.x ?? 400;
          const py = parentNode?.position.y ?? 300;
          
          // Use top-level width/height if available, fallback to style, then to defaults
          const parentWidth = parentNode?.width ?? (parentNode?.style?.width ? Number(parentNode.style.width) : 800);
          const parentHeight = parentNode?.height ?? (parentNode?.style?.height ? Number(parentNode.style.height) : 600);
          
          // Calculate stagger based on existing children to prevent overlap
          const siblings = nodesRef.current.filter(n => n.data?.parentId === parentId);
          const staggerIndex = siblings.length;
          
          targetPosition = { 
            // Increased stagger: 120px horizontal and 80px vertical per existing sibling
            x: px + (parentWidth / 2) - (cardWidth / 2) + (staggerIndex * 120), 
            y: py + parentHeight + 200 + (staggerIndex * 80)
          };
        }

        lastCreatedNodeIdRef.current = targetNodeId;

        addNode({
          id: targetNodeId,
          type: 'markdown',
          position: targetPosition,
          data: { 
            prompt, 
            text: '', 
            isGenerating: true, 
            attachments,
            parentId: parentId || 'root' // Ensure parentId is stored
          },
          style: { width: cardWidth, height: cardHeight },
          selected: true
        });

        if (parentId && parentId !== 'root') {
          connectNodes(parentId, targetNodeId);
        }
      }

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              ...history,
              { 
                role: 'user', 
                content: prompt,
                attachments: attachments 
              }
            ],
            model: config.model,
            apiKey: config.apiKey,
            provider: config.provider,
            baseUrl: config.baseUrl,
            systemPrompt: config.systemPrompt,
            zeroFrictionCount: config.zeroFrictionCount
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `API Error: ${response.status}`);
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
        isGeneratingRef.current = false;

      } catch (error: any) {
        console.error('Chat failed:', error);
        updateNodeData(targetNodeId, { 
          text: `Error: ${error.message || 'Failed to connect.'}`,
          isGenerating: false,
          isError: true
        });
        isGeneratingRef.current = false;
      }
    });
  }, [registerSendMessageHandler, addNode, connectNodes, updateNodeData]);

  return null;
}
