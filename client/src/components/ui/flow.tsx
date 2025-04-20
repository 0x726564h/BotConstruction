import React, { useState, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  ReactFlowProvider,
  useReactFlow,
  Panel,
  NodeTypes,
  EdgeTypes,
  addEdge
} from 'reactflow';
import 'reactflow/dist/style.css';

// Базовый компонент Flow для работы с React Flow
export function Flow({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  nodeTypes,
  edgeTypes,
  onNodeClick,
  children,
}: {
  nodes: Node[];
  edges: Edge[];
  onNodesChange?: (changes: NodeChange[]) => void;
  onEdgesChange?: (changes: EdgeChange[]) => void;
  onConnect?: (connection: Connection) => void;
  nodeTypes?: NodeTypes;
  edgeTypes?: EdgeTypes;
  onNodeClick?: (event: React.MouseEvent, node: Node) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        fitView
        attributionPosition="bottom-right"
      >
        <Background color="#374151" gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeStrokeColor={(n) => {
            if (n.type === 'start') return '#3B82F6';
            if (n.type === 'message') return '#10B981';
            if (n.type === 'condition') return '#F59E0B';
            if (n.type === 'action') return '#EF4444';
            return '#6B7280';
          }}
          nodeColor={(n) => {
            if (n.type === 'start') return '#3B82F6';
            if (n.type === 'message') return '#10B981';
            if (n.type === 'condition') return '#F59E0B';
            if (n.type === 'action') return '#EF4444';
            return '#6B7280';
          }}
          maskColor="#1F2937"
          className="bg-surface-800"
        />
        {children}
      </ReactFlow>
    </div>
  );
}

// Компонент-обертка с React Flow Provider и внутренним состоянием
export function FlowCanvas({
  initialNodes = [],
  initialEdges = [],
  nodeTypes,
  edgeTypes,
  onNodeClick,
  onNodesChange: onNodesChangeProp,
  onEdgesChange: onEdgesChangeProp,
  onConnect: onConnectProp,
  children,
}: {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  nodeTypes?: NodeTypes;
  edgeTypes?: EdgeTypes;
  onNodeClick?: (event: React.MouseEvent, node: Node) => void;
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
  onConnect?: (connection: Edge) => void;
  children?: React.ReactNode;
}) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const updatedNodes = applyNodeChanges(changes, nodes);
      setNodes(updatedNodes);
      onNodesChangeProp?.(updatedNodes);
    },
    [nodes, onNodesChangeProp]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const updatedEdges = applyEdgeChanges(changes, edges);
      setEdges(updatedEdges);
      onEdgesChangeProp?.(updatedEdges);
    },
    [edges, onEdgesChangeProp]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = { ...params, id: `edge-${Date.now()}` } as Edge;
      const updatedEdges = addEdge(newEdge, edges);
      setEdges(updatedEdges);
      onConnectProp?.(newEdge);
    },
    [edges, onConnectProp]
  );

  return (
    <ReactFlowProvider>
      <Flow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
      >
        {children}
      </Flow>
    </ReactFlowProvider>
  );
}

// Экспорт полезных компонентов из React Flow
export { Panel, useReactFlow };
