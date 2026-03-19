'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { 
  Node, 
  Edge, 
  addEdge as addEdgeFlow, 
  Connection, 
  applyNodeChanges, 
  applyEdgeChanges, 
  NodeChange, 
  EdgeChange, 
  MarkerType 
} from 'reactflow';
import { saveSession, getSession } from '@/lib/db';
import { NodeData, Attachment } from '@/types/canvas';
import { getLayoutedElements } from '@/lib/layout';

interface CanvasContextType {
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  nodes: Node<NodeData>[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: Node<NodeData>) => void;
  deleteNode: (id: string) => void;
  updateNodeData: (id: string, data: Partial<NodeData>) => void;
  connectNodes: (sourceId: string, targetId: string) => void;
  selectNode: (id: string) => void;
  clearCanvas: () => void;
  spawnChildNode: (parentId: string, prompt: string, attachments?: Attachment[]) => void;
  retryNode: (id: string) => void;
  autoLayout: (direction?: 'TB' | 'LR') => void;
  registerSendMessageHandler: (handler: (text: string, parentId?: string, attachments?: Attachment[], existingNodeId?: string) => void) => void;
}

const CanvasContext = createContext<CanvasContextType | null>(null);

export function CanvasProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Node<NodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [sendMessageHandler, setSendMessageHandler] = useState<((text: string, parentId?: string, attachments?: Attachment[], existingNodeId?: string) => void) | undefined>();
  
  const hasChangesRef = useRef(false);
  const nodesRef = useRef<Node<NodeData>[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      getSession(sessionId).then(session => {
        if (session) {
          const nodesWithHandle = (session.nodes || []).map((n: Node) => ({ 
            ...n, 
            dragHandle: '.custom-drag-handle' 
          }));
          setNodes(nodesWithHandle);
          setEdges(session.edges || []);
          hasChangesRef.current = false;
        }
      });
    } else {
      setNodes([]);
      setEdges([]);
      hasChangesRef.current = false;
    }
  }, [sessionId]);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentSessionId = sessionIdRef.current;
      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;

      // 修复：只要有变更且有 sessionId，就允许保存（即使 currentNodes 为空，以支持清空画布的持久化）
      if (hasChangesRef.current && currentSessionId) {
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
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => {
      const next = applyNodeChanges(changes, nds);
      nodesRef.current = next; // 立即同步 Ref
      return next;
    });
    hasChangesRef.current = true;
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => {
      const next = applyEdgeChanges(changes, eds);
      edgesRef.current = next; // 立即同步 Ref
      return next;
    });
    hasChangesRef.current = true;
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => {
      const next = addEdgeFlow({
        ...connection,
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 4 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' }
      }, eds);
      edgesRef.current = next;
      return next;
    });
    hasChangesRef.current = true;
  }, []);

  const addNode = useCallback((node: Node<NodeData>) => {
    let currentId = sessionIdRef.current;
    if (!currentId) {
      currentId = `session-${Date.now()}`;
      setSessionId(currentId);
      sessionIdRef.current = currentId;
    }
    
    const baseNodes = node.selected 
      ? nodesRef.current.map(n => ({ ...n, selected: false }))
      : nodesRef.current;

    const newNodes = [...baseNodes, { ...node, dragHandle: '.custom-drag-handle' }];
    setNodes(newNodes);
    nodesRef.current = newNodes; // 立即同步 Ref
    hasChangesRef.current = true;

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
    const nextNodes = nodesRef.current.filter(n => n.id !== id);
    const nextEdges = edgesRef.current.filter(e => e.source !== id && e.target !== id);
    
    setNodes(nextNodes);
    setEdges(nextEdges);
    nodesRef.current = nextNodes;
    edgesRef.current = nextEdges;
    hasChangesRef.current = true;

    // 立即执行一次保存，防止被定时器旧数据覆盖
    if (sessionIdRef.current) {
      saveSession({
        id: sessionIdRef.current,
        title: nextNodes[0]?.data?.text?.slice(0, 30).replace(/\n/g, ' ') || 'Analysis Board',
        updatedAt: Date.now(),
        createdAt: Date.now(),
        nodes: nextNodes,
        edges: nextEdges
      }).then(() => {
        hasChangesRef.current = false;
      });
    }
  }, []);

  const updateNodeData = useCallback((id: string, data: Partial<NodeData> & { type?: string }) => {
    setNodes((nds) => {
      const next = nds.map((node) => {
        if (node.id === id) {
          const { type, ...restData } = data;
          return {
            ...node,
            type: type || node.type,
            data: { ...node.data, ...restData }
          };
        }
        return node;
      });
      nodesRef.current = next;
      return next;
    });
    hasChangesRef.current = true;
  }, []);


  const connectNodes = useCallback((sourceId: string, targetId: string) => {
    setEdges((eds) => {
      const next = addEdgeFlow({
        id: `e-${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 4 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' }
      }, eds);
      edgesRef.current = next;
      return next;
    });
    hasChangesRef.current = true;
  }, []);

  const selectNode = useCallback((id: string) => {
    setNodes((nds) => {
      if (nds.find(n => n.id === id)?.selected) return nds;
      const next = nds.map((node) => ({ ...node, selected: node.id === id }));
      nodesRef.current = next;
      return next;
    });
  }, []);

  const clearCanvas = useCallback(() => { 
    setNodes([]); 
    setEdges([]); 
    nodesRef.current = [];
    edgesRef.current = [];
    hasChangesRef.current = true;

    if (sessionIdRef.current) {
      saveSession({
        id: sessionIdRef.current,
        title: 'Empty Canvas',
        updatedAt: Date.now(),
        createdAt: Date.now(),
        nodes: [],
        edges: []
      }).then(() => {
        hasChangesRef.current = false;
      });
    }
  }, []);

  const autoLayout = useCallback((direction: 'TB' | 'LR' = 'TB') => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodesRef.current, 
      edgesRef.current, 
      direction
    );
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
    hasChangesRef.current = true;
  }, []);

  const spawnChildNode = useCallback((parentId: string, prompt: string, attachments?: Attachment[]) => {
    if (sendMessageHandler) sendMessageHandler(prompt, parentId, attachments);
  }, [sendMessageHandler]);

  const retryNode = useCallback((id: string) => {
    const node = nodesRef.current.find(n => n.id === id);
    if (node && node.data.prompt && !node.data.isGenerating) {
      if (sendMessageHandler) {
        sendMessageHandler(node.data.prompt, undefined, node.data.attachments, id);
      }
    }
  }, [sendMessageHandler]);

  const registerSendMessageHandler = useCallback((handler: (text: string, parentId?: string, attachments?: Attachment[], existingNodeId?: string) => void) => {
    setSendMessageHandler(() => handler);
  }, []);

  return (
    <CanvasContext.Provider value={{ 
      sessionId, setSessionId, nodes, edges, onNodesChange, onEdgesChange, onConnect, 
      addNode, deleteNode, updateNodeData, connectNodes, selectNode, clearCanvas,
      spawnChildNode, retryNode, autoLayout, registerSendMessageHandler
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
