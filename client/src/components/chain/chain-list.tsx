import { useQuery, useMutation } from '@tanstack/react-query';
import { DialogueChain } from '@shared/schema';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Edit, Plus, Play, PauseCircle, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';

export function ChainList() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { sendEditorCommand, status: wsStatus } = useWebSocket();
  const [selectedChain, setSelectedChain] = useState<DialogueChain | null>(null);
  const [newChainName, setNewChainName] = useState('');
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState('');
  
  // Запрос списка цепочек
  const { data: chains, isLoading } = useQuery<DialogueChain[]>({
    queryKey: ['/api/chains'],
  });
  
  // Мутация для создания новой цепочки
  const createChainMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest('POST', '/api/chains', {
        name,
        graph_json: { nodes: [], edges: [] }
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Цепочка создана',
        description: 'Новая диалоговая цепочка успешно создана',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/chains'] });
      navigate(`/editor/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось создать цепочку',
        variant: 'destructive',
      });
    },
  });
  
  // Мутация для удаления цепочки
  const deleteChainMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/chains/${id}`);
    },
    onSuccess: () => {
      toast({
        title: 'Цепочка удалена',
        description: 'Диалоговая цепочка успешно удалена',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/chains'] });
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось удалить цепочку',
        variant: 'destructive',
      });
    },
  });
  
  // Мутация для импорта цепочки
  const importChainMutation = useMutation({
    mutationFn: async (data: string) => {
      try {
        const parsed = JSON.parse(data);
        const res = await apiRequest('POST', '/api/chains', {
          name: parsed.name || 'Импортированная цепочка',
          graph_json: parsed.graph_json || parsed
        });
        return res.json();
      } catch (error) {
        throw new Error('Неверный формат данных');
      }
    },
    onSuccess: (data) => {
      toast({
        title: 'Цепочка импортирована',
        description: 'Диалоговая цепочка успешно импортирована',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/chains'] });
      setIsImportDialogOpen(false);
      setImportData('');
      navigate(`/editor/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: 'Ошибка импорта',
        description: error instanceof Error ? error.message : 'Не удалось импортировать цепочку',
        variant: 'destructive',
      });
    }
  });
  
  // Обработчик создания новой цепочки
  const handleCreateChain = () => {
    if (!newChainName.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите название цепочки',
        variant: 'destructive',
      });
      return;
    }
    
    createChainMutation.mutate(newChainName.trim());
    setNewChainName('');
  };
  
  // Обработчик удаления цепочки
  const handleDeleteChain = (chain: DialogueChain) => {
    setSelectedChain(chain);
  };
  
  // Обработчик подтверждения удаления
  const confirmDeleteChain = () => {
    if (selectedChain) {
      deleteChainMutation.mutate(selectedChain.id);
      setSelectedChain(null);
    }
  };
  
  // Обработчик редактирования цепочки
  const handleEditChain = (chain: DialogueChain) => {
    navigate(`/editor/${chain.id}`);
  };
  
  // Обработчик запуска/остановки цепочки
  const handleToggleChainStatus = (chain: DialogueChain) => {
    if (wsStatus !== 'connected') {
      toast({
        title: 'Ошибка',
        description: 'WebSocket не подключен',
        variant: 'destructive',
      });
      return;
    }
    
    if (chain.is_active) {
      // Останавливаем цепочку
      sendEditorCommand('stop_chain', chain.id);
      toast({
        title: 'Цепочка остановлена',
        description: `Остановка выполнения "${chain.name}"`,
      });
    } else {
      // Запускаем цепочку
      sendEditorCommand('start_chain', chain.id);
      toast({
        title: 'Цепочка запущена',
        description: `Запуск выполнения "${chain.name}"`,
      });
    }
  };
  
  // Обработчик экспорта цепочки
  const handleExport = (chain: DialogueChain) => {
    setSelectedChain(chain);
    setIsExportDialogOpen(true);
  };
  
  // Функция для экспорта цепочки в файл
  const exportChain = () => {
    if (!selectedChain) return;
    
    try {
      const exportData = JSON.stringify(selectedChain, null, 2);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `chain-${selectedChain.name.toLowerCase().replace(/\s+/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      setIsExportDialogOpen(false);
      setSelectedChain(null);
      
      toast({
        title: 'Цепочка экспортирована',
        description: 'Файл успешно скачан',
      });
    } catch (error) {
      toast({
        title: 'Ошибка экспорта',
        description: 'Не удалось экспортировать цепочку',
        variant: 'destructive',
      });
    }
  };
  
  // Обработчик импорта цепочки
  const handleImport = () => {
    try {
      importChainMutation.mutate(importData);
    } catch (error) {
      toast({
        title: 'Ошибка импорта',
        description: 'Неверный формат данных',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Диалоговые цепочки</h2>
        
        <div className="flex space-x-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center">
                <Plus className="mr-2 h-4 w-4" />
                <span>Создать</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700">
              <DialogHeader>
                <DialogTitle>Создать новую цепочку</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="chain-name">Название цепочки</Label>
                <Input 
                  id="chain-name" 
                  value={newChainName}
                  onChange={(e) => setNewChainName(e.target.value)}
                  placeholder="Введите название цепочки"
                  className="bg-gray-800 border-gray-700 mt-2"
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Отмена</Button>
                </DialogClose>
                <Button onClick={handleCreateChain}>Создать</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center">
                <Download className="mr-2 h-4 w-4" />
                <span>Импорт</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700">
              <DialogHeader>
                <DialogTitle>Импорт цепочки</DialogTitle>
                <DialogDescription>
                  Вставьте JSON данные экспортированной цепочки
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="import-data">JSON данные</Label>
                <textarea 
                  id="import-data" 
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder='{"name":"Название цепочки","graph_json":{"nodes":[],"edges":[]}}'
                  className="w-full h-[200px] mt-2 p-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Отмена</Button>
                </DialogClose>
                <Button onClick={handleImport} disabled={!importData.trim()}>Импортировать</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : chains && chains.length > 0 ? (
        <ScrollArea className="h-[calc(100vh-240px)] pr-4">
          <div className="space-y-2">
            {chains.map((chain) => (
              <div 
                key={chain.id} 
                className="bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <h3 className="text-lg font-medium">{chain.name}</h3>
                    <div className={`ml-3 px-2 py-0.5 text-xs rounded-full ${
                      chain.is_active 
                        ? 'bg-green-900 text-green-300' 
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {chain.is_active ? 'Активна' : 'Неактивна'}
                    </div>
                  </div>
                  
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleChainStatus(chain)}
                      className={`text-gray-400 hover:text-white ${
                        chain.is_active ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'
                      }`}
                    >
                      {chain.is_active ? (
                        <PauseCircle className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleExport(chain)}
                      className="text-gray-400 hover:text-white"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditChain(chain)}
                      className="text-gray-400 hover:text-white"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteChain(chain)}
                      className="text-gray-400 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="text-sm text-gray-400">
                  Версия: {chain.version} | Создана: {new Date(chain.created_at).toLocaleDateString()}
                </div>
                
                {chain.session_id && (
                  <div className="text-xs text-gray-500 mt-1">
                    Привязана к сессии ID: {chain.session_id}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex flex-col items-center justify-center h-32 bg-gray-800 rounded-lg border border-gray-700 p-4">
          <p className="text-gray-400 mb-3">У вас еще нет диалоговых цепочек</p>
          <Button 
            onClick={() => {
              setNewChainName('Новая цепочка');
              document.getElementById('create-chain-dialog-trigger')?.click();
            }}
          >
            Создать первую цепочку
          </Button>
        </div>
      )}
      
      {/* Диалог подтверждения удаления */}
      <Dialog open={!!selectedChain && !isExportDialogOpen} onOpenChange={(open) => !open && setSelectedChain(null)}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle>Удалить цепочку</DialogTitle>
          </DialogHeader>
          <p>
            Вы уверены, что хотите удалить цепочку "{selectedChain?.name}"? 
            Это действие невозможно отменить.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Отмена</Button>
            </DialogClose>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteChain}
            >
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Диалог экспорта */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle>Экспорт цепочки</DialogTitle>
          </DialogHeader>
          <p>
            Экспортировать цепочку "{selectedChain?.name}" в JSON файл?
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Отмена</Button>
            </DialogClose>
            <Button onClick={exportChain}>Экспортировать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
