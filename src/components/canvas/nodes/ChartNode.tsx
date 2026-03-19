'use client';

import React, { memo, useMemo, useState } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList 
} from 'recharts';
import { Bot, GripHorizontal, Trash2, Sparkles, Download, Share2, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useCanvas } from '@/contexts/CanvasContext';
import { NodeData } from '@/types/canvas';
import DockInput from '@/components/input/DockInput';
import Modal from '@/components/ui/Modal';

const COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

const ChartRenderer = memo(({ chart }: { chart: any }) => {
  if (!chart || !chart.data) return null;

  switch (chart.type) {
    case 'pie':
      return (
        <PieChart>
          <Pie
            data={chart.data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            dataKey={chart.keys[0]}
            nameKey={chart.xAxisKey}
            isAnimationActive={false}
            label={({ cx, cy, midAngle, innerRadius, outerRadius, index, value }) => {
              const RADIAN = Math.PI / 180;
              const radius = outerRadius + 25;
              const x = cx + radius * Math.cos(-midAngle * RADIAN);
              const y = cy + radius * Math.sin(-midAngle * RADIAN);
              return (
                <text 
                  x={x} y={y} 
                  fill={COLORS[index % COLORS.length]} 
                  textAnchor={x > cx ? 'start' : 'end'} 
                  dominantBaseline="central"
                  className="text-[12px] font-bold"
                >
                  {value}
                </text>
              );
            }}
          >
            {chart.data.map((_: any, index: number) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
          <Legend verticalAlign="bottom" height={36}/>
        </PieChart>
      );
    case 'line':
      return (
        <LineChart data={chart.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey={chart.xAxisKey} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
          <Tooltip cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
          <Legend verticalAlign="top" align="right" iconType="circle" />
          {chart.keys.map((key: string, index: number) => (
            <Line key={key} type="monotone" dataKey={key} stroke={COLORS[index % COLORS.length]} strokeWidth={4} dot={{ r: 5, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 7, strokeWidth: 0 }} isAnimationActive={false}>
              <LabelList dataKey={key} position="top" style={{ fill: COLORS[index % COLORS.length], fontSize: 11, fontWeight: 700 }} />
            </Line>
          ))}
        </LineChart>
      );
    default:
      return (
        <BarChart data={chart.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey={chart.xAxisKey} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
          <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
          <Legend verticalAlign="top" align="right" iconType="circle" />
          {chart.keys.map((key: string, index: number) => (
            <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} radius={[6, 6, 0, 0]} barSize={40} isAnimationActive={false}>
              <LabelList dataKey={key} position="top" style={{ fill: COLORS[index % COLORS.length], fontSize: 11, fontWeight: 700 }} offset={8} />
            </Bar>
          ))}
        </BarChart>
      );
  }
}, (prev, next) => JSON.stringify(prev.chart) === JSON.stringify(next.chart));

ChartRenderer.displayName = 'ChartRenderer';

function ChartNode({ id, data, selected }: { id: string, data: NodeData, selected: boolean }) {
  const { deleteNode, spawnChildNode } = useCanvas();
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const parsed = useMemo(() => {
    let cleanText = data.text || '';
    cleanText = cleanText.replace(/```json:chart\n([\s\S]*?)```/g, '');
    cleanText = cleanText.replace(/print\(generate_chart\([\s\S]*?\)\)/g, '');
    cleanText = cleanText.replace(/generate_chart\([\s\S]*?\)/g, '');
    const chipRegex = /\[NEXT:\s*(.+?)\]/g;
    const chips: string[] = [];
    let match;
    while ((match = chipRegex.exec(cleanText)) !== null) {
      chips.push(match[1]);
    }
    cleanText = cleanText.replace(/\[NEXT:\s*.+?\]/g, '').trim();
    const config = JSON.parse(localStorage.getItem('nexus-model-config') || '{}');
    const limit = config.zeroFrictionCount ?? 3;
    return { text: cleanText, chips: chips.slice(0, limit) };
  }, [data.text]);

  const chart = data.chartData;

  const handleDelete = () => {
    deleteNode(id);
    setShowDeleteConfirm(false);
  };

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`nexus-force-light border-2 rounded-[2.5rem] w-full h-full flex flex-col transition-[border-color,box-shadow,ring] duration-300 ${selected ? 'border-indigo-600 ring-8 ring-indigo-500/10 shadow-[0_30px_100px_rgba(0,0,0,0.3)]' : 'border-slate-300 shadow-[0_10px_30px_rgba(0,0,0,0.1)]'} group/node relative bg-white overflow-visible`}>
      
      <Modal 
        isOpen={showDeleteConfirm} 
        onClose={() => setShowDeleteConfirm(false)}
        title="Discard Visualization?"
        type="danger"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setShowDeleteConfirm(false)} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
            <button onClick={handleDelete} className="px-6 py-3 bg-red-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-200 transition-all active:scale-95">Discard Node</button>
          </div>
        }
      >
        You are about to remove this chart and its analysis. This action cannot be undone. Are you sure you want to proceed?
      </Modal>

      <div className="flex-1 flex flex-col overflow-hidden rounded-[2.35rem] w-full h-full">
        <div className="bg-slate-100 px-6 py-3 border-b-2 border-slate-200 flex items-center justify-between cursor-grab active:cursor-grabbing custom-drag-handle shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-xl shadow-md bg-indigo-600 text-white`}>
              <Bot size={18} strokeWidth={3} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] leading-tight">Insight Visualizer</span>
              <span className="text-[13px] font-black text-black uppercase tracking-widest truncate max-w-[200px]">{chart?.type || 'Data'} Analysis</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowDeleteConfirm(true)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover/node:opacity-100"><Trash2 size={18} /></button>
            <GripHorizontal size={22} className="text-slate-400 group-hover/node:text-slate-600" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 flex flex-col min-h-0 bg-white selection:bg-indigo-100 scroll-smooth custom-scrollbar nowheel nodrag select-text cursor-auto">
          {data.prompt && (
            <div className="mb-8 shrink-0 border-l-4 border-indigo-100 pl-4 py-1 select-text">
              <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-black mb-2 flex items-center gap-2"><FileText size={12} />Inquiry Context</div>
              <p className="text-[16px] font-bold text-slate-600 italic leading-relaxed">"{data.prompt}"</p>
            </div>
          )}
          {parsed.text && (
            <div className="prose prose-slate max-w-none select-text prose-p:text-[17px] prose-p:leading-relaxed prose-p:text-slate-700 prose-p:font-medium prose-headings:text-black prose-headings:font-black prose-strong:text-indigo-600 mb-8 shrink-0">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsed.text}</ReactMarkdown>
            </div>
          )}
          <div className="w-full min-h-[400px] flex-grow nodrag nowheel bg-slate-50/50 rounded-3xl border-2 border-slate-100 p-4 relative mb-4">
             <div className="absolute top-4 left-6 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400" /><span className="w-3 h-3 rounded-full bg-amber-400" /><span className="w-3 h-3 rounded-full bg-emerald-400" />
             </div>
             <ResponsiveContainer width="100%" height="100%" debounce={1}><ChartRenderer chart={chart} /></ResponsiveContainer>
          </div>
          <div className="h-4 shrink-0" />
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t-2 border-slate-200 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {parsed.chips.length > 0 ? (
                parsed.chips.map((label, idx) => (
                  <button key={idx} onClick={() => spawnChildNode(id, label)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-slate-300 rounded-lg text-[10px] font-black text-black hover:bg-black hover:text-white hover:border-black transition-all shadow-sm uppercase tracking-tighter"><Sparkles size={10} className="text-indigo-500" />{label}</button>
                ))
              ) : (
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-1.5">Insight Discovery</div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/node:opacity-100 transition-opacity">
              <button title="Export PDF" className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-all border-2 border-transparent hover:border-slate-200"><Download size={16} /></button>
              <button title="Share Insight" className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-all border-2 border-transparent hover:border-slate-200"><Share2 size={16} /></button>
            </div>
          </div>
          <DockInput variant="node" nodeId={id} />
        </div>
      </div>
      
      <NodeResizer minWidth={700} minHeight={600} isVisible={selected || isHovered} lineClassName="border-indigo-500 border-[3px] opacity-0 group-hover/node:opacity-30" handleClassName="!w-12 !h-12 !bg-transparent !border-none !-m-6" />
      <Handle type="target" position={Position.Top} className="!w-6 !h-6 !bg-indigo-600 !border-[3px] !border-white !-top-3 shadow-xl z-50" />
      <div className="absolute bottom-3 right-3 w-12 h-12 pointer-events-none flex items-end justify-end opacity-20 group-hover/node:opacity-100 transition-opacity"><div className="w-10 h-10 border-r-[6px] border-b-[6px] border-indigo-600 rounded-br-3xl" /></div>
      <Handle type="source" position={Position.Bottom} className="!w-6 !h-6 !bg-black !border-[3px] !border-white !-bottom-3 shadow-xl z-50" />
    </div>
  );
}

const areEqual = (prevProps: { selected: boolean, data: NodeData }, nextProps: { selected: boolean, data: NodeData }) => {
  return (
    prevProps.selected === nextProps.selected &&
    JSON.stringify(prevProps.data.chartData) === JSON.stringify(nextProps.data.chartData) &&
    prevProps.data.text === nextProps.data.text &&
    prevProps.data.isGenerating === nextProps.data.isGenerating
  );
};

export default memo(ChartNode, areEqual);
