import { useCallback, useState, useRef, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  NodeTypes,
  NodeMouseHandler,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Background,
  Controls,
  MiniMap,
  Connection,
  ReactFlowProvider,
  useReactFlow,
  useNodesState,
  useEdgesState,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { NodeData, EdgeData } from '@shared/schema';
import { StartNode } from './nodes/start-node';
import { MessageNode } from './nodes/message-node';
import { ConditionNode } from './nodes/condition-node';
import { ActionNode } from './nodes/action-node';
import { DelayNode } from './nodes/delay-node';
import { ApiRequestNode } from './nodes/api-request-node';
import { DataCollectionNode } from './nodes/data-collection-node';
import { useToast } from '@/hooks/use-toast';

interface NodeCanvasProps {
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Edge | Connection) => void;
  onNodeClick: NodeMouseHandler;
  onSaveNodes: (nodes: Node<NodeData>[], edges: Edge<EdgeData>[]) => void;
  readOnly?: boolean;
}

// Определяем типы узлов
const nodeTypes: NodeTypes = {
  start: StartNode,
  message: MessageNode,
  condition: ConditionNode,
  action: ActionNode,
  delay: DelayNode,
  api_request: ApiRequestNode,
  data_collection: DataCollectionNode,
};

// Компонент холста для редактора цепочек
function NodeCanvasContent({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onSaveNodes,
  readOnly = false,
}: NodeCanvasProps) {
  const reactFlow = useReactFlow();
  const { toast } = useToast();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Функция для переключения полноэкранного режима
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        toast({
          title: "Ошибка",
          description: `Не удалось включить полноэкранный режим: ${err.message}`,
          variant: "destructive",
        });
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Обработчик подключения узлов
  const handleConnect = useCallback(
    (params: Edge | Connection) => {
      onConnect(params);
    },
    [onConnect]
  );

  // Обработчик изменений в графе
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [nodes, edges]);

  // Обработчик изменения размера окна
  useEffect(() => {
    const handleResize = () => {
      reactFlow.fitView();
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [reactFlow]);

  // Обработчик завершения полноэкранного режима
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Обработчик перетаскивания узла из палитры
  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/reactflow');
      
      if (!nodeType) return;

      // Получаем координаты для нового узла
      const position = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Создаем новый узел
      const newNode: Node = {
        id: `${nodeType}-${Date.now()}`,
        type: nodeType,
        position,
        data: { 
          label: nodeType === 'start' ? 'Начало' : 
                 nodeType === 'message' ? 'Сообщение' : 
                 nodeType === 'condition' ? 'Условие' : 
                 nodeType === 'action' ? 'Действие' : 
                 nodeType === 'delay' ? 'Задержка' : 
                 nodeType === 'api_request' ? 'API запрос' : 
                 'Сбор данных',
          description: ''
        },
      };

      // Добавляем узел в граф
      reactFlow.addNodes(newNode);
      
      // Автоматически сохраняем изменения
      const updatedNodes = [...nodes, newNode];
      onSaveNodes(updatedNodes, edges);
    },
    [reactFlow, nodes, edges, onSaveNodes]
  );

  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden" style={{ height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        onDragOver={onDragOver}
        onDrop={onDrop}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        deleteKeyCode="Delete"
        snapToGrid
        snapGrid={[15, 15]}
        nodesConnectable={!readOnly}
        nodesDraggable={!readOnly}
        elementsSelectable={!readOnly}
        zoomOnScroll={!readOnly}
        panOnScroll={!readOnly}
        panOnDrag={!readOnly}
      >
        <Background color="#374151" gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeStrokeColor={(n) => {
            if (n.type === 'start') return '#3B82F6';
            if (n.type === 'message') return '#10B981';
            if (n.type === 'condition') return '#F59E0B';
            if (n.type === 'action') return '#EF4444';
            if (n.type === 'delay') return '#8B5CF6';
            if (n.type === 'api_request') return '#3B82F6';
            if (n.type === 'data_collection') return '#EC4899';
            return '#6B7280';
          }}
          nodeColor={(n) => {
            if (n.type === 'start') return '#3B82F6';
            if (n.type === 'message') return '#10B981';
            if (n.type === 'condition') return '#F59E0B';
            if (n.type === 'action') return '#EF4444';
            if (n.type === 'delay') return '#8B5CF6';
            if (n.type === 'api_request') return '#3B82F6';
            if (n.type === 'data_collection') return '#EC4899';
            return '#6B7280';
          }}
          maskColor="#1F2937"
          className="bg-gray-900"
        />
        
        {/* Кнопки управления масштабом */}
        <Panel position="bottom-right" className="bg-gray-900 p-1 rounded shadow-lg border border-gray-800">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost" 
              size="icon"
              onClick={() => reactFlow.zoomIn()}
              className="text-gray-400 hover:text-white"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => reactFlow.zoomOut()}
              className="text-gray-400 hover:text-white"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-gray-400 hover:text-white"
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

// Оборачиваем компонент в ReactFlowProvider
export function NodeCanvas(props: NodeCanvasProps) {
  return (
    <ReactFlowProvider>
      <NodeCanvasContent {...props} />
    </ReactFlowProvider>
  );
}

// Компоненты узлов импортированы сверху
