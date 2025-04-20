import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";

type WebSocketMessage = {
  type: string;
  action?: string;
  data?: any;
};

type WebSocketStatus = 'connecting' | 'connected' | 'disconnected';

export function useWebSocket() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  // Функция для подключения к WebSocket
  const connect = useCallback(() => {
    if (!user || socketRef.current?.readyState === WebSocket.OPEN) return;

    // Очищаем предыдущий таймер
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    setStatus('connecting');

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setStatus('connected');
      // Отправляем сообщение авторизации
      sendMessage({
        type: 'auth',
        data: { userId: user.id }
      });
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        setMessages(prev => [...prev, message]);

        // Обработка специфических сообщений
        if (message.type === 'error') {
          toast({
            title: "Ошибка WebSocket",
            description: message.data?.message || "Неизвестная ошибка",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    socket.onclose = () => {
      setStatus('disconnected');
      
      // Пробуем переподключиться через 5 секунд
      reconnectTimerRef.current = window.setTimeout(() => {
        connect();
      }, 5000);
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setStatus('disconnected');
      
      toast({
        title: "Ошибка соединения",
        description: "Не удалось подключиться к серверу",
        variant: "destructive",
      });
    };
  }, [user, toast]);

  // Функция для отправки сообщения через WebSocket
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  // Функция для отключения от WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    setStatus('disconnected');
  }, []);

  // Подключаемся при монтировании компонента и при смене пользователя
  useEffect(() => {
    if (user) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [user, connect, disconnect]);

  // Отправка команды для управления сессией Telegram
  const sendTelegramCommand = useCallback((command: { action: string, sessionId?: number, params?: any }) => {
    return sendMessage({
      type: 'telegram_command',
      data: command
    });
  }, [sendMessage]);

  // Отправка команды для редактора диалоговых цепочек
  const sendEditorCommand = useCallback((action: string, chainId?: number, data?: any) => {
    return sendMessage({
      type: 'editor_command',
      data: { action, chainId, data }
    });
  }, [sendMessage]);

  // Фильтрация сообщений по типу
  const getMessagesByType = useCallback((type: string) => {
    return messages.filter(msg => msg.type === type);
  }, [messages]);

  // Фильтрация сообщений по типу и действию
  const getMessagesByTypeAndAction = useCallback((type: string, action: string) => {
    return messages.filter(msg => msg.type === type && msg.action === action);
  }, [messages]);

  return {
    status,
    messages,
    sendMessage,
    connect,
    disconnect,
    sendTelegramCommand,
    sendEditorCommand,
    getMessagesByType,
    getMessagesByTypeAndAction
  };
}
