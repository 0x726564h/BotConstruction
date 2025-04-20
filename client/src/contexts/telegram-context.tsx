import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { BotSession } from '@shared/schema';
import { useWebSocket } from '@/hooks/use-websocket';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

interface TelegramContextType {
  sessions: BotSession[];
  activeSessions: BotSession[];
  selectedSession: BotSession | null;
  isLoading: boolean;
  error: Error | null;
  setSelectedSession: (session: BotSession | null) => void;
  connectSession: (sessionId: number) => Promise<void>;
  disconnectSession: (sessionId: number) => Promise<void>;
  sendMessage: (sessionId: number, chatId: string, message: string) => Promise<any>;
  events: any[];
}

const TelegramContext = createContext<TelegramContextType | null>(null);

export function TelegramProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { status: wsStatus, sendTelegramCommand, getMessagesByType } = useWebSocket();
  const [selectedSession, setSelectedSession] = useState<BotSession | null>(null);
  const [events, setEvents] = useState<any[]>([]);

  // Запрос списка сессий
  const { 
    data: sessions = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery<BotSession[]>({
    queryKey: ['/api/sessions'],
    enabled: !!user,
  });

  // Активные сессии
  const activeSessions = sessions.filter(session => session.status === 'active');

  // Отслеживание событий от Telegram
  useEffect(() => {
    const telegramEvents = getMessagesByType('telegram_event');
    setEvents(telegramEvents);
  }, [getMessagesByType]);

  // Автообновление списка сессий при изменении статуса WebSocket
  useEffect(() => {
    if (wsStatus === 'connected') {
      refetch();
    }
  }, [wsStatus, refetch]);

  // Мутация для подключения сессии
  const connectMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      // Проверяем статус WebSocket
      if (wsStatus !== 'connected') {
        throw new Error('WebSocket не подключен');
      }

      // Отправляем команду через WebSocket
      sendTelegramCommand('connect_session', sessionId);

      // И запрос через REST API для отображения в интерфейсе
      const response = await fetch(`/api/sessions/${sessionId}/connect`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Ошибка подключения: ${text}`);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Сессия подключена',
        description: 'Telegram сессия успешно активирована',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка подключения',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Мутация для отключения сессии
  const disconnectMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      // Проверяем статус WebSocket
      if (wsStatus !== 'connected') {
        throw new Error('WebSocket не подключен');
      }

      // Отправляем команду через WebSocket
      sendTelegramCommand('disconnect_session', sessionId);

      // И запрос через REST API для отображения в интерфейсе
      const response = await fetch(`/api/sessions/${sessionId}/disconnect`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Ошибка отключения: ${text}`);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Сессия отключена',
        description: 'Telegram сессия успешно деактивирована',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка отключения',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Мутация для отправки сообщения
  const sendMessageMutation = useMutation({
    mutationFn: async ({ sessionId, chatId, message }: { sessionId: number; chatId: string; message: string }) => {
      // Проверяем статус WebSocket
      if (wsStatus !== 'connected') {
        throw new Error('WebSocket не подключен');
      }

      // Отправляем команду через WebSocket
      sendTelegramCommand('send_message', sessionId, { chatId, message });

      // И запрос через REST API
      const response = await fetch(`/api/sessions/${sessionId}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, message }),
        credentials: 'include',
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Ошибка отправки сообщения: ${text}`);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Сообщение отправлено',
        description: 'Сообщение успешно отправлено',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка отправки',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Методы для внешнего использования
  const connectSession = async (sessionId: number) => {
    await connectMutation.mutateAsync(sessionId);
  };

  const disconnectSession = async (sessionId: number) => {
    await disconnectMutation.mutateAsync(sessionId);
  };

  const sendMessage = async (sessionId: number, chatId: string, message: string) => {
    return await sendMessageMutation.mutateAsync({ sessionId, chatId, message });
  };

  return (
    <TelegramContext.Provider
      value={{
        sessions,
        activeSessions,
        selectedSession,
        isLoading,
        error: error instanceof Error ? error : null,
        setSelectedSession,
        connectSession,
        disconnectSession,
        sendMessage,
        events,
      }}
    >
      {children}
    </TelegramContext.Provider>
  );
}

export function useTelegram() {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegram должен использоваться внутри TelegramProvider');
  }
  return context;
}
