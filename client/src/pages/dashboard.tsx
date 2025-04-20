import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/navbar";
import { BotSession, DialogueChain } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SessionSelector } from "@/components/session/session-selector";
import { ChainList } from "@/components/chain/chain-list";
import { useWebSocket } from "@/hooks/use-websocket";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Info, Settings, User, Activity, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { status: wsStatus, messages, connect } = useWebSocket();
  const [activeTab, setActiveTab] = useState("chains");
  const [sessionEvents, setSessionEvents] = useState<any[]>([]);
  
  // Получение списка сессий
  const { data: sessions, isLoading: loadingSessions } = useQuery<BotSession[]>({
    queryKey: ['/api/sessions'],
  });
  
  // Получение списка цепочек
  const { data: chains, isLoading: loadingChains } = useQuery<DialogueChain[]>({
    queryKey: ['/api/chains'],
  });
  
  // Отслеживание событий от WebSocket
  useEffect(() => {
    const telegramEvents = messages.filter(msg => msg.type === 'telegram_event');
    setSessionEvents(telegramEvents);
  }, [messages]);
  
  // Подключение к WebSocket при монтировании компонента
  useEffect(() => {
    if (wsStatus === 'disconnected') {
      connect();
    }
  }, [wsStatus, connect]);
  
  // Статистика по сессиям и цепочкам
  const activeSessions = sessions?.filter(s => s.status === 'active').length || 0;
  const totalSessions = sessions?.length || 0;
  const activeChains = chains?.filter(c => c.is_active).length || 0;
  const totalChains = chains?.length || 0;
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      <Navbar />
      
      <div className="flex-1 container mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Панель управления</h1>
          <SessionSelector />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Активных сессий</p>
                  <h2 className="text-3xl font-bold mt-1">{activeSessions} / {totalSessions}</h2>
                </div>
                <div className="bg-primary-900 p-3 rounded-full">
                  <User className="h-6 w-6 text-primary-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Активных цепочек</p>
                  <h2 className="text-3xl font-bold mt-1">{activeChains} / {totalChains}</h2>
                </div>
                <div className="bg-green-900 p-3 rounded-full">
                  <svg className="h-6 w-6 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Состояние соединения</p>
                  <h2 className="text-xl font-bold mt-1">
                    {wsStatus === 'connected' ? 'Подключено' :
                     wsStatus === 'connecting' ? 'Подключение...' : 'Отключено'}
                  </h2>
                </div>
                <div className={`p-3 rounded-full ${
                  wsStatus === 'connected' ? 'bg-green-900' :
                  wsStatus === 'connecting' ? 'bg-yellow-900' : 'bg-red-900'
                }`}>
                  <Activity className={`h-6 w-6 ${
                    wsStatus === 'connected' ? 'text-green-400' :
                    wsStatus === 'connecting' ? 'text-yellow-400' : 'text-red-400'
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">События</p>
                  <h2 className="text-3xl font-bold mt-1">{sessionEvents.length}</h2>
                </div>
                <div className="bg-blue-900 p-3 rounded-full">
                  <Info className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger value="chains" className="data-[state=active]:bg-gray-700">
              Диалоговые цепочки
            </TabsTrigger>
            <TabsTrigger value="events" className="data-[state=active]:bg-gray-700">
              События
            </TabsTrigger>
            <TabsTrigger value="status" className="data-[state=active]:bg-gray-700">
              Статус системы
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="chains" className="pt-4">
            <ChainList />
          </TabsContent>
          
          <TabsContent value="events" className="pt-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>События Telegram</CardTitle>
              </CardHeader>
              <CardContent>
                {sessionEvents.length > 0 ? (
                  <div className="space-y-2">
                    {sessionEvents.map((event, index) => (
                      <div key={index} className="p-3 border border-gray-700 rounded-md bg-gray-850">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">Тип: {event.eventType}</span>
                          <span className="text-gray-400 text-sm">
                            Сессия ID: {event.sessionId}
                          </span>
                        </div>
                        <pre className="text-xs bg-gray-900 p-2 rounded overflow-auto">
                          {JSON.stringify(event.data, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 border border-dashed border-gray-700 rounded-md">
                    <Info className="h-10 w-10 text-gray-500 mb-2" />
                    <p className="text-gray-400">Нет новых событий</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="status" className="pt-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Состояние системы</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-gray-700 rounded-md">
                      <div className="flex items-center mb-3">
                        <div className="p-2 rounded-full bg-primary-900 mr-3">
                          <svg className="h-5 w-5 text-primary-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="2" y1="12" x2="22" y2="12"></line>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium">WebSocket</h3>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Статус:</span>
                          <span className={`${
                            wsStatus === 'connected' ? 'text-green-400' :
                            wsStatus === 'connecting' ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {wsStatus === 'connected' ? 'Подключено' :
                             wsStatus === 'connecting' ? 'Подключение...' : 'Отключено'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Полученные сообщения:</span>
                          <span>{messages.length}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 border border-gray-700 rounded-md">
                      <div className="flex items-center mb-3">
                        <div className="p-2 rounded-full bg-blue-900 mr-3">
                          <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="5"></circle>
                            <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"></path>
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium">Telegram</h3>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Активные сессии:</span>
                          <span>{activeSessions}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Всего сессий:</span>
                          <span>{totalSessions}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {!activeSessions && totalSessions > 0 && (
                    <div className="p-4 border border-dashed border-yellow-700 rounded-md bg-yellow-900/20 flex items-start">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-yellow-400">У вас есть сессии, но ни одна не активна</p>
                        <p className="text-sm text-yellow-500/80 mt-1">Активируйте сессию для начала работы с ботом</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2 border-yellow-700 text-yellow-400 hover:bg-yellow-900/30"
                          onClick={() => navigate('/settings?tab=sessions')}
                        >
                          <Settings className="h-4 w-4 mr-1.5" />
                          <span>Управление сессиями</span>
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {!totalSessions && (
                    <div className="p-4 border border-dashed border-red-700 rounded-md bg-red-900/20 flex items-start">
                      <AlertTriangle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-red-400">У вас нет ни одной сессии Telegram</p>
                        <p className="text-sm text-red-500/80 mt-1">Создайте хотя бы одну сессию для работы с ботом</p>
                        <Button 
                          size="sm" 
                          className="mt-2 bg-red-700 hover:bg-red-600"
                          onClick={() => navigate('/settings?tab=sessions')}
                        >
                          <Settings className="h-4 w-4 mr-1.5" />
                          <span>Создать сессию</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
