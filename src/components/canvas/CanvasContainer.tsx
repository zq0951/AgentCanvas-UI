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

const nodeTypes = {
  markdown: MarkdownNode,
};

export default function CanvasContainer() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useCanvas();

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        minZoom={0.05}
        maxZoom={4}
        onlyRenderVisibleElements={false}
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1} 
          color="rgba(0,0,0,0.1)" 
        />
        <Controls position="bottom-right" className="!bg-white !border-slate-200 !shadow-2xl !z-[999] pointer-events-auto" />
      </ReactFlow>
    </div>
  );
}
