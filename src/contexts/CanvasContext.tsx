'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Node, Edge, addEdge as addEdgeFlow, Connection, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange, MarkerType } from 'reactflow';
import { saveSession, getSession } from '@/lib/db';

interface CanvasContextType {
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: Node) => void;
  deleteNode: (id: string) => void;
  updateNodeData: (id: string, data: any) => void;
  connectNodes: (sourceId: string, targetId: string) => void;
  selectNode: (id: string) => void;
  clearCanvas: () => void;
  spawnChildNode: (parentId: string, prompt: string, attachments?: { type: string, url: string }[]) => void;
  registerSendMessageHandler: (handler: (text: string, parentId?: string, attachments?: { type: string, url: string }[]) => void) => void;
}

const CanvasContext = createContext<CanvasContextType | null>(null);

export function CanvasProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [sendMessageHandler, setSendMessageHandler] = useState<((text: string, parentId?: string, attachments?: { type: string, url: string }[]) => void) | undefined>();
  
  // Refs to track state and changes without triggering re-renders or staleness
  const hasChangesRef = useRef(false);
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const sessionIdRef = useRef<string | null>(null);

  // Sync refs with state
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  // Initial load
  useEffect(() => {
    if (sessionId) {
      getSession(sessionId).then(session => {
        if (session) {
          const nodesWithHandle = (session.nodes || []).map((n: Node) => ({ ...n, dragHandle: '.custom-drag-handle' }));
          setNodes(nodesWithHandle);
          setEdges(session.edges || []);
          // Reset change tracker after loading a new session
          hasChangesRef.current = false;
        }
      });
    } else {
      setNodes([]);
      setEdges([]);
      hasChangesRef.current = false;
    }
  }, [sessionId]);

  // High-performance Periodic Saver (Every 10 Seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const currentSessionId = sessionIdRef.current;
      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;

      if (hasChangesRef.current && currentSessionId && currentNodes.length > 0) {
        console.log('[Canvas] Auto-saving changes...');
        saveSession({
          id: currentSessionId,
          title: currentNodes[0]?.data?.text?.slice(0, 30).replace(/\n/g, ' ') || 'Untitled Analysis',
          updatedAt: Date.now(),
          createdAt: Date.now(),
          nodes: currentNodes,
          edges: currentEdges
        }).then(() => {
          hasChangesRef.current = false;
        });
      }
    }, 10000); // 10 second interval

    return () => clearInterval(interval);
  }, []);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
    hasChangesRef.current = true;
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
    hasChangesRef.current = true;
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdgeFlow({
      ...connection,
      animated: true,
      style: { stroke: '#6366f1', strokeWidth: 4 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' }
    }, eds));
    hasChangesRef.current = true;
  }, []);

  const addNode = useCallback((node: Node) => {
    // 自动生成会话 ID（如果当前为空）
    let currentId = sessionIdRef.current;
    if (!currentId) {
      currentId = `session-${Date.now()}`;
      setSessionId(currentId);
      sessionIdRef.current = currentId;
    }
    
    // 修复：如果新节点要被选中，先清除所有旧节点的选中状态
    const baseNodes = node.selected 
      ? nodesRef.current.map(n => ({ ...n, selected: false }))
      : nodesRef.current;

    const newNodes = [...baseNodes, { ...node, dragHandle: '.custom-drag-handle' }];
    setNodes(newNodes);
    hasChangesRef.current = true;

    // 产生新卡片时立即保存
    saveSession({
      id: currentId,
      title: newNodes[0]?.data?.text?.slice(0, 30).replace(/\n/g, ' ') || 'New Analysis',
      updatedAt: Date.now(),
      createdAt: Date.now(),
      nodes: newNodes,
      edges: edgesRef.current
    });
  }, []);

  const deleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter(n => n.id !== id));
    setEdges((eds) => eds.filter(e => e.source !== id && e.target !== id));
    hasChangesRef.current = true;
  }, []);

  const updateNodeData = useCallback((id: string, data: any) => {
    setNodes((nds) => nds.map((node) => node.id === id ? { ...node, data: { ...node.data, ...data } } : node));
    hasChangesRef.current = true;
  }, []);

  const connectNodes = useCallback((sourceId: string, targetId: string) => {
    setEdges((eds) => addEdgeFlow({
      id: `e-${sourceId}-${targetId}`,
      source: sourceId,
      target: targetId,
      animated: true,
      style: { stroke: '#6366f1', strokeWidth: 4 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' }
    }, eds));
    hasChangesRef.current = true;
  }, []);

  const selectNode = useCallback((id: string) => {
    setNodes((nds) => {
      // 如果已经选中了该节点，则不触发状态更新，保持动画稳定
      if (nds.find(n => n.id === id)?.selected) return nds;
      return nds.map((node) => ({ ...node, selected: node.id === id }));
    });
  }, []);

  const clearCanvas = useCallback(() => { 
    setNodes([]); 
    setEdges([]); 
    hasChangesRef.current = true;
  }, []);

  const spawnChildNode = useCallback((parentId: string, prompt: string, attachments?: { type: string, url: string }[]) => {
    if (sendMessageHandler) sendMessageHandler(prompt, parentId, attachments);
  }, [sendMessageHandler]);

  const registerSendMessageHandler = useCallback((handler: (text: string, parentId?: string, attachments?: { type: string, url: string }[]) => void) => {
    setSendMessageHandler(() => handler);
  }, []);

  return (
    <CanvasContext.Provider value={{ 
      sessionId, setSessionId, nodes, edges, onNodesChange, onEdgesChange, onConnect, 
      addNode, deleteNode, updateNodeData, connectNodes, selectNode, clearCanvas,
      spawnChildNode, registerSendMessageHandler
    }}>
      {children}
    </CanvasContext.Provider>
  );
}

export function useCanvas() {
  const context = useContext(CanvasContext);
  if (!context) throw new Error('useCanvas error');
  return context;
}
