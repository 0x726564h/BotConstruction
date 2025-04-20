import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs';
import { storage } from './storage';
import { log } from './vite';

// Интерфейс для команд Telegram
export interface TelegramCommand {
  action: string;
  sessionId?: number;
  params?: any;
}

// Класс для управления дочерним процессом Python для Telethon
class TelegramProcessManager extends EventEmitter {
  private process: ChildProcessWithoutNullStreams | null = null;
  private isRunning: boolean = false;
  private activeSessions: Set<number> = new Set();
  private pythonScriptPath: string;

  constructor() {
    super();
    // Путь к скрипту Python для Telethon
    this.pythonScriptPath = path.join(process.cwd(), 'server', 'python', 'telethon_manager.py');
    
    // Создание директории для Python скриптов если ее нет
    const pythonDir = path.join(process.cwd(), 'server', 'python');
    if (!fs.existsSync(pythonDir)) {
      fs.mkdirSync(pythonDir, { recursive: true });
    }
    
    // Создание базового скрипта Python для Telethon если его нет
    if (!fs.existsSync(this.pythonScriptPath)) {
      const telegramScript = `
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import asyncio
import json
import sys
import os
import signal
import time
from telethon import TelegramClient, events
from telethon.sessions import StringSession

# Обработчик для корректного завершения при получении сигнала
def handle_exit(signum, frame):
    for client in clients.values():
        asyncio.create_task(client.disconnect())
    sys.exit(0)

signal.signal(signal.SIGTERM, handle_exit)
signal.signal(signal.SIGINT, handle_exit)

# Словарь активных клиентов
clients = {}

async def process_command(command_str):
    try:
        command = json.loads(command_str)
        action = command.get("action")
        session_id = command.get("sessionId")
        params = command.get("params", {})
        
        if action == "connect":
            api_id = params.get("apiId")
            api_hash = params.get("apiHash")
            session_string = params.get("sessionString")
            
            if session_id in clients:
                # Если клиент уже подключен
                print(json.dumps({
                    "type": "response",
                    "success": False,
                    "action": action,
                    "sessionId": session_id,
                    "error": "Session already connected"
                }))
                return
            
            # Создаем новый клиент
            client = TelegramClient(
                StringSession(session_string),
                api_id,
                api_hash
            )
            
            # Регистрируем обработчик новых сообщений
            @client.on(events.NewMessage)
            async def handler(event):
                print(json.dumps({
                    "type": "event",
                    "eventType": "newMessage",
                    "sessionId": session_id,
                    "data": {
                        "chat_id": event.chat_id,
                        "message": event.message.text,
                        "date": event.message.date.isoformat()
                    }
                }))
            
            # Подключаемся
            await client.connect()
            if await client.is_user_authorized():
                clients[session_id] = client
                me = await client.get_me()
                print(json.dumps({
                    "type": "response",
                    "success": True,
                    "action": action,
                    "sessionId": session_id,
                    "data": {
                        "id": me.id,
                        "first_name": me.first_name,
                        "last_name": me.last_name,
                        "username": me.username,
                        "phone": me.phone
                    }
                }))
            else:
                print(json.dumps({
                    "type": "response",
                    "success": False,
                    "action": action,
                    "sessionId": session_id,
                    "error": "Authentication required"
                }))
                await client.disconnect()
        
        elif action == "disconnect":
            if session_id in clients:
                client = clients[session_id]
                await client.disconnect()
                del clients[session_id]
                print(json.dumps({
                    "type": "response",
                    "success": True,
                    "action": action,
                    "sessionId": session_id
                }))
            else:
                print(json.dumps({
                    "type": "response",
                    "success": False,
                    "action": action,
                    "sessionId": session_id,
                    "error": "Session not found"
                }))
        
        elif action == "send_message":
            if session_id not in clients:
                print(json.dumps({
                    "type": "response",
                    "success": False,
                    "action": action,
                    "sessionId": session_id,
                    "error": "Session not connected"
                }))
                return
            
            client = clients[session_id]
            chat_id = params.get("chatId")
            message = params.get("message")
            
            if not chat_id or not message:
                print(json.dumps({
                    "type": "response",
                    "success": False,
                    "action": action,
                    "sessionId": session_id,
                    "error": "Missing chat_id or message"
                }))
                return
            
            result = await client.send_message(chat_id, message)
            print(json.dumps({
                "type": "response",
                "success": True,
                "action": action,
                "sessionId": session_id,
                "data": {
                    "message_id": result.id,
                    "date": result.date.isoformat()
                }
            }))
            
        else:
            print(json.dumps({
                "type": "response",
                "success": False,
                "action": action,
                "error": "Unknown action"
            }))
            
    except Exception as e:
        print(json.dumps({
            "type": "response",
            "success": False,
            "error": str(e)
        }))

async def main():
    # Главный цикл для чтения команд из stdin
    while True:
        line = sys.stdin.readline().strip()
        if not line:
            # Пустая строка - выходим
            break
        
        await process_command(line)

if __name__ == "__main__":
    try:
        # Печатаем готовность, чтобы Node.js знал, что Python процесс запущен
        print(json.dumps({"type": "status", "status": "ready"}))
        sys.stdout.flush()
        
        asyncio.run(main())
    except Exception as e:
        print(json.dumps({"type": "error", "error": str(e)}))
        sys.exit(1)
`;
      fs.writeFileSync(this.pythonScriptPath, telegramScript);
    }
  }

