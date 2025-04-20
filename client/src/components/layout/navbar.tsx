import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { BotIcon, LayoutDashboard, Settings, PuzzleIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useWebSocket } from "@/hooks/use-websocket";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BotSession } from "@shared/schema";

export function Navbar() {
  const { user, logoutMutation } = useAuth();
  const [location, navigate] = useLocation();
  const { status: wsStatus } = useWebSocket();
  const [activePath, setActivePath] = useState("");
  
  // Получение активной сессии из бота
  const { data: sessions } = useQuery<BotSession[]>({
    queryKey: ['/api/sessions'],
    enabled: !!user
  });
  
  const activeSession = sessions?.find(s => s.status === 'active');
  
  useEffect(() => {
    setActivePath(location);
  }, [location]);
  
  const handleLogout = () => {
    logoutMutation.mutate();
    navigate("/auth");
  };
  
  return (
    <header className="bg-gray-900 border-b border-gray-800 h-14 flex items-center px-4">
      <div className="flex items-center space-x-4">
        <div className="text-primary-500 text-2xl">
          <BotIcon />
        </div>
        <h1 className="text-lg font-medium">Telegram UserBot</h1>
      </div>
      
      <div className="flex items-center space-x-6 ml-12">
        <Button 
          variant={activePath === "/" ? "default" : "ghost"} 
          onClick={() => navigate("/")}
          className="flex items-center text-gray-200"
        >
          <LayoutDashboard className="mr-2 h-4 w-4" />
          <span>Дашборд</span>
        </Button>
        
        <Button 
          variant={activePath.startsWith("/editor") ? "default" : "ghost"} 
          onClick={() => navigate("/editor")}
          className="flex items-center text-gray-200"
        >
          <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
          <span>Редактор цепочек</span>
        </Button>
        
        <Button 
          variant={activePath === "/plugins" ? "default" : "ghost"} 
          onClick={() => navigate("/plugins")}
          className="flex items-center text-gray-200"
        >
          <PuzzleIcon className="mr-2 h-4 w-4" />
          <span>Плагины</span>
        </Button>
        
        <Button 
          variant={activePath === "/settings" ? "default" : "ghost"} 
          onClick={() => navigate("/settings")}
          className="flex items-center text-gray-200"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Настройки</span>
        </Button>
      </div>
      
      <div className="ml-auto flex items-center space-x-4">
        <div className="relative">
          <Button 
            variant="outline" 
            className={`flex items-center px-3 py-1.5 rounded-full text-sm ${
              activeSession 
                ? "bg-green-900 text-green-300" 
                : "bg-gray-800 text-gray-300"
            }`}
          >
            <span className={`h-2 w-2 rounded-full mr-2 ${activeSession ? "bg-green-500" : "bg-gray-500"}`}></span>
            <span>{activeSession ? "Активен" : "Не активен"}</span>
          </Button>
        </div>
        
        <div className="relative">
          <span 
            className={`absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-gray-900 ${
              wsStatus === 'connected' ? 'bg-green-500' : 
              wsStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
            }`}
          ></span>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/settings")}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center text-gray-300 hover:text-white"
            >
              <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
                <span className="text-sm">{user?.username?.charAt(0).toUpperCase()}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              Профиль
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              Выйти
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
