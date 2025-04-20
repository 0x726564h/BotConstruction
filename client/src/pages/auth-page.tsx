import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { BotIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { insertUserSchema, loginSchema } from "@shared/schema";

// Расширяем схему для валидации
const extendedLoginSchema = loginSchema.extend({
  username: z.string().min(3, "Имя пользователя должно содержать минимум 3 символа"),
  password: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
});

const extendedRegisterSchema = insertUserSchema.extend({
  username: z.string().min(3, "Имя пользователя должно содержать минимум 3 символа"),
  password: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
  email: z.string().email("Введите корректный email адрес"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof extendedLoginSchema>;
type RegisterFormData = z.infer<typeof extendedRegisterSchema>;

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("login");

  // Форма для входа
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(extendedLoginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Форма для регистрации
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(extendedRegisterSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Обработчик входа
  const onLogin = (data: LoginFormData) => {
    loginMutation.mutate(data, {
      onSuccess: () => {
        navigate("/");
      }
    });
  };

  // Обработчик регистрации
  const onRegister = (data: RegisterFormData) => {
    // Удаляем подтверждение пароля перед отправкой
    const { confirmPassword, ...userData } = data;
    
    registerMutation.mutate(userData, {
      onSuccess: () => {
        navigate("/");
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Информационная часть */}
        <div className="hidden md:flex flex-col justify-center p-8 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="flex items-center space-x-2 mb-8">
            <BotIcon className="h-10 w-10 text-primary-500" />
            <h1 className="text-3xl font-bold text-white">Telegram UserBot</h1>
          </div>
          
          <h2 className="text-2xl font-semibold text-white mb-4">
            Модульный бот с визуальным редактором диалоговых цепочек
          </h2>
          
          <p className="text-gray-300 mb-6">
            Создавайте, редактируйте и управляйте диалоговыми цепочками через удобный визуальный интерфейс. 
            Используйте всю мощь Telegram API через наш модульный бот.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="h-6 w-6 rounded-full bg-primary-900 flex items-center justify-center text-primary-400 mr-3 mt-0.5">
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-white">Визуальный редактор цепочек</h3>
                <p className="text-gray-400 text-sm">Создавайте сложные диалоговые сценарии с помощью drag-and-drop редактора</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="h-6 w-6 rounded-full bg-primary-900 flex items-center justify-center text-primary-400 mr-3 mt-0.5">
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-white">Интеграция с Telegram API</h3>
                <p className="text-gray-400 text-sm">Полный доступ к Telethon и Telegram API</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="h-6 w-6 rounded-full bg-primary-900 flex items-center justify-center text-primary-400 mr-3 mt-0.5">
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-white">Обновления в реальном времени</h3>
                <p className="text-gray-400 text-sm">WebSocket соединение для мгновенных уведомлений о событиях</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="h-6 w-6 rounded-full bg-primary-900 flex items-center justify-center text-primary-400 mr-3 mt-0.5">
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-white">Модульная система плагинов</h3>
                <p className="text-gray-400 text-sm">Расширяйте функциональность с помощью плагинов</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Форма авторизации */}
        <div className="w-full max-w-md mx-auto">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-center mb-2">
                <BotIcon className="h-10 w-10 text-primary-500" />
              </div>
              <CardTitle className="text-2xl font-bold text-center">
                {activeTab === "login" ? "Вход в аккаунт" : "Регистрация"}
              </CardTitle>
              <CardDescription className="text-center text-gray-400">
                {activeTab === "login" 
                  ? "Войдите в свой аккаунт для доступа к боту" 
                  : "Создайте новый аккаунт для начала работы"}
              </CardDescription>
            </CardHeader>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-900/50">
                <TabsTrigger value="login">Вход</TabsTrigger>
                <TabsTrigger value="register">Регистрация</TabsTrigger>
              </TabsList>
              
              <CardContent className="pt-6">
                <TabsContent value="login" className="mt-0">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Имя пользователя</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="username" 
                                className="bg-gray-900 border-gray-700"
                                disabled={loginMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Пароль</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="password" 
                                placeholder="********" 
                                className="bg-gray-900 border-gray-700"
                                disabled={loginMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Выполняется вход..." : "Войти"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
                
                <TabsContent value="register" className="mt-0">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Имя пользователя</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="username" 
                                className="bg-gray-900 border-gray-700"
                                disabled={registerMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="email" 
                                placeholder="example@mail.com" 
                                className="bg-gray-900 border-gray-700"
                                disabled={registerMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Пароль</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="password" 
                                placeholder="********" 
                                className="bg-gray-900 border-gray-700"
                                disabled={registerMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Подтверждение пароля</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="password" 
                                placeholder="********" 
                                className="bg-gray-900 border-gray-700"
                                disabled={registerMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? "Регистрация..." : "Зарегистрироваться"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </CardContent>
            </Tabs>
            
            <CardFooter className="flex flex-col space-y-4 pt-0">
              <div className="text-sm text-gray-400 text-center">
                {activeTab === "login" 
                  ? "Еще нет аккаунта? " 
                  : "Уже есть аккаунт? "}
                <Button 
                  variant="link" 
                  className="p-0 h-auto font-normal text-primary-400 hover:text-primary-300"
                  onClick={() => setActiveTab(activeTab === "login" ? "register" : "login")}
                >
                  {activeTab === "login" ? "Зарегистрироваться" : "Войти"}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
