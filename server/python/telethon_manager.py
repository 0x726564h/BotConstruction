
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import asyncio
import json
import sys
import os
import signal
import time
import base64
import uuid
from telethon import TelegramClient, events
from telethon.sessions import StringSession
from telethon.tl.functions.auth import ExportLoginTokenRequest
from telethon.tl.functions.messages import GetDialogsRequest

# Словарь для хранения временных сессий для QR-авторизации
qr_sessions = {}

# Обработчик для корректного завершения при получении сигнала
def handle_exit(signum, frame):
    for client in clients.values():
        asyncio.create_task(client.disconnect())
    for session in qr_sessions.values():
        if "client" in session:
            asyncio.create_task(session["client"].disconnect())
    sys.exit(0)

signal.signal(signal.SIGTERM, handle_exit)
signal.signal(signal.SIGINT, handle_exit)

# Словарь активных клиентов
clients = {}

# Функция для проверки авторизации по QR-коду
async def check_qr_auth(qr_session_id, session_id):
    session = qr_sessions.get(qr_session_id)
    if not session:
        return
    
    client = session["client"]
    start_time = session["created_at"]
    
    # Ожидаем авторизацию в течение 2 минут
    max_wait_time = 120  # 2 минуты
    check_interval = 2  # проверка каждые 2 секунды
    
    while time.time() - start_time < max_wait_time:
        await asyncio.sleep(check_interval)
        
        # Проверяем, авторизован ли пользователь
        if await client.is_user_authorized():
            # Получаем информацию о пользователе
            me = await client.get_me()
            
            # Получаем строку сессии
            session_string = client.session.save()
            
            # Отправляем строку сессии клиенту
            print(json.dumps({
                "type": "telegram_response",
                "success": True,
                "action": "generate_qr",
                "sessionId": session_id,
                "data": {
                    "sessionString": session_string,
                    "user": {
                        "id": me.id,
                        "first_name": me.first_name,
                        "last_name": me.last_name,
                        "username": me.username,
                        "phone": me.phone
                    }
                }
            }))
            
            # Удаляем временную сессию
            await client.disconnect()
            del qr_sessions[qr_session_id]
            return
    
    # Если время ожидания истекло, отключаемся и сообщаем об ошибке
    await client.disconnect()
    del qr_sessions[qr_session_id]
    
    print(json.dumps({
        "type": "telegram_response",
        "success": False,
        "action": "generate_qr",
        "sessionId": session_id,
        "error": "QR code authorization timeout"
    }))

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
            
            # Получаем настройки подключения и устройства
            connection_settings = params.get("connectionSettings", {})
            device_settings = params.get("deviceSettings", {})
            
            # Создаем новый клиент с настройками подключения
            client = TelegramClient(
                StringSession(session_string),
                api_id,
                api_hash,
                # Настройки подключения
                timeout=connection_settings.get("timeout", 10),
                request_retries=connection_settings.get("request_retries", 5),
                connection_retries=connection_settings.get("connection_retries", 5),
                retry_delay=connection_settings.get("retry_delay", 1),
                auto_reconnect=connection_settings.get("auto_reconnect", True),
                sequential_updates=connection_settings.get("sequential_updates", False),
                flood_sleep_threshold=connection_settings.get("flood_sleep_threshold", 60),
                # Настройки устройства
                device_model=device_settings.get("device_model", "PC 64bit"),
                system_version=device_settings.get("system_version", "Windows 10"),
                app_version=device_settings.get("app_version", "1.0.0"),
                lang_code=device_settings.get("lang_code", "ru"),
                system_lang_code=device_settings.get("system_lang_code", "ru"),
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

        elif action == "generate_qr":
            api_id = params.get("apiId")
            api_hash = params.get("apiHash")
            
            # Проверяем наличие необходимых параметров
            if not api_id or not api_hash:
                print(json.dumps({
                    "type": "telegram_response",
                    "success": False,
                    "action": action,
                    "sessionId": session_id,
                    "error": "Missing apiId or apiHash"
                }))
                return
            
            # Получаем настройки подключения и устройства
            connection_settings = params.get("connectionSettings", {})
            device_settings = params.get("deviceSettings", {})
            
            # Создаем временный клиент для генерации QR-кода с настройками подключения
            client = TelegramClient(
                StringSession(),  # Используем пустую строку сессии
                int(api_id),
                api_hash,
                # Настройки подключения
                timeout=connection_settings.get("timeout", 10),
                request_retries=connection_settings.get("request_retries", 5),
                connection_retries=connection_settings.get("connection_retries", 5),
                retry_delay=connection_settings.get("retry_delay", 1),
                auto_reconnect=connection_settings.get("auto_reconnect", True),
                sequential_updates=connection_settings.get("sequential_updates", False),
                flood_sleep_threshold=connection_settings.get("flood_sleep_threshold", 60),
                # Настройки устройства
                device_model=device_settings.get("device_model", "PC 64bit"),
                system_version=device_settings.get("system_version", "Windows 10"),
                app_version=device_settings.get("app_version", "1.0.0"),
                lang_code=device_settings.get("lang_code", "ru"),
                system_lang_code=device_settings.get("system_lang_code", "ru"),
            )
            
            try:
                # Подключаемся к Telegram
                await client.connect()
                
                # Получаем данные для QR-кода
                token = await client(ExportLoginTokenRequest(
                    api_id=int(api_id),
                    api_hash=api_hash,
                    except_ids=[]
                ))
                
                # Конвертируем токен в строку для QR-кода
                token_bytes = token.token
                token_b64 = base64.urlsafe_b64encode(token_bytes).decode('ascii')
                qr_code_str = f"tg://login?token={token_b64}"
                
                # Сохраняем клиент для последующей проверки
                qr_session_id = str(session_id) if session_id else str(uuid.uuid4())
                qr_sessions[qr_session_id] = {
                    "client": client,
                    "api_id": api_id,
                    "api_hash": api_hash,
                    "connection_settings": connection_settings,
                    "device_settings": device_settings,
                    "created_at": time.time()
                }
                
                # Запускаем проверку авторизации в отдельной задаче
                asyncio.create_task(check_qr_auth(qr_session_id, session_id))
                
                # Отправляем QR-код клиенту
                print(json.dumps({
                    "type": "telegram_response",
                    "success": True,
                    "action": action,
                    "sessionId": session_id,
                    "data": {
                        "qrCode": qr_code_str
                    }
                }))
                
            except Exception as e:
                # В случае ошибки, отключаем клиент и сообщаем об ошибке
                await client.disconnect()
                print(json.dumps({
                    "type": "telegram_response",
                    "success": False,
                    "action": action,
                    "sessionId": session_id,
                    "error": str(e)
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
