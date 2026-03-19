import { Node, Edge } from 'reactflow';

export type AttachmentType = 'image/png' | 'image/jpeg' | 'application/pdf' | 'text/plain';

export interface Attachment {
  type: AttachmentType | string;
  url: string;
}

export interface NodeData {
  text: string;
  prompt?: string;
  isGenerating?: boolean;
  isError?: boolean;
  attachments?: Attachment[];
  parentId?: string;
  staggerIndex?: number;
  chartData?: {
    type: 'bar' | 'line' | 'pie' | 'area';
    data: any[];
    keys: string[]; // e.g., ["value", "count"]
    xAxisKey: string; // e.g., "name"
  };
}


export type NexusNode = Node<NodeData>;

export interface ModelConfig {
  model: string;
  apiKey: string;
  provider: 'openai' | 'gemini' | 'ollama' | 'deepseek' | 'custom';
  baseUrl?: string;
  systemPrompt?: string;
  zeroFrictionCount?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: Attachment[];
}

export interface CanvasSession {
  id: string;
  title: string;
  nodes: Node[];
  edges: Edge[];
  updatedAt: number;
  createdAt: number;
}
