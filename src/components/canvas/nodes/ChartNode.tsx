'use client';

import React, { memo, useState } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Bot, GripHorizontal, Trash2, Sparkles } from 'lucide-react';
import { useCanvas } from '@/contexts/CanvasContext';
import { NodeData } from '@/types/canvas';
import DockInput from '@/components/input/DockInput';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

function ChartNode({ id, data, selected }: { id: string, data: NodeData, selected: boolean }) {
  const { deleteNode, spawnChildNode } = useCanvas();
  const [isHovered, setIsHovered] = useState(false);
  
  const chartData = data.chartData;

  const renderChart = () => {
    if (!chartData || !chartData.data) return <div className="flex items-center justify-center h-full text-slate-400">Invalid Chart Data</div>;

    const { type, xAxisKey, keys, data: plotData } = chartData;

    if (type === 'bar') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={plotData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey={xAxisKey} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', fontWeight: 800 }} />
            {keys.map((key: string, idx: number) => (
              <Bar key={key} dataKey={key} fill={COLORS[idx % COLORS.length]} radius={[6, 6, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (type === 'line') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={plotData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey={xAxisKey} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', fontWeight: 800 }} />
            {keys.map((key: string, idx: number) => (
              <Line key={key} type="monotone" dataKey={key} stroke={COLORS[idx % COLORS.length]} strokeWidth={4} dot={{ r: 6, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 8 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (type === 'pie') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={plotData} dataKey={keys[0]} nameKey={xAxisKey} cx="50%" cy="50%" outerRadius={80} innerRadius={50} paddingAngle={5}>
              {plotData.map((_: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', fontWeight: 800 }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    return null;
  };

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`nexus-force-light border-2 rounded-[2.5rem] w-full h-full flex flex-col transition-all duration-300 ${selected ? 'border-indigo-600 ring-8 ring-indigo-500/10 shadow-[0_30px_100px_rgba(0,0,0,0.3)]' : 'border-slate-300 shadow-[0_10px_30px_rgba(0,0,0,0.1)]'} group/node relative bg-white overflow-visible`}>
      
      <div className="flex-1 flex flex-col overflow-hidden rounded-[2.35rem] w-full h-full">
        {/* Header */}
        <div className="bg-slate-100 px-6 py-3 border-b-2 border-slate-200 flex items-center justify-between cursor-grab active:cursor-grabbing custom-drag-handle shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-xl bg-indigo-600 text-white shadow-md">
              <Bot size={18} strokeWidth={3} />
            </div>
            <span className="text-[12px] font-black text-black uppercase tracking-widest">Analytical Chart</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => deleteNode(id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover/node:opacity-100">
              <Trash2 size={18} />
            </button>
            <GripHorizontal size={22} className="text-slate-400 group-hover/node:text-slate-600" />
          </div>
        </div>

        {/* Chart Body */}
        <div className="p-8 flex-1 min-h-0 bg-white nodrag nowheel overflow-y-auto">
          <div className="w-full h-full min-h-[300px]">
            {renderChart()}
          </div>
        </div>

        {/* Footer Area */}
        <div className="px-6 py-4 bg-slate-50 border-t-2 border-slate-200 flex flex-col gap-3 shrink-0">
          {data.suggestions && data.suggestions.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                {data.suggestions.map((label, idx) => (
                  <button 
                    key={`sug-${idx}`} 
                    onClick={() => spawnChildNode(id, label)} 
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 border-2 border-indigo-700 rounded-lg text-[10px] font-black text-white hover:bg-black hover:border-black transition-all shadow-md uppercase tracking-tighter"
                  >
                    <Sparkles size={10} className="text-white" />
                    {label}
                  </button>
                ))}
              </div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Suggested Insights
              </div>
            </div>
          )}
          <DockInput variant="node" nodeId={id} />
        </div>
      </div>
      
      <NodeResizer minWidth={500} minHeight={400} isVisible={selected || isHovered} lineClassName="border-indigo-500 border-[3px] opacity-0 group-hover/node:opacity-30" handleClassName="!w-12 !h-12 !bg-transparent !border-none !-m-6" />
      <Handle type="target" position={Position.Top} className="!w-6 !h-6 !bg-indigo-600 !border-[3px] !border-white !-top-3 shadow-xl z-50" />
      <Handle type="source" position={Position.Bottom} className="!w-6 !h-6 !bg-black !border-[3px] !border-white !-bottom-3 shadow-xl z-50" />
    </div>
  );
}

const areEqual = (prevProps: { selected: boolean, data: NodeData }, nextProps: { selected: boolean, data: NodeData }) => {
  return (
    prevProps.selected === nextProps.selected &&
    prevProps.data.text === nextProps.data.text &&
    prevProps.data.isGenerating === nextProps.data.isGenerating &&
    prevProps.data.chartData === nextProps.data.chartData &&
    (prevProps.data.suggestions?.length === nextProps.data.suggestions?.length)
  );
};

export default memo(ChartNode, areEqual);
