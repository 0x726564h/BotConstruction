import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { setupWebSocket } from "./websocket";
import { initTelegramManager, connectTelegramSession, disconnectTelegramSession, sendTelegramMessage } from "./telegram";
import { z } from "zod";
import { insertBotSessionSchema, insertDialogueChainSchema, insertPluginSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Настройка аутентификации
  setupAuth(app);

  // Запуск Telegram Manager
  await initTelegramManager();

  // API для работы с Telegram-сессиями
  app.get("/api/sessions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const sessions = await storage.getBotSessionsByUserId(req.user.id);
    res.json(sessions);
  });

  app.get("/api/sessions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const sessionId = parseInt(req.params.id);
    const session = await storage.getBotSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    
    if (session.owner_id !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    res.json(session);
  });

  app.post("/api/sessions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const sessionData = insertBotSessionSchema.parse({
        ...req.body,
        owner_id: req.user.id
      });
      
      const session = await storage.createBotSession(sessionData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.put("/api/sessions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const sessionId = parseInt(req.params.id);
    const session = await storage.getBotSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    
    if (session.owner_id !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      const updatedSession = await storage.updateBotSession(sessionId, req.body);
      res.json(updatedSession);
    } catch (error) {
      res.status(500).json({ message: "Failed to update session" });
    }
  });

  app.delete("/api/sessions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const sessionId = parseInt(req.params.id);
    const session = await storage.getBotSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    
    if (session.owner_id !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // Отключаем сессию перед удалением
    if (session.status === 'active') {
      try {
        await disconnectTelegramSession(sessionId);
      } catch (error) {
        // Игнорируем ошибку
      }
    }
    
    await storage.deleteBotSession(sessionId);
    res.status(204).send();
  });

  app.post("/api/sessions/:id/connect", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const sessionId = parseInt(req.params.id);
    const session = await storage.getBotSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    
    if (session.owner_id !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      const result = await connectTelegramSession(sessionId);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: String(error) });
    }
  });

  app.post("/api/sessions/:id/disconnect", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const sessionId = parseInt(req.params.id);
    const session = await storage.getBotSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    
    if (session.owner_id !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      await disconnectTelegramSession(sessionId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: String(error) });
    }
  });

  app.post("/api/sessions/:id/send-message", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const sessionId = parseInt(req.params.id);
    const session = await storage.getBotSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    
    if (session.owner_id !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    const { chatId, message } = req.body;
    
    if (!chatId || !message) {
      return res.status(400).json({ message: "Missing chatId or message" });
    }
    
    try {
      const result = await sendTelegramMessage(sessionId, chatId, message);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: String(error) });
    }
  });

  // API для работы с диалоговыми цепочками
  app.get("/api/chains", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const chains = await storage.getDialogueChainsByUserId(req.user.id);
    res.json(chains);
  });

  app.get("/api/chains/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const chainId = parseInt(req.params.id);
    const chain = await storage.getDialogueChain(chainId);
    
    if (!chain) {
      return res.status(404).json({ message: "Chain not found" });
    }
    
    if (chain.owner_id !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    res.json(chain);
  });

  app.post("/api/chains", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const chainData = insertDialogueChainSchema.parse({
        ...req.body,
        owner_id: req.user.id
      });
      
      // Проверяем, существует ли сессия и принадлежит ли она пользователю
      if (chainData.session_id) {
        const session = await storage.getBotSession(chainData.session_id);
        if (!session || session.owner_id !== req.user.id) {
          return res.status(400).json({ message: "Invalid session" });
        }
      }
      
      const chain = await storage.createDialogueChain(chainData);
      res.status(201).json(chain);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.put("/api/chains/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const chainId = parseInt(req.params.id);
    const chain = await storage.getDialogueChain(chainId);
    
    if (!chain) {
      return res.status(404).json({ message: "Chain not found" });
    }
    
    if (chain.owner_id !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // Проверяем, существует ли сессия и принадлежит ли она пользователю
    if (req.body.session_id) {
      const session = await storage.getBotSession(req.body.session_id);
      if (!session || session.owner_id !== req.user.id) {
        return res.status(400).json({ message: "Invalid session" });
      }
    }
    
    try {
      const updatedChain = await storage.updateDialogueChain(chainId, req.body);
      res.json(updatedChain);
    } catch (error) {
      res.status(500).json({ message: "Failed to update chain" });
    }
  });

  app.delete("/api/chains/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const chainId = parseInt(req.params.id);
    const chain = await storage.getDialogueChain(chainId);
    
    if (!chain) {
      return res.status(404).json({ message: "Chain not found" });
    }
    
    if (chain.owner_id !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    await storage.deleteDialogueChain(chainId);
    res.status(204).send();
  });

  // API для работы с задачами
  app.get("/api/tasks", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const chainId = req.query.chainId ? parseInt(req.query.chainId as string) : undefined;
    
    if (chainId) {
      // Проверяем, принадлежит ли цепочка пользователю
      const chain = await storage.getDialogueChain(chainId);
      if (!chain || chain.owner_id !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const tasks = await storage.getTasksByChainId(chainId);
      res.json(tasks);
    } else {
      // В будущем можно добавить получение всех задач пользователя
      res.status(400).json({ message: "Missing chainId parameter" });
    }
  });

  app.get("/api/tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const taskId = parseInt(req.params.id);
    const task = await storage.getTask(taskId);
    
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    
    // Проверяем, принадлежит ли цепочка пользователю
    const chain = await storage.getDialogueChain(task.chain_id);
    if (!chain || chain.owner_id !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    res.json(task);
  });

  // API для работы с плагинами
  app.get("/api/plugins", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const plugins = await storage.getPluginsByUserId(req.user.id);
    res.json(plugins);
  });

  app.get("/api/plugins/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const pluginId = parseInt(req.params.id);
    const plugin = await storage.getPlugin(pluginId);
    
    if (!plugin) {
      return res.status(404).json({ message: "Plugin not found" });
    }
    
    if (plugin.owner_id !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    res.json(plugin);
  });

  app.post("/api/plugins", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const pluginData = insertPluginSchema.parse({
        ...req.body,
        owner_id: req.user.id
      });
      
      const plugin = await storage.createPlugin(pluginData);
      res.status(201).json(plugin);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.put("/api/plugins/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const pluginId = parseInt(req.params.id);
    const plugin = await storage.getPlugin(pluginId);
    
    if (!plugin) {
      return res.status(404).json({ message: "Plugin not found" });
    }
    
    if (plugin.owner_id !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      const updatedPlugin = await storage.updatePlugin(pluginId, req.body);
      res.json(updatedPlugin);
    } catch (error) {
      res.status(500).json({ message: "Failed to update plugin" });
    }
  });

  app.delete("/api/plugins/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const pluginId = parseInt(req.params.id);
    const plugin = await storage.getPlugin(pluginId);
    
    if (!plugin) {
      return res.status(404).json({ message: "Plugin not found" });
    }
    
    if (plugin.owner_id !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    await storage.deletePlugin(pluginId);
    res.status(204).send();
  });

  const httpServer = createServer(app);
  
  // Настройка WebSocket сервера
  setupWebSocket(httpServer);

  return httpServer;
}
