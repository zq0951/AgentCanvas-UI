'use client';

import { useEffect, useRef } from 'react';
import { useCanvas } from '@/contexts/CanvasContext';
import { useReactFlow, Node } from 'reactflow';
import { NodeData, Attachment, ModelConfig } from '@/types/canvas';
import { 
  getResponsiveCardDimensions, 
  calculateRootNodePosition, 
  calculateChildNodePosition 
} from '@/lib/layout';

export default function ChatHandler() {
  const { registerSendMessageHandler, updateNodeData, addNode, connectNodes, nodes, sessionId } = useCanvas();
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
        lastCreatedNodeIdRef.current = null;
      }
    }
  }, [nodes, getViewport, setCenter]);

  // 当切换历史会话 (sessionId 变化) 时，自动调整视口
  useEffect(() => {
    if (isGeneratingRef.current) return;

    if (nodes.length > 0) {
      const timer = setTimeout(() => {
        fitView({ padding: 0.2, duration: 800 });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [sessionId, nodes.length, fitView]);

  const getConversationHistory = (nodeId: string): any[] => {
    const history: any[] = [];
    let currentNodeId: string | null = nodeId;

    while (currentNodeId && currentNodeId !== 'root') {
      const node = nodesRef.current.find(n => n.id === currentNodeId);
      if (node) {
        history.unshift({ role: 'assistant', content: node.data.text || '' });
        history.unshift({ 
          role: 'user', 
          content: node.data.prompt || '',
          attachments: node.data.attachments || []
        });
        currentNodeId = node.data.parentId || null;
      } else {
        currentNodeId = null;
      }
    }

    return history;
  };

  useEffect(() => {
    registerSendMessageHandler(async (prompt, parentId, attachments, existingNodeId) => {
      const config: ModelConfig = JSON.parse(localStorage.getItem('nexus-model-config') || '{}');
      isGeneratingRef.current = true;
      
      const { width: cardWidth, height: cardHeight } = getResponsiveCardDimensions();
      let targetNodeId: string;
      let targetPosition = { x: 400, y: 300 };

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
        
        if (!parentId || parentId === 'root') {
          targetPosition = calculateRootNodePosition(getViewport(), nodesRef.current as Node<NodeData>[], cardWidth, cardHeight);
        } else {
          const parentNode = nodesRef.current.find(n => n.id === parentId);
          if (parentNode) {
            targetPosition = calculateChildNodePosition(parentNode as Node<NodeData>, nodesRef.current as Node<NodeData>[], cardWidth, cardHeight);
          }
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
            parentId: parentId || 'root'
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
              { role: 'user', content: prompt, attachments }
            ],
            ...config
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `API Error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let chunkBuffer = '';
        let toolArgumentsBuffer = ''; // 用于累计 Tool Call 的参数
        let isHandlingToolCall = false;

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            chunkBuffer += decoder.decode(value, { stream: true });

            if (config.provider === 'gemini') {
              let startIndex = 0;
              while (true) {
                const openBrace = chunkBuffer.indexOf('{', startIndex);
                if (openBrace === -1) break;

                // 鲁棒的 JSON 边界检测：处理字符串内的括号
                let braceCount = 0;
                let closeBrace = -1;
                let inString = false;
                let escaped = false;

                for (let i = openBrace; i < chunkBuffer.length; i++) {
                  const char = chunkBuffer[i];
                  
                  if (escaped) {
                    escaped = false;
                    continue;
                  }

                  if (char === '\\') {
                    escaped = true;
                    continue;
                  }

                  if (char === '"') {
                    inString = !inString;
                    continue;
                  }

                  if (!inString) {
                    if (char === '{') braceCount++;
                    if (char === '}') braceCount--;
                    if (braceCount === 0) {
                      closeBrace = i;
                      break;
                    }
                  }
                }

                if (closeBrace !== -1) {
                  const jsonStr = chunkBuffer.substring(openBrace, closeBrace + 1);
                  try {
                    const json = JSON.parse(jsonStr);
                    const candidate = json.candidates?.[0];
                    const parts = candidate?.content?.parts || [];

                    for (const part of parts) {
                      if (part.functionCall) {
                        const { args } = part.functionCall;
                        updateNodeData(targetNodeId, { chartData: args, type: 'chart' as any });
                      } else if (typeof part.text === 'string') {
                        // 显式检查 text 字段，确保空字符串也能通过，同时天然忽略 thoughtSignature 等非文本字段
                        fullText += part.text;
                        updateNodeData(targetNodeId, { text: fullText });
                      }
                    }
                  } catch (e) {
                    // 解析失败则忽略
                  }
                  startIndex = closeBrace + 1;
                } else {
                  break;
                }
              }
              chunkBuffer = chunkBuffer.substring(startIndex);
            } else {


              // 处理 OpenAI / SSE 流
              const lines = chunkBuffer.split('\n');
              chunkBuffer = lines.pop() || ''; 
              for (const line of lines) {
                const cleanLine = line.trim();
                if (!cleanLine || cleanLine === 'data: [DONE]') continue;
                if (cleanLine.startsWith('data: ')) {
                  try {
                    const json = JSON.parse(cleanLine.replace('data: ', ''));
                    const delta = json.choices?.[0]?.delta;
                    
                    if (delta?.tool_calls?.[0]?.function?.arguments) {
                      isHandlingToolCall = true;
                      toolArgumentsBuffer += delta.tool_calls[0].function.arguments;
                      // 尝试解析部分 JSON (如果已经结束)
                      try {
                        const parsedArgs = JSON.parse(toolArgumentsBuffer);
                        updateNodeData(targetNodeId, { chartData: parsedArgs, type: 'chart' as any });
                      } catch (e) {
                        // 还在累计中
                      }
                    } else if (delta?.content) {
                      fullText += delta.content;
                      updateNodeData(targetNodeId, { text: fullText });
                    }
                  } catch (e) {}
                }
              }
            }
          }
        }
        
        // 最终检查是否需要根据文本 fallback 提取图表
        if (!isHandlingToolCall) {
          // 1. 标准 JSON Block 提取
          const matchBlock = fullText.match(/```json:chart\n([\s\S]*?)```/);
          if (matchBlock) {
            try {
              const parsed = JSON.parse(matchBlock[1]);
              updateNodeData(targetNodeId, { chartData: parsed, type: 'chart' as any });
              isHandlingToolCall = true;
            } catch (e) {}
          }
          
          // 2. 文本容错提取：识别 generate_chart(data=[...], keys=[...], ...)
          if (!isHandlingToolCall && fullText.includes('generate_chart')) {
            try {
              // 匹配 data=[...] 部分
              const dataMatch = fullText.match(/data\s*=\s*(\[[\s\S]*?\])/);
              const keysMatch = fullText.match(/keys\s*=\s*(\[[\s\S]*?\])/);
              const typeMatch = fullText.match(/type\s*=\s*["'](bar|line|pie)["']/);
              const xAxisMatch = fullText.match(/xAxisKey\s*=\s*["'](.*?)["']/);
              
              if (dataMatch && keysMatch && typeMatch && xAxisMatch) {
                // 将 python 风格的属性名替换为标准 JSON
                const rawData = dataMatch[1].replace(/'/g, '"');
                const rawKeys = keysMatch[1].replace(/'/g, '"');
                
                const parsed = {
                  type: typeMatch[1],
                  xAxisKey: xAxisMatch[1],
                  keys: JSON.parse(rawKeys),
                  data: JSON.parse(rawData)
                };
                updateNodeData(targetNodeId, { chartData: parsed, type: 'chart' as any });
              }
            } catch (e) {
              console.warn('Failed to parse text-based chart call', e);
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
  }, [registerSendMessageHandler, addNode, connectNodes, updateNodeData, getViewport]);

  return null;
}

