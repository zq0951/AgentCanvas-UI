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
        history.unshift({ role: 'user', content: node.data.prompt || '', attachments: node.data.attachments || [] });
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

      let history: any[] = [];
      const actualParentId = existingNodeId ? nodesRef.current.find(n => n.id === existingNodeId)?.data?.parentId : parentId;
      if (actualParentId && actualParentId !== 'root') {
        history = getConversationHistory(actualParentId);
      }

      if (existingNodeId) {
        targetNodeId = existingNodeId;
        updateNodeData(targetNodeId, { text: '', suggestions: [], isGenerating: true, attachments, isError: false, prompt });
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
          data: { prompt, text: '', suggestions: [], isGenerating: true, attachments, parentId: parentId || 'root' },
          style: { width: cardWidth, height: cardHeight },
          selected: true
        });
        if (parentId && parentId !== 'root') connectNodes(parentId, targetNodeId);
      }

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...history, { role: 'user', content: prompt, attachments }],
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
        let toolArgumentsBuffer = '';
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
                let braceCount = 0;
                let closeBrace = -1;
                let inString = false;
                let escaped = false;
                for (let i = openBrace; i < chunkBuffer.length; i++) {
                  const char = chunkBuffer[i];
                  if (escaped) { escaped = false; continue; }
                  if (char === '\\') { escaped = true; continue; }
                  if (char === '"') { inString = !inString; continue; }
                  if (!inString) {
                    if (char === '{') braceCount++;
                    if (char === '}') braceCount--;
                    if (braceCount === 0) { closeBrace = i; break; }
                  }
                }
                if (closeBrace !== -1) {
                  const jsonStr = chunkBuffer.substring(openBrace, closeBrace + 1);
                  try {
                    const json = JSON.parse(jsonStr);
                    // 核心：识别 Gemini 后置 suggestions
                    if (json.suggestions && Array.isArray(json.suggestions)) {
                      updateNodeData(targetNodeId, { suggestions: json.suggestions });
                    }
                    const parts = json.candidates?.[0]?.content?.parts || [];
                    for (const part of parts) {
                      if (part.functionCall) {
                        // 切换为图表，但必须保留 suggestions
                        updateNodeData(targetNodeId, { 
                          chartData: part.functionCall.args, 
                          type: 'chart' as any 
                        });
                      } else if (typeof part.text === 'string') {
                        fullText += part.text;
                        updateNodeData(targetNodeId, { text: fullText });
                      }
                    }
                  } catch (e) {}
                  startIndex = closeBrace + 1;
                } else break;
              }
              chunkBuffer = chunkBuffer.substring(startIndex);
            } else {
              const lines = chunkBuffer.split('\n');
              chunkBuffer = lines.pop() || ''; 
              for (const line of lines) {
                const cleanLine = line.trim();
                if (!cleanLine || cleanLine === 'data: [DONE]') continue;
                if (cleanLine.startsWith('data: ')) {
                  try {
                    const dataStr = cleanLine.replace('data: ', '');
                    const json = JSON.parse(dataStr);
                    
                    // 核心：识别 OpenAI/DeepSeek 后置 suggestions
                    if (json.suggestions) {
                      updateNodeData(targetNodeId, { suggestions: json.suggestions });
                    } else {
                      const delta = json.choices?.[0]?.delta;
                      if (delta?.tool_calls?.[0]?.function?.arguments) {
                        isHandlingToolCall = true;
                        toolArgumentsBuffer += delta.tool_calls[0].function.arguments;
                        try {
                          const parsedArgs = JSON.parse(toolArgumentsBuffer);
                          updateNodeData(targetNodeId, { chartData: parsedArgs, type: 'chart' as any });
                        } catch (e) {}
                      } else if (delta?.content) {
                        fullText += delta.content;
                        updateNodeData(targetNodeId, { text: fullText });
                      }
                    }
                  } catch (e) {}
                }
              }
            }
          }
        }
        
        if (!isHandlingToolCall) {
          const matchBlock = fullText.match(/```json:chart\n([\s\S]*?)```/);
          if (matchBlock) {
            try {
              updateNodeData(targetNodeId, { chartData: JSON.parse(matchBlock[1]), type: 'chart' as any });
            } catch (e) {}
          }
        }

        updateNodeData(targetNodeId, { isGenerating: false });
        isGeneratingRef.current = false;
      } catch (error: any) {
        console.error('Chat failed:', error);
        updateNodeData(targetNodeId, { text: `Error: ${error.message}`, isGenerating: false, isError: true });
        isGeneratingRef.current = false;
      }
    });
  }, [registerSendMessageHandler, addNode, connectNodes, updateNodeData, getViewport]);

  return null;
}
