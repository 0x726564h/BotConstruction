import { users, User, InsertUser, botSessions, BotSession, InsertBotSession, dialogueChains, DialogueChain, InsertDialogueChain, tasks, Task, InsertTask, plugins, Plugin, InsertPlugin } from "@shared/schema";
import * as session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Интерфейс хранилища
export interface IStorage {
  // Пользователи
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Сессии бота
  getBotSession(id: number): Promise<BotSession | undefined>;
  getBotSessionsByUserId(userId: number): Promise<BotSession[]>;
  createBotSession(session: InsertBotSession): Promise<BotSession>;
  updateBotSession(id: number, session: Partial<InsertBotSession>): Promise<BotSession | undefined>;
  deleteBotSession(id: number): Promise<boolean>;
  
  // Диалоговые цепочки
  getDialogueChain(id: number): Promise<DialogueChain | undefined>;
  getDialogueChainsByUserId(userId: number): Promise<DialogueChain[]>;
  createDialogueChain(chain: InsertDialogueChain): Promise<DialogueChain>;
  updateDialogueChain(id: number, chain: Partial<InsertDialogueChain>): Promise<DialogueChain | undefined>;
  deleteDialogueChain(id: number): Promise<boolean>;
  
  // Задачи
  getTask(id: number): Promise<Task | undefined>;
  getTasksByChainId(chainId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<Task>): Promise<Task | undefined>;
  
  // Плагины
  getPlugin(id: number): Promise<Plugin | undefined>;
  getPluginsByUserId(userId: number): Promise<Plugin[]>;
  createPlugin(plugin: InsertPlugin): Promise<Plugin>;
  updatePlugin(id: number, plugin: Partial<InsertPlugin>): Promise<Plugin | undefined>;
  deletePlugin(id: number): Promise<boolean>;
  
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private botSessions: Map<number, BotSession>;
  private dialogueChains: Map<number, DialogueChain>;
  private tasks: Map<number, Task>;
  private plugins: Map<number, Plugin>;
  sessionStore: session.SessionStore;
  
  private userIdCounter: number;
  private sessionIdCounter: number;
  private chainIdCounter: number;
  private taskIdCounter: number;
  private pluginIdCounter: number;

  constructor() {
    this.users = new Map();
    this.botSessions = new Map();
    this.dialogueChains = new Map();
    this.tasks = new Map();
    this.plugins = new Map();
    
    this.userIdCounter = 1;
    this.sessionIdCounter = 1;
    this.chainIdCounter = 1;
    this.taskIdCounter = 1;
    this.pluginIdCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // Очистка раз в 24 часа
    });
  }

  // Реализация методов для пользователей
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const timestamp = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      created_at: timestamp
    };
    this.users.set(id, user);
    return user;
  }

  // Реализация методов для сессий бота
  async getBotSession(id: number): Promise<BotSession | undefined> {
    return this.botSessions.get(id);
  }

  async getBotSessionsByUserId(userId: number): Promise<BotSession[]> {
    return Array.from(this.botSessions.values()).filter(
      (session) => session.owner_id === userId,
    );
  }

  async createBotSession(insertSession: InsertBotSession): Promise<BotSession> {
    const id = this.sessionIdCounter++;
    const timestamp = new Date();
    const session: BotSession = {
      ...insertSession,
      id,
      created_at: timestamp,
      status: "inactive",
    };
    this.botSessions.set(id, session);
    return session;
  }

  async updateBotSession(id: number, updateData: Partial<InsertBotSession>): Promise<BotSession | undefined> {
    const session = this.botSessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updateData };
    this.botSessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteBotSession(id: number): Promise<boolean> {
    return this.botSessions.delete(id);
  }

  // Реализация методов для диалоговых цепочек
  async getDialogueChain(id: number): Promise<DialogueChain | undefined> {
    return this.dialogueChains.get(id);
  }

  async getDialogueChainsByUserId(userId: number): Promise<DialogueChain[]> {
    return Array.from(this.dialogueChains.values()).filter(
      (chain) => chain.owner_id === userId,
    );
  }

  async createDialogueChain(insertChain: InsertDialogueChain): Promise<DialogueChain> {
    const id = this.chainIdCounter++;
    const timestamp = new Date();
    const chain: DialogueChain = {
      ...insertChain,
      id,
      version: 1,
      created_at: timestamp,
      updated_at: timestamp,
      is_active: false,
    };
    this.dialogueChains.set(id, chain);
    return chain;
  }

  async updateDialogueChain(id: number, updateData: Partial<InsertDialogueChain>): Promise<DialogueChain | undefined> {
    const chain = this.dialogueChains.get(id);
    if (!chain) return undefined;
    
    const updatedChain = { 
      ...chain, 
      ...updateData,
      updated_at: new Date(),
      version: chain.version + 1
    };
    this.dialogueChains.set(id, updatedChain);
    return updatedChain;
  }

  async deleteDialogueChain(id: number): Promise<boolean> {
    return this.dialogueChains.delete(id);
  }

  // Реализация методов для задач
  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getTasksByChainId(chainId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.chain_id === chainId,
    );
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.taskIdCounter++;
    const timestamp = new Date();
    const task: Task = {
      ...insertTask,
      id,
      started_at: timestamp,
      status: "pending",
      log: [],
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: number, updateData: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { ...task, ...updateData };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  // Реализация методов для плагинов
  async getPlugin(id: number): Promise<Plugin | undefined> {
    return this.plugins.get(id);
  }

  async getPluginsByUserId(userId: number): Promise<Plugin[]> {
    return Array.from(this.plugins.values()).filter(
      (plugin) => plugin.owner_id === userId,
    );
  }

  async createPlugin(insertPlugin: InsertPlugin): Promise<Plugin> {
    const id = this.pluginIdCounter++;
    const timestamp = new Date();
    const plugin: Plugin = {
      ...insertPlugin,
      id,
      created_at: timestamp,
      enabled: true,
    };
    this.plugins.set(id, plugin);
    return plugin;
  }

  async updatePlugin(id: number, updateData: Partial<InsertPlugin>): Promise<Plugin | undefined> {
    const plugin = this.plugins.get(id);
    if (!plugin) return undefined;
    
    const updatedPlugin = { ...plugin, ...updateData };
    this.plugins.set(id, updatedPlugin);
    return updatedPlugin;
  }

  async deletePlugin(id: number): Promise<boolean> {
    return this.plugins.delete(id);
  }
}

import { DatabaseStorage } from "./database-storage";

export const storage = new DatabaseStorage();
