import { useState } from 'react';
import { Save, Undo, Redo, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { DialogueChain } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/hooks/use-websocket';

interface EditorToolbarProps {
  chain: DialogueChain | null;
  onNameChange: (name: string) => void;
  onSave: () => Promise<void>;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isRunning: boolean;
  onStartChain: () => void;
  onStopChain: () => void;
}

export function EditorToolbar({ 
  chain, 
  onNameChange, 
  onSave, 
  onUndo, 
  onRedo, 
  canUndo, 
  canRedo,
  isRunning,
  onStartChain,
  onStopChain
}: EditorToolbarProps) {
  const { toast } = useToast();
  const { status: wsStatus } = useWebSocket();
  const [zoomLevel, setZoomLevel] = useState('100%');
  const [isEditing, setIsEditing] = useState(false);
  const [chainName, setChainName] = useState(chain?.name || 'Новая цепочка');
  
  // Обработчик сохранения
  const handleSave = async () => {
    try {
      await onSave();
      toast({
        title: 'Успешно',
        description: 'Цепочка сохранена',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить цепочку',
        variant: 'destructive',
      });
    }
  };
  
  // Обработчик изменения имени цепочки
  const handleNameChange = (name: string) => {
    setChainName(name);
    onNameChange(name);
  };
  
  // Обработчик изменения масштаба
  const handleZoomChange = (value: string) => {
    setZoomLevel(value);
    // Здесь можно реализовать логику масштабирования через ref на ReactFlow
  };
  
  // Обработчик запуска цепочки
  const handleStartChain = () => {
    if (wsStatus !== 'connected') {
      toast({
        title: 'Ошибка',
        description: 'WebSocket не подключен',
        variant: 'destructive',
      });
      return;
    }
    
    onStartChain();
  };
  
  // Обработчик остановки цепочки
  const handleStopChain = () => {
    onStopChain();
  };
  
  return (
    <div className="h-12 border-b border-gray-800 bg-gray-900 flex items-center px-4">
      <div className="flex items-center mr-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSave}
          className="text-gray-400 hover:text-white"
          title="Сохранить цепочку"
        >
          <Save className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onUndo}
          disabled={!canUndo}
          className={`text-gray-400 hover:text-white ml-1 ${!canUndo ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Отменить действие"
        >
          <Undo className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onRedo}
          disabled={!canRedo}
          className={`text-gray-400 hover:text-white ml-1 ${!canRedo ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Повторить действие"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="mr-auto">
        <div className="relative">
          {isEditing ? (
            <Input
              type="text"
              value={chainName}
              onChange={(e) => setChainName(e.target.value)}
              onBlur={() => {
                setIsEditing(false);
                handleNameChange(chainName);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setIsEditing(false);
                  handleNameChange(chainName);
                }
              }}
              autoFocus
              className="bg-transparent text-white border border-gray-700 hover:border-gray-500 focus:border-primary-500 rounded px-3 py-1 focus:outline-none"
            />
          ) : (
            <Button
              variant="ghost"
              onClick={() => setIsEditing(true)}
              className="text-white hover:bg-gray-800 px-3 py-1"
            >
              {chainName || 'Без названия'}
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <Select value={zoomLevel} onValueChange={handleZoomChange}>
          <SelectTrigger className="w-24 h-8 text-sm bg-gray-800 border-gray-700">
            <SelectValue placeholder="Масштаб" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="25%">25%</SelectItem>
            <SelectItem value="50%">50%</SelectItem>
            <SelectItem value="75%">75%</SelectItem>
            <SelectItem value="100%">100%</SelectItem>
            <SelectItem value="125%">125%</SelectItem>
            <SelectItem value="150%">150%</SelectItem>
          </SelectContent>
        </Select>
        
        <div>
          {isRunning ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleStopChain}
              className="flex items-center"
              disabled={!chain?.id}
            >
              <Square className="h-4 w-4 mr-1.5" />
              <span>Остановить</span>
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={handleStartChain}
              className="flex items-center bg-primary-600 hover:bg-primary-500"
              disabled={!chain?.id}
            >
              <Play className="h-4 w-4 mr-1.5" />
              <span>Запустить</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
