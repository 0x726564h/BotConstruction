import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NodeProperties } from "@/components/editor/node-properties";
import { LogPanel } from "@/components/editor/log-panel";
import { NodeData } from "@shared/schema";

interface RightSidebarProps {
  selectedNode: NodeData | null;
  onNodeUpdate: (nodeId: string, data: any) => void;
  logs: string[];
}

export function RightSidebar({ selectedNode, onNodeUpdate, logs = [] }: RightSidebarProps) {
  const [activeTab, setActiveTab] = useState<string>("properties");
  
  const handleApplyChanges = () => {
    if (!selectedNode) return;
    
    // Обновление узла происходит в NodeProperties
  };
  
  const handleTestNode = () => {
    if (!selectedNode) return;
    
    // Логика тестирования узла
    logs.push(`Тестирование узла "${selectedNode.data.label}" (${selectedNode.id})`);
  };
  
  return (
    <div className="w-80 border-l border-gray-800 bg-gray-900 flex flex-col">
      {/* Табы */}
      <Tabs defaultValue="properties" value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b border-gray-800">
          <TabsList className="w-full grid grid-cols-2 bg-transparent h-auto">
            <TabsTrigger 
              value="properties" 
              className={`py-3 text-center ${
                activeTab === "properties" 
                  ? "text-white border-b-2 border-primary-500 font-medium" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Свойства
            </TabsTrigger>
            <TabsTrigger 
              value="logs" 
              className={`py-3 text-center ${
                activeTab === "logs" 
                  ? "text-white border-b-2 border-primary-500 font-medium" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Логи
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="properties" className="flex-1 overflow-y-auto p-0 m-0">
          {selectedNode ? (
            <NodeProperties 
              node={selectedNode} 
              onUpdateNodeData={(data) => onNodeUpdate(selectedNode.id, data)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-500">
              <p>Выберите узел для просмотра свойств</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="logs" className="flex-1 overflow-y-auto p-0 m-0">
          <LogPanel logs={logs} />
        </TabsContent>
      </Tabs>
      
      {/* Кнопки действий */}
      {activeTab === "properties" && selectedNode && (
        <div className="p-4 border-t border-gray-800">
          <button 
            className="w-full bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded mb-2"
            onClick={handleApplyChanges}
          >
            Применить изменения
          </button>
          <button 
            className="w-full bg-transparent text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 px-4 py-2 rounded"
            onClick={handleTestNode}
          >
            Тестировать узел
          </button>
        </div>
      )}
    </div>
  );
}
