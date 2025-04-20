import { Button } from "@/components/ui/button";
import { useReactFlow } from "reactflow";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { NodeType } from "@shared/schema";

interface NodeTypeInfo {
  type: NodeType;
  label: string;
  icon: JSX.Element;
  color: string;
}

export function NodePalette() {
  const reactFlowInstance = useReactFlow();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  
  const nodeTypes: NodeTypeInfo[] = [
    {
      type: "message",
      label: "Сообщение",
      icon: (
        <svg className="text-lg" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      ),
      color: "text-green-500"
    },
    {
      type: "condition",
      label: "Условие",
      icon: (
        <svg className="text-lg" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="6" y1="3" x2="6" y2="15"></line>
          <circle cx="18" cy="6" r="3"></circle>
          <circle cx="6" cy="18" r="3"></circle>
          <path d="M18 9a9 9 0 0 1-9 9"></path>
        </svg>
      ),
      color: "text-yellow-500"
    },
    {
      type: "action",
      label: "Действие",
      icon: (
        <svg className="text-lg" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 3 21 3 21 8"></polyline>
          <line x1="4" y1="20" x2="21" y2="3"></line>
          <polyline points="21 16 21 21 16 21"></polyline>
          <line x1="15" y1="15" x2="21" y2="21"></line>
          <line x1="4" y1="4" x2="9" y2="9"></line>
        </svg>
      ),
      color: "text-indigo-500"
    },
    {
      type: "delay",
      label: "Задержка",
      icon: (
        <svg className="text-lg" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      ),
      color: "text-purple-500"
    },
    {
      type: "api_request",
      label: "API запрос",
      icon: (
        <svg className="text-lg" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
      ),
      color: "text-blue-500"
    },
    {
      type: "data_collection",
      label: "Сбор данных",
      icon: (
        <svg className="text-lg" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
        </svg>
      ),
      color: "text-pink-500"
    }
  ];
  
  // Обработчик добавления узла
  const onDragStart = (event: React.DragEvent<HTMLButtonElement>, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };
  
  // Обработчик окончания перетаскивания
  const onDragEnd = () => {
    setIsDragging(false);
  };
  
  // Обработчик клика для добавления узла
  const onNodeTypeClick = (nodeType: NodeType) => {
    if (!reactFlowInstance) {
      toast({
        title: "Ошибка",
        description: "Не удалось добавить узел",
        variant: "destructive",
      });
      return;
    }
    
    // Получаем центр текущего вида
    const { x, y, zoom } = reactFlowInstance.getViewport();
    const position = reactFlowInstance.screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    
    // Создаем узел с уникальным ID
    const newNode = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType,
      position,
      data: { 
        label: nodeTypes.find(nt => nt.type === nodeType)?.label || nodeType,
        description: ""
      },
    };
    
    // Добавляем узел
    reactFlowInstance.addNodes(newNode);
    
    toast({
      title: "Успешно",
      description: `Узел "${nodeTypes.find(nt => nt.type === nodeType)?.label}" добавлен`,
    });
  };
  
  return (
    <div className="fixed left-1/2 transform -translate-x-1/2 bottom-4 bg-gray-900 rounded-lg shadow-xl border border-gray-800 p-1">
      <div className="flex items-center">
        <div className="text-sm mr-2 text-gray-400 border-r border-gray-800 pr-2">Добавить:</div>
        
        <div className="flex space-x-1">
          {nodeTypes.map((nodeType) => (
            <Button
              key={nodeType.type}
              variant="ghost"
              className="flex flex-col items-center p-2 hover:bg-gray-800 rounded"
              title={nodeType.label}
              onClick={() => onNodeTypeClick(nodeType.type)}
              draggable
              onDragStart={(e) => onDragStart(e, nodeType.type)}
              onDragEnd={onDragEnd}
            >
              <div className={`${nodeType.color} mb-1`}>
                {nodeType.icon}
              </div>
              <span className="text-xs text-gray-400">{nodeType.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
