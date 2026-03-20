'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import ReactFlow, { 
  Background, 
  Controls,
  BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useCanvas } from '@/contexts/CanvasContext';

// 核心修复：必须在组件外部使用 dynamic，确保引用在 HMR 和重新渲染期间绝对稳定
const MarkdownNode = dynamic(() => import('./nodes/MarkdownNode'), { 
  ssr: false,
  loading: () => <div className="p-4 bg-slate-50/50 backdrop-blur animate-pulse rounded-2xl min-w-[400px] h-40 border border-slate-200/50" />
});

const ChartNode = dynamic(() => import('./nodes/ChartNode'), { 
  ssr: false,
  loading: () => <div className="p-4 bg-slate-50/50 backdrop-blur animate-pulse rounded-2xl min-w-[300px] h-[250px] border border-slate-200/50 flex items-center justify-center text-slate-400 text-sm">Loading Analytics...</div>
});

// 定义稳定的 nodeTypes 映射对象
const nodeTypes = {
  markdown: MarkdownNode,
  chart: ChartNode,
};

// 定义稳定的连线配置
const edgeTypes = {};
const defaultEdgeOptions = {
  animated: true,
  style: { stroke: '#6366f1', strokeWidth: 4 },
};

export default function CanvasContainer() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useCanvas();

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        minZoom={0.05}
        maxZoom={4}
        onlyRenderVisibleElements={true}
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1} 
          color="rgba(0,0,0,0.1)" 
        />
        <Controls 
          position="bottom-right" 
          showInteractive={false} 
          className="!bg-white/80 !backdrop-blur !border-slate-200 !shadow-2xl !z-[999] pointer-events-auto rounded-xl overflow-hidden" 
        />
      </ReactFlow>
    </div>
  );
}
