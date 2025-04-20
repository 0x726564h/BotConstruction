import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, insertUserSchema } from "@shared/schema";
import { z } from "zod";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// Хеширование пароля
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Сравнение паролей
async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "telegram-userbot-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7, // Неделя
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Стратегия аутентификации
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Эндпоинт регистрации
  app.post("/api/register", async (req, res, next) => {
    try {
      // Валидация входных данных
      const userSchema = insertUserSchema.extend({
        email: z.string().email("Неверный формат email"),
        password: z.string().min(6, "Пароль должен содержать минимум 6 символов")
      });
      
      const validatedUser = userSchema.parse(req.body);
      
      // Проверка существования пользователя
      const existingUserByName = await storage.getUserByUsername(validatedUser.username);
      if (existingUserByName) {
        return res.status(400).json({ message: "Пользователь с таким именем уже существует" });
      }
      
      const existingUserByEmail = await storage.getUserByEmail(validatedUser.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Пользователь с таким email уже существует" });
      }

      // Хеширование пароля и создание пользователя
      const user = await storage.createUser({
        ...validatedUser,
        password: await hashPassword(validatedUser.password),
      });

      // Автологин после регистрации
      req.login(user, (err) => {
        if (err) return next(err);
        const userWithoutPassword = { ...user };
        delete userWithoutPassword.password;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      next(error);
    }
  });

  // Эндпоинт логина
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Неверное имя пользователя или пароль" });
      
      req.login(user, (err) => {
        if (err) return next(err);
        const userWithoutPassword = { ...user };
        delete userWithoutPassword.password;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // Эндпоинт выхода
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Эндпоинт получения данных текущего пользователя
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userWithoutPassword = { ...req.user };
    delete userWithoutPassword.password;
    res.json(userWithoutPassword);
  });
}
