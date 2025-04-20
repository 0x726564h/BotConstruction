import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { telegramManager } from './telegram';
import { storage } from './storage';
import { log } from './vite';

interface WebSocketMessage {
  type: string;
  action?: string;
  data?: any;
}

interface WebSocketClient extends WebSocket {
  isAlive: boolean;
  userId?: number;
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  
  // Сохраняем клиентов по ID пользователя для отправки обновлений
  const userClients = new Map<number, Set<WebSocketClient>>();
  
  // Функция для отправки сообщения клиенту
  function sendToClient(client: WebSocketClient, message: WebSocketMessage) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }
  
  // Функция для отправки сообщения всем клиентам пользователя
  function sendToUser(userId: number, message: WebSocketMessage) {
    const clients = userClients.get(userId);
    if (clients) {
      clients.forEach(client => {
        sendToClient(client, message);
      });
    }
  }
  
  // Функция для отправки сообщения всем клиентам
  function broadcast(message: WebSocketMessage) {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
  
  // Проверка соединений
  const interval = setInterval(() => {
    wss.clients.forEach((ws: WebSocketClient) => {
      if (ws.isAlive === false) return ws.terminate();
      
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  
  wss.on('connection', (ws: WebSocketClient) => {
    ws.isAlive = true;
    
    // Обработка пинга
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    
    // Обработка сообщений
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString()) as WebSocketMessage;
        
        // Аутентификация клиента
        if (data.type === 'auth') {
          const userId = data.data?.userId;
          if (userId) {
            ws.userId = userId;
            
            // Регистрируем клиента для пользователя
            if (!userClients.has(userId)) {
              userClients.set(userId, new Set());
            }
            userClients.get(userId)?.add(ws);
            
            // Отправляем подтверждение авторизации
            sendToClient(ws, {
              type: 'auth_success',
              data: { userId }
            });
            
            log(`WebSocket client authenticated for user ${userId}`, 'websocket');
          }
        }
        
        // Команды для телеграм бота
        else if (data.type === 'telegram_command') {
          if (!ws.userId) {
            sendToClient(ws, {
              type: 'error',
              data: { message: 'Unauthorized' }
            });
            return;
          }
          
          const { action, sessionId, params } = data.data || {};
          
          if (action === 'connect_session') {
            try {
              // Проверяем, принадлежит ли сессия пользователю
              const session = await storage.getBotSession(sessionId);
              if (!session || session.owner_id !== ws.userId) {
                throw new Error('Session not found or access denied');
              }
              
              const result = await telegramManager.sendCommand({
                action: 'connect',
                sessionId,
                params: {
                  apiId: session.api_id,
                  apiHash: session.api_hash,
                  sessionString: session.session_string
                }
              });
              
              // Обновляем статус сессии
              await storage.updateBotSession(sessionId, { status: 'active' });
              
              sendToClient(ws, {
                type: 'telegram_response',
                action: 'connect_session',
                data: { success: true, sessionId, result }
              });
            } catch (error) {
              sendToClient(ws, {
                type: 'telegram_response',
                action: 'connect_session',
                data: { success: false, sessionId, error: String(error) }
              });
            }
          }
          else if (action === 'disconnect_session') {
            try {
              // Проверяем, принадлежит ли сессия пользователю
              const session = await storage.getBotSession(sessionId);
              if (!session || session.owner_id !== ws.userId) {
                throw new Error('Session not found or access denied');
              }
              
              await telegramManager.sendCommand({
                action: 'disconnect',
                sessionId
              });
              
              // Обновляем статус сессии
              await storage.updateBotSession(sessionId, { status: 'inactive' });
              
              sendToClient(ws, {
                type: 'telegram_response',
                action: 'disconnect_session',
                data: { success: true, sessionId }
              });
            } catch (error) {
              sendToClient(ws, {
                type: 'telegram_response',
                action: 'disconnect_session',
                data: { success: false, sessionId, error: String(error) }
              });
            }
          }
          else if (action === 'send_message') {
            try {
              // Проверяем, принадлежит ли сессия пользователю
              const session = await storage.getBotSession(sessionId);
              if (!session || session.owner_id !== ws.userId) {
                throw new Error('Session not found or access denied');
              }
              
              const { chatId, message } = params || {};
              if (!chatId || !message) {
                throw new Error('Missing chatId or message');
              }
              
              const result = await telegramManager.sendCommand({
                action: 'send_message',
                sessionId,
                params: { chatId, message }
              });
              
              sendToClient(ws, {
                type: 'telegram_response',
                action: 'send_message',
                data: { success: true, sessionId, result }
              });
            } catch (error) {
              sendToClient(ws, {
                type: 'telegram_response',
                action: 'send_message',
                data: { success: false, sessionId, error: String(error) }
              });
            }
          }
          else if (action === 'generate_qr') {
            try {
              const { apiId, apiHash, connectionSettings, deviceSettings } = params || {};
              
              if (!apiId || !apiHash) {
                throw new Error('Missing apiId or apiHash');
              }
              
              // Отправляем команду на генерацию QR-кода с параметрами подключения
              await telegramManager.sendCommand({
                action: 'generate_qr',
                sessionId,
                params: {
                  apiId,
                  apiHash,
                  connectionSettings,
                  deviceSettings
                }
              });
              
              // Реальный ответ придет через обработчик процесса Python
              
            } catch (error) {
              sendToClient(ws, {
                type: 'telegram_response',
                action: 'generate_qr',
                data: { success: false, sessionId, error: String(error) }
              });
            }
          }
        }
        
        // Команды для редактора диалоговых цепочек
        else if (data.type === 'editor_command') {
          if (!ws.userId) {
            sendToClient(ws, {
              type: 'error',
              data: { message: 'Unauthorized' }
            });
            return;
          }
          
          const { action, chainId, data: editorData } = data.data || {};
          
          if (action === 'save_chain') {
            try {
              // Проверяем, существует ли цепочка
              const existingChain = chainId ? await storage.getDialogueChain(chainId) : null;
              
              if (existingChain) {
                // Проверяем, принадлежит ли цепочка пользователю
                if (existingChain.owner_id !== ws.userId) {
                  throw new Error('Access denied');
                }
                
                // Обновляем цепочку
                const updatedChain = await storage.updateDialogueChain(chainId, {
                  name: editorData.name,
                  graph_json: editorData.graph,
                  session_id: editorData.sessionId
                });
                
                sendToClient(ws, {
                  type: 'editor_response',
                  action: 'save_chain',
                  data: { success: true, chain: updatedChain }
                });
              } else {
                // Создаем новую цепочку
                const newChain = await storage.createDialogueChain({
                  name: editorData.name,
                  graph_json: editorData.graph,
                  owner_id: ws.userId,
                  session_id: editorData.sessionId
                });
                
                sendToClient(ws, {
                  type: 'editor_response',
                  action: 'save_chain',
                  data: { success: true, chain: newChain }
                });
              }
            } catch (error) {
              sendToClient(ws, {
                type: 'editor_response',
                action: 'save_chain',
                data: { success: false, error: String(error) }
              });
            }
          }
          else if (action === 'start_chain') {
            try {
              // Проверяем, существует ли цепочка
              const chain = await storage.getDialogueChain(chainId);
              if (!chain) {
                throw new Error('Chain not found');
              }
              
              // Проверяем, принадлежит ли цепочка пользователю
              if (chain.owner_id !== ws.userId) {
                throw new Error('Access denied');
              }
              
              // В будущем здесь должна быть логика запуска цепочки
              // Сейчас просто создаем задачу
              const task = await storage.createTask({
                chain_id: chainId,
                node_id: 'start'
              });
              
              // Обновляем статус цепочки
              await storage.updateDialogueChain(chainId, {
                is_active: true
              });
              
              sendToClient(ws, {
                type: 'editor_response',
                action: 'start_chain',
                data: { success: true, taskId: task.id }
              });
              
              // Эмулируем обновления статуса выполнения
              setTimeout(async () => {
                const updatedTask = await storage.updateTask(task.id, {
                  status: 'running',
                  log: ['Начало выполнения цепочки']
                });
                
                sendToUser(ws.userId!, {
                  type: 'task_update',
                  data: updatedTask
                });
              }, 1000);
              
              setTimeout(async () => {
                const updatedTask = await storage.updateTask(task.id, {
                  status: 'completed',
                  log: ['Начало выполнения цепочки', 'Переход к узлу "сообщение"', 'Отправка приветствия', 'Выполнение завершено'],
                  finished_at: new Date()
                });
                
                sendToUser(ws.userId!, {
                  type: 'task_update',
                  data: updatedTask
                });
                
                // Обновляем статус цепочки
                await storage.updateDialogueChain(chainId, {
                  is_active: false
                });
              }, 5000);
            } catch (error) {
              sendToClient(ws, {
                type: 'editor_response',
                action: 'start_chain',
                data: { success: false, error: String(error) }
              });
            }
          }
          else if (action === 'stop_chain') {
            try {
              // Проверяем, существует ли цепочка
              const chain = await storage.getDialogueChain(chainId);
              if (!chain) {
                throw new Error('Chain not found');
              }
              
              // Проверяем, принадлежит ли цепочка пользователю
              if (chain.owner_id !== ws.userId) {
                throw new Error('Access denied');
              }
              
              // Получаем активные задачи для цепочки
              const tasks = await storage.getTasksByChainId(chainId);
              const activeTasks = tasks.filter(task => 
                task.status === 'pending' || task.status === 'running'
              );
              
              // Останавливаем активные задачи
              for (const task of activeTasks) {
                await storage.updateTask(task.id, {
                  status: 'stopped',
                  log: [...task.log, 'Цепочка остановлена пользователем'],
                  finished_at: new Date()
                });
                
                sendToUser(ws.userId!, {
                  type: 'task_update',
                  data: task
                });
              }
              
              // Обновляем статус цепочки
              await storage.updateDialogueChain(chainId, {
                is_active: false
              });
              
              sendToClient(ws, {
                type: 'editor_response',
                action: 'stop_chain',
                data: { success: true }
              });
            } catch (error) {
              sendToClient(ws, {
                type: 'editor_response',
                action: 'stop_chain',
                data: { success: false, error: String(error) }
              });
            }
          }
        }
        
      } catch (error) {
        log(`WebSocket error: ${error}`, 'websocket');
        sendToClient(ws, {
          type: 'error',
          data: { message: String(error) }
        });
      }
    });
    
    // Обработка закрытия соединения
    ws.on('close', () => {
      if (ws.userId) {
        const clients = userClients.get(ws.userId);
        if (clients) {
          clients.delete(ws);
          if (clients.size === 0) {
            userClients.delete(ws.userId);
          }
        }
      }
    });
    
    // Отправляем приветственное сообщение
    sendToClient(ws, {
      type: 'welcome',
      data: { message: 'Connected to Telegram UserBot WebSocket server' }
    });
  });
  
  // Обработка закрытия сервера
  wss.on('close', () => {
    clearInterval(interval);
  });
  
  // Перенаправляем события от Telegram Manager в WebSocket
  telegramManager.on('event', (event) => {
    const sessionId = event.sessionId;
    if (!sessionId) return;
    
    // Находим пользователя, которому принадлежит сессия
    (async () => {
      try {
        const session = await storage.getBotSession(sessionId);
        if (session) {
          sendToUser(session.owner_id, {
            type: 'telegram_event',
            data: event
          });
        }
      } catch (error) {
        log(`Error forwarding Telegram event: ${error}`, 'websocket');
      }
    })();
  });
  
  log('WebSocket server set up successfully', 'websocket');
  
  return wss;
}
