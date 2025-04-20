import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Plugin } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2, Edit, Code, HelpCircle, TerminalSquare, RefreshCw } from "lucide-react";

interface PluginFormData {
  name: string;
  description: string;
  script: string;
}

export default function PluginsPage() {
  const { toast } = useToast();
  const [activePlugin, setActivePlugin] = useState<Plugin | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<PluginFormData>({
    name: "",
    description: "",
    script: ""
  });
  
  // Загрузка списка плагинов
  const { data: plugins, isLoading, refetch } = useQuery<Plugin[]>({
    queryKey: ['/api/plugins'],
  });
  
  // Мутация для создания плагина
  const createPluginMutation = useMutation({
    mutationFn: async (data: PluginFormData) => {
      const res = await apiRequest('POST', '/api/plugins', data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Плагин создан',
        description: 'Новый плагин успешно добавлен',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/plugins'] });
      setIsCreating(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось создать плагин',
        variant: 'destructive',
      });
    },
  });
  
  // Мутация для обновления плагина
  const updatePluginMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<PluginFormData> }) => {
      const res = await apiRequest('PUT', `/api/plugins/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Плагин обновлен',
        description: 'Плагин успешно обновлен',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/plugins'] });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось обновить плагин',
        variant: 'destructive',
      });
    },
  });
  
  // Мутация для удаления плагина
  const deletePluginMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/plugins/${id}`);
    },
    onSuccess: () => {
      toast({
        title: 'Плагин удален',
        description: 'Плагин успешно удален',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/plugins'] });
      setActivePlugin(null);
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось удалить плагин',
        variant: 'destructive',
      });
    },
  });
  
  // Мутация для переключения состояния плагина
  const togglePluginMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: number, enabled: boolean }) => {
      const res = await apiRequest('PUT', `/api/plugins/${id}`, { enabled });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.enabled ? 'Плагин активирован' : 'Плагин деактивирован',
        description: `Плагин "${data.name}" ${data.enabled ? 'включен' : 'отключен'}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/plugins'] });
      if (activePlugin && activePlugin.id === data.id) {
        setActivePlugin(data);
      }
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось изменить состояние плагина',
        variant: 'destructive',
      });
    },
  });
  
  // Обработчик изменения формы
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Сброс формы
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      script: ""
    });
  };
  
  // Открытие формы редактирования
  const openEditForm = (plugin: Plugin) => {
    setFormData({
      name: plugin.name,
      description: plugin.description || "",
      script: plugin.script
    });
    setIsEditing(true);
  };
  
  // Обработчик отправки формы
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.script) {
      toast({
        title: 'Заполните обязательные поля',
        description: 'Имя и скрипт плагина обязательны для заполнения',
        variant: 'destructive',
      });
      return;
    }
    
    if (isEditing && activePlugin) {
      updatePluginMutation.mutate({ id: activePlugin.id, data: formData });
    } else {
      createPluginMutation.mutate(formData);
    }
  };
  
  // Обработчик удаления плагина
  const handleDeletePlugin = (plugin: Plugin) => {
    deletePluginMutation.mutate(plugin.id);
  };
  
  // Обработчик переключения состояния плагина
  const handleTogglePlugin = (plugin: Plugin) => {
    togglePluginMutation.mutate({ id: plugin.id, enabled: !plugin.enabled });
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      <Navbar />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        
        <div className="flex-1 overflow-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Управление плагинами</h1>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => refetch()}
                className="flex items-center"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                <span>Обновить</span>
              </Button>
              
              <Dialog open={isCreating} onOpenChange={setIsCreating}>
                <DialogTrigger asChild>
                  <Button className="flex items-center">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span>Новый плагин</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border-gray-700 max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Создать новый плагин</DialogTitle>
                  </DialogHeader>
                  
                  <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                          Название *
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleFormChange}
                          className="col-span-3 bg-gray-800 border-gray-700"
                          placeholder="Название плагина"
                          required
                        />
                      </div>
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">
                          Описание
                        </Label>
                        <Input
                          id="description"
                          name="description"
                          value={formData.description}
                          onChange={handleFormChange}
                          className="col-span-3 bg-gray-800 border-gray-700"
                          placeholder="Краткое описание плагина"
                        />
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4">
                        <Label htmlFor="script" className="text-right pt-2">
                          Скрипт *
                        </Label>
                        <Textarea
                          id="script"
                          name="script"
                          value={formData.script}
                          onChange={handleFormChange}
                          className="col-span-3 min-h-[300px] font-mono text-sm bg-gray-800 border-gray-700"
                          placeholder="# Python код плагина"
                          required
                        />
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          resetForm();
                          setIsCreating(false);
                        }}
                      >
                        Отмена
                      </Button>
                      <Button type="submit" disabled={createPluginMutation.isPending}>
                        {createPluginMutation.isPending ? 'Создание...' : 'Создать плагин'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Список плагинов */}
            <Card className="bg-gray-800 border-gray-700 col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Code className="mr-2 h-5 w-5" />
                  <span>Доступные плагины</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-10">
                    <RefreshCw className="animate-spin h-10 w-10 text-gray-500" />
                  </div>
                ) : plugins && plugins.length > 0 ? (
                  <ScrollArea className="h-[calc(100vh-300px)]">
                    <div className="space-y-2">
                      {plugins.map(plugin => (
                        <div
                          key={plugin.id}
                          className={`p-3 rounded-md flex justify-between items-center cursor-pointer transition-colors ${
                            activePlugin?.id === plugin.id 
                              ? 'bg-primary-900/30 border border-primary-700'
                              : 'hover:bg-gray-700 border border-gray-700 hover:border-gray-600'
                          }`}
                          onClick={() => setActivePlugin(plugin)}
                        >
                          <div className="flex flex-col">
                            <div className="flex items-center">
                              <span className="font-medium">{plugin.name}</span>
                              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                                plugin.enabled 
                                  ? 'bg-green-900 text-green-300'
                                  : 'bg-gray-700 text-gray-400'
                              }`}>
                                {plugin.enabled ? 'Активен' : 'Отключен'}
                              </span>
                            </div>
                            {plugin.description && (
                              <p className="text-sm text-gray-400 mt-1 truncate max-w-xs">
                                {plugin.description}
                              </p>
                            )}
                          </div>
                          
                          <Switch
                            checked={plugin.enabled}
                            onCheckedChange={() => handleTogglePlugin(plugin)}
                            className="data-[state=checked]:bg-primary-500"
                            onClick={e => e.stopPropagation()}
                          />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Code className="h-12 w-12 text-gray-500 mb-3" />
                    <h3 className="text-lg font-medium text-gray-300 mb-1">Нет плагинов</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Создайте свой первый плагин для расширения функциональности бота
                    </p>
                    <Button onClick={() => setIsCreating(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      <span>Создать плагин</span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Детали плагина */}
            <Card className="bg-gray-800 border-gray-700 col-span-1 lg:col-span-2">
              {activePlugin ? (
                <>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{activePlugin.name}</CardTitle>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => {
                          openEditForm(activePlugin);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon" className="text-red-400 hover:text-red-300">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-gray-900 border-gray-700">
                          <DialogHeader>
                            <DialogTitle>Удалить плагин</DialogTitle>
                            <DialogDescription className="text-gray-400">
                              Вы уверены, что хотите удалить плагин "{activePlugin.name}"?
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <p className="text-red-400">
                              Это действие необратимо. Удаление плагина может привести к неработоспособности связанных с ним цепочек.
                            </p>
                          </div>
                          <DialogFooter>
                            <Button 
                              variant="outline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Отмена
                            </Button>
                            <Button 
                              variant="destructive"
                              onClick={() => handleDeletePlugin(activePlugin)}
                            >
                              Удалить
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="details">
                      <TabsList className="mb-4 bg-gray-900">
                        <TabsTrigger value="details">Детали</TabsTrigger>
                        <TabsTrigger value="code">Код</TabsTrigger>
                        <TabsTrigger value="help">Документация</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="details" className="space-y-4">
                        <div>
                          <h3 className="text-sm font-medium text-gray-400 mb-1">Статус</h3>
                          <div className="flex items-center">
                            <Switch
                              checked={activePlugin.enabled}
                              onCheckedChange={() => handleTogglePlugin(activePlugin)}
                              className="data-[state=checked]:bg-primary-500 mr-2"
                            />
                            <span>{activePlugin.enabled ? 'Активен' : 'Отключен'}</span>
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium text-gray-400 mb-1">Описание</h3>
                          <p className="text-gray-200">
                            {activePlugin.description || 'Описание отсутствует'}
                          </p>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium text-gray-400 mb-1">Создан</h3>
                          <p className="text-gray-200">
                            {new Date(activePlugin.created_at).toLocaleString()}
                          </p>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium text-gray-400 mb-1">ID плагина</h3>
                          <p className="text-gray-200">
                            {activePlugin.id}
                          </p>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="code">
                        <div className="bg-gray-900 p-4 rounded-md">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-300">Исходный код</h3>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                openEditForm(activePlugin);
                              }}
                              className="text-xs h-7 px-2"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              <span>Редактировать</span>
                            </Button>
                          </div>
                          <Separator className="mb-3" />
                          <ScrollArea className="h-[calc(100vh-450px)] w-full">
                            <pre className="font-mono text-sm text-gray-300 whitespace-pre-wrap">
                              {activePlugin.script}
                            </pre>
                          </ScrollArea>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="help">
                        <div className="bg-gray-900 p-4 rounded-md">
                          <div className="flex items-center mb-3">
                            <HelpCircle className="h-5 w-5 text-primary-400 mr-2" />
                            <h3 className="text-lg font-medium">Документация по плагинам</h3>
                          </div>
                          
                          <div className="space-y-4 text-gray-300">
                            <p>
                              Плагины расширяют функциональность бота, добавляя новые команды, обработчики событий или типы узлов для диалоговых цепочек.
                            </p>
                            
                            <div className="bg-gray-800 p-3 rounded-md border border-gray-700">
                              <h4 className="font-medium mb-2 flex items-center">
                                <TerminalSquare className="h-4 w-4 text-primary-400 mr-1.5" />
                                <span>Пример структуры плагина:</span>
                              </h4>
                              <pre className="font-mono text-xs bg-gray-900 p-3 rounded-md overflow-auto">
{`from telegram_userbot import plugin, command, hook

@plugin.info(
    name="Sample Plugin",
    description="This is a sample plugin",
    version="1.0.0"
)
class SamplePlugin:
    @command("hello")
    async def hello_command(self, message):
        """Sends hello message"""
        await message.reply("Hello from plugin!")
    
    @hook.message_received
    async def on_message(self, message):
        print(f"Received message: {message.text}")
        
    @plugin.node_type("custom_action")
    async def custom_action_node(self, context, node_data):
        # Custom node logic goes here
        return node_data.get("result_value", None)`}
                              </pre>
                            </div>
                            
                            <h4 className="font-medium mt-4">Доступные декораторы:</h4>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                              <li><code>@command("command_name")</code> - регистрирует команду бота</li>
                              <li><code>@hook.message_received</code> - вызывается при получении сообщения</li>
                              <li><code>@hook.user_joined</code> - вызывается когда пользователь присоединяется</li>
                              <li><code>@plugin.node_type("node_type_name")</code> - регистрирует тип узла для цепочек</li>
                            </ul>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <Code className="h-16 w-16 text-gray-600 mb-4" />
                  <h3 className="text-xl font-medium text-gray-400 mb-2">Выберите плагин</h3>
                  <p className="text-gray-500 max-w-md">
                    Выберите плагин из списка слева для просмотра деталей или создайте новый плагин
                  </p>
                </div>
              )}
            </Card>
          </div>
          
          {/* Диалог редактирования плагина */}
          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogContent className="bg-gray-900 border-gray-700 max-w-4xl">
              <DialogHeader>
                <DialogTitle>Редактирование плагина</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-name" className="text-right">
                      Название *
                    </Label>
                    <Input
                      id="edit-name"
                      name="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      className="col-span-3 bg-gray-800 border-gray-700"
                      placeholder="Название плагина"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-description" className="text-right">
                      Описание
                    </Label>
                    <Input
                      id="edit-description"
                      name="description"
                      value={formData.description}
                      onChange={handleFormChange}
                      className="col-span-3 bg-gray-800 border-gray-700"
                      placeholder="Краткое описание плагина"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4">
                    <Label htmlFor="edit-script" className="text-right pt-2">
                      Скрипт *
                    </Label>
                    <Textarea
                      id="edit-script"
                      name="script"
                      value={formData.script}
                      onChange={handleFormChange}
                      className="col-span-3 min-h-[300px] font-mono text-sm bg-gray-800 border-gray-700"
                      placeholder="# Python код плагина"
                      required
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      resetForm();
                      setIsEditing(false);
                    }}
                  >
                    Отмена
                  </Button>
                  <Button type="submit" disabled={updatePluginMutation.isPending}>
                    {updatePluginMutation.isPending ? 'Сохранение...' : 'Сохранить изменения'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
