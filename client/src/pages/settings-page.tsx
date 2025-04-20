import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { User, BotSession } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { connectSession, disconnectSession } from "@/lib/telegram-api";
import { useWebSocket } from "@/hooks/use-websocket";
import { LogOut, UserIcon, Trash2, Plus, Power, PowerOff, RefreshCw, Shield, Settings, Key, QrCode, Smartphone } from "lucide-react";
import { QRLogin } from "@/components/session/qr-login";
import { ConnectionSettings } from "@/components/session/connection-settings";
import { TelegramConnectionSettings, TelegramDeviceSettings } from "@shared/schema";

interface SessionFormData {
  name: string;
  api_id: string;
  api_hash: string;
  phone: string;
  session_string: string;
}

export default function SettingsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const searchParams = new URLSearchParams(window.location.search);
  const tabFromUrl = searchParams.get("tab");
  const { user, logoutMutation } = useAuth();
  const { status: wsStatus } = useWebSocket();
  
  const [activeTab, setActiveTab] = useState<string>(tabFromUrl || "profile");
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<BotSession | null>(null);
  const [sessionFormData, setSessionFormData] = useState<SessionFormData>({
    name: "",
    api_id: "",
    api_hash: "",
    phone: "",
    session_string: "",
  });
  const [loginMethod, setLoginMethod] = useState<"phone" | "qr">("phone");
  const [tempSessionId, setTempSessionId] = useState<number>(0);
  const [connectionSettings, setConnectionSettings] = useState<TelegramConnectionSettings | undefined>();
  const [deviceSettings, setDeviceSettings] = useState<TelegramDeviceSettings | undefined>();
  
  // Обновление URL при смене вкладки
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", activeTab);
    window.history.replaceState({}, "", url.toString());
  }, [activeTab]);
  
  // Загрузка списка сессий
  const { data: sessions, isLoading: loadingSessions, refetch: refetchSessions } = useQuery<BotSession[]>({
    queryKey: ['/api/sessions'],
  });
  
  // Мутация для создания сессии
  const createSessionMutation = useMutation({
    mutationFn: async (data: SessionFormData) => {
      const sessionData = {
        ...data,
        connection_settings: connectionSettings,
        device_settings: deviceSettings
      };
      
      const res = await apiRequest('POST', '/api/sessions', sessionData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Сессия создана',
        description: 'Новая сессия Telegram успешно добавлена',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      setIsCreatingSession(false);
      resetSessionForm();
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось создать сессию',
        variant: 'destructive',
      });
    },
  });
  
  // Мутация для удаления сессии
  const deleteSessionMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/sessions/${id}`);
    },
    onSuccess: () => {
      toast({
        title: 'Сессия удалена',
        description: 'Сессия Telegram успешно удалена',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      setSessionToDelete(null);
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось удалить сессию',
        variant: 'destructive',
      });
    },
  });
  
  // Мутация для подключения сессии
  const connectSessionMutation = useMutation({
    mutationFn: (id: number) => connectSession(id),
    onSuccess: () => {
      toast({
        title: 'Сессия подключена',
        description: 'Telegram сессия успешно активирована',
      });
      refetchSessions();
    },
    onError: (error) => {
      toast({
        title: 'Ошибка подключения',
        description: error instanceof Error ? error.message : 'Не удалось подключить сессию',
        variant: 'destructive',
      });
    },
  });
  
  // Мутация для отключения сессии
  const disconnectSessionMutation = useMutation({
    mutationFn: (id: number) => disconnectSession(id),
    onSuccess: () => {
      toast({
        title: 'Сессия отключена',
        description: 'Telegram сессия успешно деактивирована',
      });
      refetchSessions();
    },
    onError: (error) => {
      toast({
        title: 'Ошибка отключения',
        description: error instanceof Error ? error.message : 'Не удалось отключить сессию',
        variant: 'destructive',
      });
    },
  });
  
  // Обработчик выхода из системы
  const handleLogout = () => {
    logoutMutation.mutate();
    navigate("/auth");
  };
  
  // Обработчик изменения формы сессии
  const handleSessionFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSessionFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Обработчик изменения настроек подключения
  const handleSettingsChange = (settings: {
    api_id: string;
    api_hash: string;
    connection_settings: TelegramConnectionSettings;
    device_settings: TelegramDeviceSettings;
  }) => {
    setSessionFormData(prev => ({
      ...prev,
      api_id: settings.api_id,
      api_hash: settings.api_hash,
    }));
    setConnectionSettings(settings.connection_settings);
    setDeviceSettings(settings.device_settings);
  };
  
  // Сброс формы сессии
  const resetSessionForm = () => {
    setSessionFormData({
      name: "",
      api_id: "",
      api_hash: "",
      phone: "",
      session_string: "",
    });
    setLoginMethod("phone");
    setConnectionSettings(undefined);
    setDeviceSettings(undefined);
  };
  
  // Обработчик отправки формы сессии
  const handleSubmitSessionForm = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Проверка обязательных полей
    if (!sessionFormData.name || !sessionFormData.api_id || !sessionFormData.api_hash || !sessionFormData.session_string) {
      toast({
        title: 'Заполните обязательные поля',
        description: 'Название, API ID, API Hash и строка сессии обязательны для заполнения',
        variant: 'destructive',
      });
      return;
    }
    
    createSessionMutation.mutate(sessionFormData);
  };
  
  // Обработчик подключения/отключения сессии
  const handleToggleSession = (session: BotSession) => {
    if (session.status === 'active') {
      disconnectSessionMutation.mutate(session.id);
    } else {
      connectSessionMutation.mutate(session.id);
    }
  };
  
  // Обработчик удаления сессии
  const handleDeleteSession = () => {
    if (sessionToDelete) {
      deleteSessionMutation.mutate(sessionToDelete.id);
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      <Navbar />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        
        <div className="flex-1 overflow-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Настройки</h1>
            <p className="text-gray-400">Управление аккаунтом, сессиями Telegram и параметрами системы</p>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-gray-800 border-gray-700">
              <TabsTrigger value="profile" className="data-[state=active]:bg-gray-700">
                <UserIcon className="h-4 w-4 mr-2" />
                <span>Профиль</span>
              </TabsTrigger>
              <TabsTrigger value="sessions" className="data-[state=active]:bg-gray-700">
                <Shield className="h-4 w-4 mr-2" />
                <span>Сессии Telegram</span>
              </TabsTrigger>
              <TabsTrigger value="system" className="data-[state=active]:bg-gray-700">
                <Settings className="h-4 w-4 mr-2" />
                <span>Система</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="data-[state=active]:bg-gray-700">
                <Key className="h-4 w-4 mr-2" />
                <span>Безопасность</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile" className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle>Информация о профиле</CardTitle>
                      <CardDescription className="text-gray-400">
                        Основные данные вашего аккаунта
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col items-center">
                        <div className="h-24 w-24 rounded-full bg-gray-700 flex items-center justify-center text-3xl font-bold text-gray-300 mb-4">
                          {user?.username?.charAt(0).toUpperCase()}
                        </div>
                        <h2 className="text-lg font-medium">{user?.username}</h2>
                        <p className="text-gray-400">{user?.email}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Регистрация: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
                        </p>
                        
                        <Button 
                          variant="outline" 
                          className="mt-6 w-full text-red-400 hover:text-red-300 border-gray-700 hover:bg-red-900/20"
                          onClick={handleLogout}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          <span>Выйти из аккаунта</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="md:col-span-2">
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle>Параметры аккаунта</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form className="space-y-6">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="username">Имя пользователя</Label>
                            <Input 
                              id="username" 
                              value={user?.username || ""} 
                              className="bg-gray-700 border-gray-600 mt-1"
                              disabled
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Имя пользователя не может быть изменено
                            </p>
                          </div>
                          
                          <div>
                            <Label htmlFor="email">Email</Label>
                            <Input 
                              id="email" 
                              value={user?.email || ""} 
                              className="bg-gray-700 border-gray-600 mt-1"
                              disabled
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="new_password">Новый пароль</Label>
                            <Input 
                              id="new_password" 
                              type="password" 
                              className="bg-gray-700 border-gray-600 mt-1"
                              placeholder="••••••••"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="confirm_password">Подтверждение пароля</Label>
                            <Input 
                              id="confirm_password" 
                              type="password" 
                              className="bg-gray-700 border-gray-600 mt-1"
                              placeholder="••••••••"
                            />
                          </div>
                        </div>
                        
                        <Button type="submit" disabled>
                          Сохранить изменения
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="sessions" className="pt-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Сессии Telegram</CardTitle>
                    <CardDescription className="text-gray-400">
                      Управление сессиями для работы с Telegram API
                    </CardDescription>
                  </div>
                  
                  <Dialog open={isCreatingSession} onOpenChange={setIsCreatingSession}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center">
                        <Plus className="mr-2 h-4 w-4" />
                        <span>Добавить сессию</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-900 border-gray-700">
                      <DialogHeader>
                        <DialogTitle>Добавить сессию Telegram</DialogTitle>
                        <DialogDescription className="text-gray-400">
                          Добавьте сессию Telegram для работы с UserBot
                        </DialogDescription>
                      </DialogHeader>
                      
                      <Tabs value={loginMethod} onValueChange={(value) => setLoginMethod(value as "phone" | "qr")}>
                        <TabsList className="grid w-full grid-cols-2 bg-gray-700">
                          <TabsTrigger value="phone" className="data-[state=active]:bg-gray-600">
                            <Smartphone className="h-4 w-4 mr-2" />
                            <span>По телефону</span>
                          </TabsTrigger>
                          <TabsTrigger value="qr" className="data-[state=active]:bg-gray-600">
                            <QrCode className="h-4 w-4 mr-2" />
                            <span>QR-код</span>
                          </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="phone">
                          <form onSubmit={handleSubmitSessionForm}>
                            <div className="grid gap-4 py-4">
                              <div>
                                <Label htmlFor="name">Название сессии *</Label>
                                <Input
                                  id="name"
                                  name="name"
                                  value={sessionFormData.name}
                                  onChange={handleSessionFormChange}
                                  className="bg-gray-800 border-gray-700 mt-1"
                                  placeholder="Например: Основной бот"
                                  required
                                />
                              </div>
                              
                              {/* Компонент настроек подключения */}
                              <div className="mt-2">
                                <ConnectionSettings
                                  defaultApiId={sessionFormData.api_id}
                                  defaultApiHash={sessionFormData.api_hash}
                                  defaultConnectionSettings={connectionSettings}
                                  defaultDeviceSettings={deviceSettings}
                                  onSettingsChange={handleSettingsChange}
                                />
                              </div>
                              
                              <div>
                                <Label htmlFor="phone">Номер телефона</Label>
                                <Input
                                  id="phone"
                                  name="phone"
                                  value={sessionFormData.phone}
                                  onChange={handleSessionFormChange}
                                  className="bg-gray-800 border-gray-700 mt-1"
                                  placeholder="+79123456789"
                                />
                              </div>
                              
                              <div>
                                <Label htmlFor="session_string">Строка сессии Telethon *</Label>
                                <Input
                                  id="session_string"
                                  name="session_string"
                                  value={sessionFormData.session_string}
                                  onChange={handleSessionFormChange}
                                  className="bg-gray-800 border-gray-700 mt-1"
                                  placeholder="1BAAomTQ5..."
                                  required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Строку сессии можно получить с помощью скрипта <code>telethon_string_session.py</code>
                                </p>
                              </div>
                            </div>
                            
                            <DialogFooter>
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => {
                                  resetSessionForm();
                                  setIsCreatingSession(false);
                                }}
                              >
                                Отмена
                              </Button>
                              <Button type="submit" disabled={createSessionMutation.isPending}>
                                {createSessionMutation.isPending ? 'Добавление...' : 'Добавить сессию'}
                              </Button>
                            </DialogFooter>
                          </form>
                        </TabsContent>
                        
                        <TabsContent value="qr">
                          <div className="py-4">
                            <div className="space-y-4 mb-4">
                              <div>
                                <Label htmlFor="qr_name">Название сессии *</Label>
                                <Input
                                  id="qr_name"
                                  name="name"
                                  value={sessionFormData.name}
                                  onChange={handleSessionFormChange}
                                  className="bg-gray-800 border-gray-700 mt-1"
                                  placeholder="Например: Основной бот"
                                  required
                                />
                              </div>
                              
                              {/* Компонент настроек подключения для QR */}
                              <div className="mt-2">
                                <ConnectionSettings
                                  defaultApiId={sessionFormData.api_id}
                                  defaultApiHash={sessionFormData.api_hash}
                                  defaultConnectionSettings={connectionSettings}
                                  defaultDeviceSettings={deviceSettings}
                                  onSettingsChange={handleSettingsChange}
                                />
                              </div>
                            </div>
                            
                            {sessionFormData.name && sessionFormData.api_id && sessionFormData.api_hash ? (
                              <QRLogin
                                sessionId={tempSessionId || Date.now()}
                                apiId={sessionFormData.api_id}
                                apiHash={sessionFormData.api_hash}
                                connectionSettings={connectionSettings}
                                deviceSettings={deviceSettings}
                                onSessionStringReceived={(sessionString) => {
                                  setSessionFormData(prev => ({ ...prev, session_string: sessionString }));
                                  createSessionMutation.mutate({
                                    ...sessionFormData,
                                    session_string: sessionString
                                  });
                                }}
                                onError={(error) => {
                                  toast({
                                    title: 'Ошибка QR-авторизации',
                                    description: error,
                                    variant: 'destructive',
                                  });
                                }}
                              />
                            ) : (
                              <div className="text-center py-6 text-gray-400">
                                <QrCode className="h-10 w-10 mx-auto mb-2 text-gray-500" />
                                <p>Пожалуйста, введите название, API ID и API Hash, чтобы сгенерировать QR-код для входа</p>
                              </div>
                            )}
                            
                            <DialogFooter className="mt-4">
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => {
                                  resetSessionForm();
                                  setIsCreatingSession(false);
                                }}
                              >
                                Отмена
                              </Button>
                            </DialogFooter>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {loadingSessions ? (
                    <div className="flex justify-center py-8">
                      <RefreshCw className="animate-spin h-8 w-8 text-gray-500" />
                    </div>
                  ) : sessions && sessions.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Название</TableHead>
                          <TableHead>API ID</TableHead>
                          <TableHead>Номер телефона</TableHead>
                          <TableHead>Статус</TableHead>
                          <TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sessions.map(session => (
                          <TableRow key={session.id} className="hover:bg-gray-700/50">
                            <TableCell className="font-medium">{session.name}</TableCell>
                            <TableCell>{session.api_id}</TableCell>
                            <TableCell>{session.phone || "—"}</TableCell>
                            <TableCell>
                              <div className={`flex items-center px-2 py-1 rounded-full text-xs max-w-fit ${
                                session.status === 'active' 
                                  ? 'bg-green-900/30 text-green-400 border border-green-800'
                                  : 'bg-gray-800 text-gray-400 border border-gray-700'
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                                  session.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
                                }`}></span>
                                <span>{session.status === 'active' ? 'Активна' : 'Неактивна'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleToggleSession(session)}
                                  className={session.status === 'active' ? 'text-green-500' : 'text-gray-400'}
                                  disabled={wsStatus !== 'connected'}
                                >
                                  {session.status === 'active' ? (
                                    <PowerOff className="h-4 w-4" />
                                  ) : (
                                    <Power className="h-4 w-4" />
                                  )}
                                </Button>
                                
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => setSessionToDelete(session)}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Shield className="h-12 w-12 text-gray-500 mb-3" />
                      <h3 className="text-lg font-medium text-gray-300 mb-1">Нет сессий Telegram</h3>
                      <p className="text-sm text-gray-500 mb-4 max-w-md">
                        Для начала работы с ботом добавьте хотя бы одну сессию. Вам понадобятся API ID, API Hash и строка сессии от Telegram.
                      </p>
                      <Button 
                        onClick={() => setIsCreatingSession(true)}
                        className="flex items-center"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        <span>Добавить первую сессию</span>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="system" className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle>Состояние системы</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-900 p-4 rounded-md">
                        <div className="text-sm text-gray-400 mb-1">WebSocket</div>
                        <div className={`text-lg font-medium flex items-center ${
                          wsStatus === 'connected' ? 'text-green-400' :
                          wsStatus === 'connecting' ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          <span className={`h-2 w-2 rounded-full mr-2 ${
                            wsStatus === 'connected' ? 'bg-green-500' :
                            wsStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}></span>
                          <span>
                            {wsStatus === 'connected' ? 'Подключено' :
                             wsStatus === 'connecting' ? 'Подключение...' : 'Отключено'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="bg-gray-900 p-4 rounded-md">
                        <div className="text-sm text-gray-400 mb-1">Сессии Telegram</div>
                        <div className="text-lg font-medium">
                          {loadingSessions ? (
                            <span className="text-gray-500">Загрузка...</span>
                          ) : (
                            <>
                              <span className="text-green-400">{sessions?.filter(s => s.status === 'active').length || 0}</span>
                              <span className="text-gray-500"> / </span>
                              <span>{sessions?.length || 0}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-400 mb-2">Сессии подключены:</div>
                      <div className="flex flex-wrap gap-2">
                        {loadingSessions ? (
                          <div className="text-gray-500">Загрузка...</div>
                        ) : sessions?.some(s => s.status === 'active') ? (
                          sessions
                            .filter(s => s.status === 'active')
                            .map(session => (
                              <div 
                                key={session.id}
                                className="px-3 py-1 bg-gray-700 rounded-full text-sm flex items-center"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5"></span>
                                <span>{session.name}</span>
                              </div>
                            ))
                        ) : (
                          <div className="text-gray-500">Нет активных сессий</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle>Параметры системы</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="logs_level">Уровень логирования</Label>
                      <select 
                        id="logs_level" 
                        className="w-full bg-gray-700 border-gray-600 rounded-md mt-1 p-2"
                        disabled
                      >
                        <option value="info">Информационный (INFO)</option>
                        <option value="debug">Отладочный (DEBUG)</option>
                        <option value="warning">Предупреждения (WARNING)</option>
                        <option value="error">Только ошибки (ERROR)</option>
                      </select>
                    </div>
                    
                    <div>
                      <Label htmlFor="workflow_mode">Режим работы</Label>
                      <select 
                        id="workflow_mode" 
                        className="w-full bg-gray-700 border-gray-600 rounded-md mt-1 p-2"
                        disabled
                      >
                        <option value="development">Разработка</option>
                        <option value="production">Продакшн</option>
                      </select>
                    </div>
                    
                    <Button disabled>
                      Сохранить настройки
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="security" className="pt-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle>Настройки безопасности</CardTitle>
                  <CardDescription className="text-gray-400">
                    Настройки доступа и авторизации
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Двухфакторная аутентификация</h3>
                    
                    <div className="flex items-center justify-between bg-gray-700 p-4 rounded-md">
                      <div>
                        <p className="text-gray-300">Статус 2FA</p>
                        <p className="text-sm text-gray-400">Двухфакторная аутентификация отключена</p>
                      </div>
                      <Button variant="outline" disabled>
                        Включить 2FA
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Сеансы доступа</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between bg-gray-700 p-4 rounded-md">
                        <div>
                          <p className="text-gray-300">Текущий сеанс</p>
                          <p className="text-sm text-gray-400">
                            Браузер: {navigator.userAgent.split(' ').slice(-2, -1).join(' ')}
                          </p>
                          <p className="text-xs text-gray-500">
                            Последняя активность: {new Date().toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center text-green-400">
                          <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                          <span>Активен</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Диалог подтверждения удаления сессии */}
      <Dialog open={sessionToDelete !== null} onOpenChange={(open) => !open && setSessionToDelete(null)}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle>Удаление сессии Telegram</DialogTitle>
            <DialogDescription className="text-gray-400">
              Вы действительно хотите удалить сессию "{sessionToDelete?.name}"?
            </DialogDescription>
          </DialogHeader>
          
          <p className="text-gray-300 py-2">
            Это действие нельзя будет отменить. Сессия будет полностью удалена из системы.
          </p>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setSessionToDelete(null)}
            >
              Отмена
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteSession}
              disabled={deleteSessionMutation.isPending}
            >
              {deleteSessionMutation.isPending ? 'Удаление...' : 'Удалить сессию'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}