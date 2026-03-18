'use client';

import React, { useMemo } from 'react';
import ReactFlow, { 
  Background, 
  Controls,
  BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useCanvas } from '@/contexts/CanvasContext';
import MarkdownNode from './nodes/MarkdownNode';

export default function CanvasContainer() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useCanvas();

  const nodeTypes = useMemo(() => ({
    markdown: MarkdownNode,
  }), []);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        // IMPORTANT: Only allow dragging via the specific handle class
        dragHandle=".custom-drag-handle"
        fitView
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1} 
          color="rgba(0,0,0,0.1)" 
        />
        <Controls showInteractive={false} className="!bg-white !border-slate-200" />
      </ReactFlow>
    </div>
  );
}
