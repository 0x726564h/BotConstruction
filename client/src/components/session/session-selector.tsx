import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { BotSession } from '@shared/schema';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PlusCircle, Power, PowerOff, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { useWebSocket } from '@/hooks/use-websocket';
import { useLocation } from 'wouter';
import { connectSession, disconnectSession } from '@/lib/telegram-api';

interface SessionSelectorProps {
  onSessionChange?: (sessionId: number | null) => void;
  selectedSessionId?: number | null;
}

export function SessionSelector({ onSessionChange, selectedSessionId }: SessionSelectorProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { sendTelegramCommand, status: wsStatus } = useWebSocket();
  const [loading, setLoading] = useState(false);
  
  // Запрос списка сессий
  const { 
    data: sessions, 
    isLoading: loadingSessions,
    refetch: refetchSessions
  } = useQuery<BotSession[]>({
    queryKey: ['/api/sessions'],
  });
  
  // Мутация для подключения сессии
  const connectMutation = useMutation({
    mutationFn: (sessionId: number) => connectSession(sessionId),
    onSuccess: () => {
      toast({
        title: 'Сессия подключена',
        description: 'Telegram сессия успешно активирована',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
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
  const disconnectMutation = useMutation({
    mutationFn: (sessionId: number) => disconnectSession(sessionId),
    onSuccess: () => {
      toast({
        title: 'Сессия отключена',
        description: 'Telegram сессия успешно деактивирована',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
    },
    onError: (error) => {
      toast({
        title: 'Ошибка отключения',
        description: error instanceof Error ? error.message : 'Не удалось отключить сессию',
        variant: 'destructive',
      });
    },
  });
  
  // Выбор сессии по умолчанию
  useEffect(() => {
    if (sessions && sessions.length > 0 && !selectedSessionId) {
      const activeSession = sessions.find(session => session.status === 'active');
      if (activeSession) {
        onSessionChange?.(activeSession.id);
      } else {
        onSessionChange?.(sessions[0].id);
      }
    }
  }, [sessions, selectedSessionId, onSessionChange]);
  
  // Обработчик изменения выбранной сессии
  const handleSessionChange = (value: string) => {
    onSessionChange?.(value === '' ? null : parseInt(value));
  };
  
  // Обработчик подключения/отключения сессии
  const handleToggleSession = async () => {
    if (!selectedSessionId) return;
    
    setLoading(true);
    
    try {
      const session = sessions?.find(s => s.id === selectedSessionId);
      
      if (!session) {
        throw new Error('Сессия не найдена');
      }
      
      if (session.status === 'active') {
        // Отключаем сессию
        await disconnectMutation.mutateAsync(selectedSessionId);
      } else {
        // Подключаем сессию
        await connectMutation.mutateAsync(selectedSessionId);
      }
    } catch (error) {
      console.error('Ошибка при переключении сессии:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Обработчик создания новой сессии
  const handleCreateSession = () => {
    navigate('/settings?tab=sessions');
  };
  
  // Определение статуса сессии
  const sessionStatus = selectedSessionId ? 
    sessions?.find(s => s.id === selectedSessionId)?.status : null;
  
  return (
    <div className="flex items-center space-x-2">
      <Select 
        value={selectedSessionId?.toString() || ''} 
        onValueChange={handleSessionChange}
        disabled={loadingSessions || !sessions?.length}
      >
        <SelectTrigger className="min-w-[200px] bg-gray-800 border-gray-700">
          <SelectValue placeholder="Выберите сессию" />
        </SelectTrigger>
        <SelectContent className="bg-gray-900 border-gray-700">
          {sessions?.map((session) => (
            <SelectItem key={session.id} value={session.id.toString()}>
              {session.name} {session.status === 'active' ? '(активна)' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Button
        variant="outline"
        size="icon"
        onClick={handleToggleSession}
        disabled={!selectedSessionId || loading}
        className={
          sessionStatus === 'active' 
            ? 'text-green-500 border-green-800 hover:text-green-400 hover:border-green-700' 
            : 'text-gray-400 border-gray-700 hover:text-white hover:border-gray-600'
        }
      >
        {loading ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : sessionStatus === 'active' ? (
          <Power className="h-4 w-4" />
        ) : (
          <PowerOff className="h-4 w-4" />
        )}
      </Button>
      
      <Button
        variant="outline"
        size="icon"
        onClick={handleCreateSession}
        className="text-gray-400 border-gray-700 hover:text-white hover:border-gray-600"
      >
        <PlusCircle className="h-4 w-4" />
      </Button>
    </div>
  );
}
