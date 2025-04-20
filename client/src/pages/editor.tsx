import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Edge, Node, ReactFlowInstance, XYPosition } from 'reactflow';
import { Navbar } from '@/components/layout/navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { RightSidebar } from '@/components/layout/right-sidebar';
import { NodeCanvas } from '@/components/editor/node-canvas';
import { EditorToolbar } from '@/components/editor/editor-toolbar';
import { NodePalette } from '@/components/editor/node-palette';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useWebSocket } from '@/hooks/use-websocket';
import { DialogueChain, NodeData, EdgeData } from '@shared/schema';
import { Loader2, ArrowLeftCircle } from 'lucide-react';

export default function Editor() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { status: wsStatus, sendEditorCommand, getMessagesByType } = useWebSocket();
  
  // Состояние редактора
  const [nodes, setNodes] = useState<Node<NodeData>[]>([]);
  const [edges, setEdges] = useState<Edge<EdgeData>[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [chainName, setChainName] = useState<string>('Новая цепочка');
  const [logs, setLogs] = useState<string[]>([]);
  
  // История изменений для undo/redo
  const [history, setHistory] = useState<{ nodes: Node<NodeData>[], edges: Edge<EdgeData>[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isInitialLoadRef = useRef<boolean>(true);
  
  // Запрос данных цепочки из API
  const { data: chain, isLoading, error } = useQuery<DialogueChain>({
    queryKey: ['/api/chains', id],
    enabled: !!id,
  });
  
  // Мутация для обновления цепочки
  const updateChainMutation = useMutation({
    mutationFn: async (data: { name?: string, graph_json?: any }) => {
      if (!id) {
        const res = await apiRequest('POST', '/api/chains', {
          name: data.name || 'Новая цепочка',
          graph_json: data.graph_json || { nodes: [], edges: [] }
        });
        return res.json();
      } else {
        const res = await apiRequest('PUT', `/api/chains/${id}`, data);
        return res.json();
      }
    },
    onSuccess: (data) => {
      if (!id) {
        navigate(`/editor/${data.id}`);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/chains'] });
      
      toast({
        title: 'Успешно',
        description: 'Цепочка сохранена',
      });
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось сохранить цепочку',
        variant: 'destructive',
      });
    },
  });
  
  // Инициализация редактора при загрузке данных
  useEffect(() => {
    if (chain && isInitialLoadRef.current) {
      setChainName(chain.name);
      setIsRunning(chain.is_active);
      
      if (chain.graph_json && typeof chain.graph_json === 'object') {
        const graphData = chain.graph_json as { nodes: Node<NodeData>[], edges: Edge<EdgeData>[] };
        
        if (Array.isArray(graphData.nodes)) {
          setNodes(graphData.nodes);
        }
        
        if (Array.isArray(graphData.edges)) {
          setEdges(graphData.edges);
        }
        
        // Сохраняем начальное состояние в историю
        setHistory([{ nodes: graphData.nodes || [], edges: graphData.edges || [] }]);
        setHistoryIndex(0);
      } else if (!chain.graph_json) {
        // Создаем начальный узел, если цепочка пуста
        const initialNode: Node<NodeData> = {
          id: 'start-1',
          type: 'start',
          position: { x: 100, y: 100 },
          data: { label: 'Начало цепочки', description: '' }
        };
        
        setNodes([initialNode]);
        setHistory([{ nodes: [initialNode], edges: [] }]);
        setHistoryIndex(0);
      }
      
      isInitialLoadRef.current = false;
    }
  }, [chain]);
  
  // Сохранение истории изменений при обновлении nodes или edges
  useEffect(() => {
    if (!isInitialLoadRef.current && historyIndex >= 0) {
      const currentState = { nodes, edges };
      const lastHistoryState = history[historyIndex];
      
      // Проверяем, есть ли изменения по сравнению с последним состоянием
      const hasChanges = JSON.stringify(currentState) !== JSON.stringify(lastHistoryState);
      
      if (hasChanges) {
        // Обрезаем историю до текущего индекса и добавляем новое состояние
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(currentState);
        
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
    }
  }, [nodes, edges]);
  
  // Отслеживание обновлений задач через WebSocket
  useEffect(() => {
    const taskUpdates = getMessagesByType('task_update');
    
    // Добавляем логи из обновлений задач
    if (taskUpdates.length > 0) {
      taskUpdates.forEach(update => {
        if (update.data && Array.isArray(update.data.log)) {
          const newLogs = update.data.log.map((logItem: string) => 
            `[${new Date().toLocaleTimeString()}] [INFO] ${logItem}`
          );
          
          setLogs(prev => [...prev, ...newLogs]);
        }
        
        // Обновляем статус выполнения
        if (chain && update.data && update.data.chain_id === chain.id) {
          setIsRunning(update.data.status === 'running');
        }
      });
    }
  }, [getMessagesByType, chain]);
  
  // Обработчики изменения nodes и edges
  const onNodesChange = useCallback((changes: any) => {
    setNodes(nds => {
      const updatedNodes = [...nds];
      changes.forEach((change: any) => {
        if (change.type === 'remove') {
          const nodeToRemove = updatedNodes.find(n => n.id === change.id);
          if (nodeToRemove && selectedNode?.id === nodeToRemove.id) {
            setSelectedNode(null);
          }
        }
      });
      return updatedNodes;
    });
    
    setNodes(nds => {
      return nds.map(node => {
        const changeForNode = changes.find((change: any) => change.id === node.id);
        if (changeForNode && changeForNode.type === 'position' && changeForNode.position) {
          return {
            ...node,
            position: changeForNode.position
          };
        }
        return node;
      });
    });
  }, [selectedNode]);
  
  const onEdgesChange = useCallback((changes: any) => {
    setEdges(eds => {
      return eds.filter(edge => {
        const changeForEdge = changes.find((change: any) => change.id === edge.id && change.type === 'remove');
        return !changeForEdge;
      });
    });
  }, []);
  
  // Обработчик подключения узлов
  const onConnect = useCallback((params: any) => {
    setEdges(eds => {
      const newEdge = {
        ...params,
        id: `edge-${Date.now()}`,
        animated: true,
        style: { stroke: '#4B5563', strokeWidth: 2 }
      };
      return [...eds, newEdge];
    });
  }, []);
  
  // Обработчик выбора узла
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node<NodeData>) => {
    setSelectedNode(node);
  }, []);
  
  // Обработчик обновления данных узла
  const onUpdateNodeData = useCallback((nodeId: string, data: any) => {
    setNodes(nds => 
      nds.map(node => 
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      )
    );
    
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode(prev => prev ? { ...prev, data: { ...prev.data, ...data } } : null);
    }
  }, [selectedNode]);
  
  // Обработчик сохранения цепочки
  const handleSave = async () => {
    try {
      await updateChainMutation.mutateAsync({
        name: chainName,
        graph_json: { nodes, edges }
      });
    } catch (error) {
      // Ошибка уже обрабатывается в onError мутации
    }
  };
  
  // Обработчик отмены действия (undo)
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);
  
  // Обработчик повтора действия (redo)
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);
  
  // Обработчик запуска цепочки
  const handleStartChain = useCallback(() => {
    if (wsStatus !== 'connected') {
      toast({
        title: 'Ошибка',
        description: 'WebSocket не подключен',
        variant: 'destructive',
      });
      return;
    }
    
    if (!id) {
      toast({
        title: 'Ошибка',
        description: 'Сначала сохраните цепочку',
        variant: 'destructive',
      });
      return;
    }
    
    // Очищаем предыдущие логи
    setLogs([`[${new Date().toLocaleTimeString()}] [INFO] Запуск цепочки...`]);
    
    // Отправляем команду запуска через WebSocket
    sendEditorCommand('start_chain', parseInt(id));
    setIsRunning(true);
  }, [id, wsStatus, sendEditorCommand, toast]);
  
  // Обработчик остановки цепочки
  const handleStopChain = useCallback(() => {
    if (!id) return;
    
    // Добавляем лог
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [INFO] Остановка цепочки...`]);
    
    // Отправляем команду остановки через WebSocket
    sendEditorCommand('stop_chain', parseInt(id));
    setIsRunning(false);
  }, [id, sendEditorCommand]);
  
  // Обработчик добавления начального узла
  const addStartNode = useCallback(() => {
    // Проверяем, есть ли уже узел "Старт"
    const hasStartNode = nodes.some(node => node.type === 'start');
    
    if (!hasStartNode) {
      const position: XYPosition = { x: 100, y: 100 };
      
      if (reactFlowInstance) {
        // Центрируем узел в текущей области просмотра
        const center = reactFlowInstance.project({
          x: window.innerWidth / 2 - 100,
          y: window.innerHeight / 2 - 100
        });
        position.x = center.x;
        position.y = center.y;
      }
      
      const startNode: Node<NodeData> = {
        id: `start-${Date.now()}`,
        type: 'start',
        position,
        data: { label: 'Начало цепочки', description: '' }
      };
      
      setNodes(nds => [...nds, startNode]);
    } else {
      toast({
        title: 'Узел "Старт" уже существует',
        description: 'В диалоговой цепочке может быть только один начальный узел',
      });
    }
  }, [nodes, reactFlowInstance, toast]);
  
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-900 text-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h3 className="text-xl font-medium">Загрузка редактора...</h3>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-900 text-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold mb-4 text-red-500">Ошибка загрузки</h3>
            <p className="text-gray-300 mb-6">Не удалось загрузить данные диалоговой цепочки. Возможно, она была удалена или у вас нет доступа.</p>
            <Button onClick={() => navigate('/')} className="flex items-center">
              <ArrowLeftCircle className="mr-2 h-4 w-4" />
              <span>Вернуться на главную</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      <Navbar />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        
        <div className="flex-1 flex flex-col bg-gray-900 overflow-hidden">
          <EditorToolbar 
            chain={chain || null}
            onNameChange={setChainName}
            onSave={handleSave}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            isRunning={isRunning}
            onStartChain={handleStartChain}
            onStopChain={handleStopChain}
          />
          
          <NodeCanvas 
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onSaveNodes={(nodes, edges) => {
              // Автосохранение после структурных изменений
              if (chain) {
                updateChainMutation.mutateAsync({
                  graph_json: { nodes, edges }
                });
              }
            }}
          />
          
          <NodePalette />
          
          {wsStatus === 'connected' ? (
            <div className="fixed top-16 right-4 flex items-center bg-gray-800 text-xs rounded-full shadow px-3 py-1.5 border border-gray-700">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 mr-2"></span>
              <span className="text-gray-300">WebSocket подключен</span>
            </div>
          ) : (
            <div className="fixed top-16 right-4 flex items-center bg-gray-800 text-xs rounded-full shadow px-3 py-1.5 border border-gray-700">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 mr-2"></span>
              <span className="text-gray-300">WebSocket отключен</span>
            </div>
          )}
        </div>
        
        <RightSidebar 
          selectedNode={selectedNode}
          onNodeUpdate={onUpdateNodeData}
          logs={logs}
        />
      </div>
    </div>
  );
}