  // Запуск Python процесса
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isRunning) {
        return resolve();
      }

      try {
        // Запуск Python процесса
        this.process = spawn('python3', [this.pythonScriptPath]);
        
        // Обработка вывода процесса
        this.process.stdout.on('data', (data) => {
          const lines = data.toString().trim().split('\n');
          
          for (const line of lines) {
            try {
              const message = JSON.parse(line);
              
              if (message.type === 'status' && message.status === 'ready') {
                this.isRunning = true;
                resolve();
              } else if (message.type === 'event') {
                this.emit('event', message);
              } else if (message.type === 'response') {
                this.emit('response', message);
              } else if (message.type === 'telegram_response') {
                // Специально для ответов, связанных с QR-кодом
                this.emit('telegram_response', message);
              } else if (message.type === 'error') {
                log(`Telegram Python Error: ${message.error}`, 'telegram');
              }
            } catch (err) {
              log(`Invalid JSON from Python process: ${line}`, 'telegram');
            }
          }
        });

        // Обработка ошибок
        this.process.stderr.on('data', (data) => {
          log(`Telegram Python stderr: ${data.toString()}`, 'telegram');
        });

        // Обработка завершения процесса
        this.process.on('close', (code) => {
          this.isRunning = false;
          this.process = null;
          this.activeSessions.clear();
          
          log(`Telegram Python process exited with code ${code}`, 'telegram');
          
          // Повторный запуск процесса при неожиданном завершении
          if (code !== 0 && this.listenerCount('response') > 0) {
            log('Restarting Telegram Python process...', 'telegram');
            setTimeout(() => this.start(), 5000);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Остановка Python процесса
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isRunning || !this.process) {
        this.isRunning = false;
        return resolve();
      }

      // Отключение всех активных сессий перед завершением
      const disconnectPromises = Array.from(this.activeSessions).map(sessionId => 
        this.sendCommand({ action: 'disconnect', sessionId })
      );

      Promise.all(disconnectPromises)
        .finally(() => {
          if (this.process) {
            this.process.kill('SIGTERM');
            
            // Ожидание завершения процесса
            const timeout = setTimeout(() => {
              if (this.process) {
                this.process.kill('SIGKILL');
              }
            }, 5000);
            
            this.process.on('close', () => {
              clearTimeout(timeout);
              this.isRunning = false;
              this.process = null;
              this.activeSessions.clear();
              resolve();
            });
          } else {
            this.isRunning = false;
            resolve();
          }
        });
    });
  }

  // Отправка команды в Python процесс
  sendCommand(command: TelegramCommand): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.isRunning || !this.process) {
        return reject(new Error('Telegram process is not running'));
      }

      const commandId = Date.now().toString();
      const timeout = setTimeout(() => {
        this.removeListener(`response:${commandId}`, handleResponse);
        reject(new Error('Command timeout'));
      }, 30000);

      const handleResponse = (response: any) => {
        clearTimeout(timeout);
        
        if (response.success) {
          // Обновляем список активных сессий
          if (command.action === 'connect' && command.sessionId) {
            this.activeSessions.add(command.sessionId);
          } else if (command.action === 'disconnect' && command.sessionId) {
            this.activeSessions.delete(command.sessionId);
          }
          
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Command failed'));
        }
      };

      // Слушаем ответ на команду
      const responseListener = (response: any) => {
        if (response.action === command.action && response.sessionId === command.sessionId) {
          handleResponse(response);
        }
      };

      this.once('response', responseListener);

      // Отправляем команду
      const commandStr = JSON.stringify({
        ...command,
        id: commandId
      }) + '\n';
      
      this.process.stdin.write(commandStr);
    });
  }

  // Проверка состояния процесса
  isProcessRunning(): boolean {
    return this.isRunning;
  }

  // Получение списка активных сессий
  getActiveSessions(): number[] {
    return Array.from(this.activeSessions);
  }
}

export const telegramManager = new TelegramProcessManager();

// Инициализация при старте сервера
export async function initTelegramManager() {
  try {
    await telegramManager.start();
    log('Telegram manager started successfully', 'telegram');
    
    // Слушаем события от Telegram
    telegramManager.on('event', async (event) => {
      // В будущем здесь можно обрабатывать события от Telethon
      // и отправлять их через WebSocket клиентам
    });
    
    return true;
  } catch (error) {
    log(`Failed to start Telegram manager: ${error}`, 'telegram');
    return false;
  }
}

// Управление сессиями Telegram
export async function connectTelegramSession(sessionId: number) {
  try {
    const session = await storage.getBotSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
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
    
    return result;
  } catch (error) {
    log(`Failed to connect session ${sessionId}: ${error}`, 'telegram');
    throw error;
  }
}

export async function disconnectTelegramSession(sessionId: number) {
  try {
    const result = await telegramManager.sendCommand({
      action: 'disconnect',
      sessionId
    });
    
    // Обновляем статус сессии
    await storage.updateBotSession(sessionId, { status: 'inactive' });
    
    return result;
  } catch (error) {
    log(`Failed to disconnect session ${sessionId}: ${error}`, 'telegram');
    throw error;
  }
}

export async function sendTelegramMessage(sessionId: number, chatId: string, message: string) {
  try {
    return await telegramManager.sendCommand({
      action: 'send_message',
      sessionId,
      params: {
        chatId,
        message
      }
    });
  } catch (error) {
    log(`Failed to send message using session ${sessionId}: ${error}`, 'telegram');
    throw error;
  }
}
