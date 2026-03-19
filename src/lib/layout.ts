import { Node, Edge } from 'reactflow';
import { NodeData } from '@/types/canvas';
import dagre from 'dagre';

export const DEFAULT_CARD_WIDTH = 800;
export const DEFAULT_CARD_HEIGHT = 600;
export const STAGGER_X = 120;
export const STAGGER_Y = 80;
export const VERTICAL_SPACING = 200;

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

export const getResponsiveCardDimensions = () => {
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  
  return {
    width: Math.min(Math.max(viewportWidth * 0.8, 800), 1600),
    height: Math.min(Math.max(viewportHeight * 0.8, 600), 1000)
  };
};

export const calculateRootNodePosition = (
  viewport: ViewportState, 
  existingNodes: Node<NodeData>[], 
  cardWidth: number, 
  cardHeight: number
) => {
  const { x, y, zoom } = viewport;
  const flowX = (window.innerWidth / 2 - x) / zoom;
  const flowY = (window.innerHeight / 2 - y) / zoom;
  
  const rootNodes = existingNodes.filter(n => !n.data?.parentId || n.data.parentId === 'root');
  const staggerIndex = rootNodes.length;
  
  return { 
    x: flowX - (cardWidth / 2) + (staggerIndex * STAGGER_X), 
    y: flowY - (cardHeight / 2) + (staggerIndex * STAGGER_Y) 
  };
};

export const calculateChildNodePosition = (
  parentNode: Node<NodeData>, 
  existingNodes: Node<NodeData>[], 
  cardWidth: number, 
  cardHeight: number
) => {
  const px = parentNode.position.x;
  const py = parentNode.position.y;
  
  const parentWidth = parentNode.width ?? (parentNode.style?.width ? Number(parentNode.style.width) : DEFAULT_CARD_WIDTH);
  const parentHeight = parentNode.height ?? (parentNode.style?.height ? Number(parentNode.style.height) : DEFAULT_CARD_HEIGHT);
  
  const siblings = existingNodes.filter(n => n.data?.parentId === parentNode.id);
  const staggerIndex = siblings.length;
  
  return { 
    x: px + (parentWidth / 2) - (cardWidth / 2) + (staggerIndex * STAGGER_X), 
    y: py + parentHeight + VERTICAL_SPACING + (staggerIndex * STAGGER_Y)
  };
};

/**
 * Advanced Auto-Layout using Dagre
 * Arranges nodes in a hierarchical structure based on edges
 */
export const getLayoutedElements = (
  nodes: Node<NodeData>[], 
  edges: Edge[], 
  direction = 'TB'
) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ 
    rankdir: direction, 
    nodesep: 200, 
    ranksep: 300,
    marginx: 100,
    marginy: 100
  });

  nodes.forEach((node) => {
    // We use actual style or measured dimensions if available
    const width = node.width ?? (node.style?.width ? Number(node.style.width) : DEFAULT_CARD_WIDTH);
    const height = node.height ?? (node.style?.height ? Number(node.style.height) : DEFAULT_CARD_HEIGHT);
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const width = node.width ?? (node.style?.width ? Number(node.style.width) : DEFAULT_CARD_WIDTH);
    const height = node.height ?? (node.style?.height ? Number(node.style.height) : DEFAULT_CARD_HEIGHT);

    // Dagre sets the position of the center of the node
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
    };
  });

  return { nodes: newNodes, edges };
};

