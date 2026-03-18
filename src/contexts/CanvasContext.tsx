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
  clearCanvas: () => void;
  spawnChildNode: (parentId: string, prompt: string) => void;
  registerSendMessageHandler: (handler: (text: string, parentId?: string) => void) => void;
}

const CanvasContext = createContext<CanvasContextType | null>(null);

export function CanvasProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [sendMessageHandler, setSendMessageHandler] = useState<((text: string, parentId?: string) => void) | undefined>();
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (sessionId) {
      getSession(sessionId).then(session => {
        if (session) {
          setNodes(session.nodes || []);
          setEdges(session.edges || []);
        }
      });
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || nodes.length === 0) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveSession({
        id: sessionId,
        title: nodes[0]?.data?.text?.slice(0, 30) || 'Untitled Analysis',
        updatedAt: Date.now(),
        createdAt: Date.now(),
        nodes,
        edges
      });
    }, 1500);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [nodes, edges, sessionId]);

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

  const onConnect = useCallback((connection: Connection) => setEdges((eds) => addEdgeFlow({
    ...connection,
    animated: true,
    style: { stroke: '#6366f1', strokeWidth: 4 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' }
  }, eds)), []);

  const addNode = useCallback((node: Node) => setNodes((nds) => [...nds, node]), []);
  const deleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter(n => n.id !== id));
    setEdges((eds) => eds.filter(e => e.source !== id && e.target !== id));
  }, []);

  const updateNodeData = useCallback((id: string, data: any) => {
    setNodes((nds) => nds.map((node) => node.id === id ? { ...node, data: { ...node.data, ...data } } : node));
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
  }, []);

  const clearCanvas = useCallback(() => { setNodes([]); setEdges([]); }, []);
  const spawnChildNode = useCallback((parentId: string, prompt: string) => {
    if (sendMessageHandler) sendMessageHandler(prompt, parentId);
  }, [sendMessageHandler]);

  const registerSendMessageHandler = useCallback((handler: (text: string, parentId?: string) => void) => {
    setSendMessageHandler(() => handler);
  }, []);

  return (
    <CanvasContext.Provider value={{ 
      sessionId, setSessionId, nodes, edges, onNodesChange, onEdgesChange, onConnect, 
      addNode, deleteNode, updateNodeData, connectNodes, clearCanvas,
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
