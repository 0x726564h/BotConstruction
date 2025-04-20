import { useState, useEffect } from "react";
import { PlusCircle, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { BotSession, DialogueChain } from "@shared/schema";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function Sidebar() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedSession, setSelectedSession] = useState<string>("");
  
  // Получение сессий бота
  const { data: sessions, isLoading: loadingSessions } = useQuery<BotSession[]>({
    queryKey: ['/api/sessions'],
  });
  
  // Получение диалоговых цепочек
  const { data: chains, isLoading: loadingChains } = useQuery<DialogueChain[]>({
    queryKey: ['/api/chains'],
  });
  
  // Установка выбранной сессии при загрузке данных
  useEffect(() => {
    if (sessions && sessions.length > 0 && !selectedSession) {
      setSelectedSession(sessions[0].id.toString());
    }
  }, [sessions, selectedSession]);
  
  // Обработчик создания новой цепочки
  const handleCreateNewChain = async () => {
    try {
      // Создаем новую пустую цепочку
      const res = await apiRequest("POST", "/api/chains", {
        name: "Новая цепочка",
        graph_json: { nodes: [], edges: [] },
        session_id: selectedSession ? parseInt(selectedSession) : undefined
      });
      
      const newChain = await res.json();
      
      // Обновляем кэш запроса цепочек
      queryClient.invalidateQueries({ queryKey: ['/api/chains'] });
      
      // Переходим к редактированию новой цепочки
      navigate(`/editor/${newChain.id}`);
      
      toast({
        title: "Успешно",
        description: "Новая цепочка создана",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось создать новую цепочку",
        variant: "destructive",
      });
    }
  };
  
  // Обработчик импорта цепочки
  const handleImportChain = () => {
    // TODO: Реализовать импорт цепочки
    toast({
      title: "В разработке",
      description: "Функция импорта цепочки пока недоступна",
    });
  };
  
  return (
    <div className="w-64 border-r border-gray-800 bg-gray-900 flex flex-col">
      {/* Секция выбора сессии */}
      <div className="p-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-gray-400">Сессии</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-gray-400 hover:text-white"
            onClick={() => navigate("/settings")}
          >
            <PlusCircle className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="relative">
          <Select 
            value={selectedSession} 
            onValueChange={setSelectedSession}
            disabled={loadingSessions || !sessions?.length}
          >
            <SelectTrigger className="w-full bg-gray-800 text-white border-gray-700">
              <SelectValue placeholder="Выберите сессию" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 text-white border-gray-700">
              {sessions?.map((session) => (
                <SelectItem key={session.id} value={session.id.toString()}>
                  {session.name} {session.status === 'active' ? '(активна)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Секция списка цепочек */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-gray-400">Диалоговые цепочки</h2>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-gray-400 hover:text-white"
              onClick={handleCreateNewChain}
            >
              <PlusCircle className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-1">
            {loadingChains ? (
              <div className="text-sm text-gray-500 p-2">Загрузка...</div>
            ) : chains && chains.length > 0 ? (
              chains.map((chain) => (
                <Button
                  key={chain.id}
                  variant="ghost"
                  className="w-full flex items-center justify-between p-2 rounded hover:bg-gray-800 text-left"
                  onClick={() => navigate(`/editor/${chain.id}`)}
                >
                  <div className="flex items-center">
                    <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                    </svg>
                    <span className="truncate">{chain.name}</span>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    chain.is_active 
                      ? "bg-primary-800 text-primary-200" 
                      : "bg-gray-800 text-gray-400"
                  }`}>
                    {chain.is_active ? "Активна" : "Неактивна"}
                  </span>
                </Button>
              ))
            ) : (
              <div className="text-sm text-gray-500 p-2">Нет цепочек</div>
            )}
          </div>
        </div>
      </div>
      
      {/* Секция кнопок импорта и настроек */}
      <div className="p-3 border-t border-gray-800">
        <Button 
          variant="outline"
          className="w-full flex items-center justify-center text-primary-400 hover:text-primary-300 border-primary-700 mb-2"
          onClick={handleImportChain}
        >
          <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <span>Импорт цепочки</span>
        </Button>
        
        <Button 
          variant="outline"
          className="w-full flex items-center justify-center text-gray-400 hover:text-white border-gray-700"
          onClick={() => navigate("/settings")}
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Настройки сессии</span>
        </Button>
      </div>
    </div>
  );
}
