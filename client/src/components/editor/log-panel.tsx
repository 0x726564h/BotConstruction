import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Trash2, Download, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LogPanelProps {
  logs: string[];
}

export function LogPanel({ logs = [] }: LogPanelProps) {
  const { toast } = useToast();
  const [displayLogs, setDisplayLogs] = useState<string[]>([]);
  const [filter, setFilter] = useState({
    info: true,
    warning: true,
    error: true,
    debug: true
  });
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Автоматическая прокрутка при добавлении логов
  useEffect(() => {
    // Применяем фильтрацию к логам
    const filteredLogs = logs.filter(log => {
      if (log.includes('[INFO]') && !filter.info) return false;
      if (log.includes('[WARNING]') && !filter.warning) return false;
      if (log.includes('[ERROR]') && !filter.error) return false;
      if (log.includes('[DEBUG]') && !filter.debug) return false;
      return true;
    });
    
    setDisplayLogs(filteredLogs);
    
    // Прокручиваем вниз при добавлении новых логов
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        setTimeout(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 0);
      }
    }
  }, [logs, filter]);
  
  // Очистка логов
  const handleClearLogs = () => {
    setDisplayLogs([]);
    toast({
      title: 'Логи очищены',
      description: 'Панель логов была очищена',
    });
  };
  
  // Экспорт логов
  const handleExportLogs = () => {
    try {
      const logText = displayLogs.join('\n');
      const blob = new Blob([logText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `telegram-userbot-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      toast({
        title: 'Логи экспортированы',
        description: 'Файл логов успешно скачан',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось экспортировать логи',
        variant: 'destructive',
      });
    }
  };
  
  // Определение типа лога и возврат соответствующего цвета
  const getLogBadge = (log: string) => {
    if (log.includes('[ERROR]')) {
      return <Badge variant="destructive" className="mr-2 mb-1">Ошибка</Badge>;
    } else if (log.includes('[WARNING]')) {
      return <Badge variant="outline" className="bg-yellow-900 text-yellow-300 border-yellow-700 mr-2 mb-1">Предупреждение</Badge>;
    } else if (log.includes('[INFO]')) {
      return <Badge variant="outline" className="bg-blue-900 text-blue-300 border-blue-700 mr-2 mb-1">Инфо</Badge>;
    } else if (log.includes('[DEBUG]')) {
      return <Badge variant="outline" className="bg-gray-800 text-gray-300 border-gray-700 mr-2 mb-1">Отладка</Badge>;
    }
    return null;
  };
  
  // Форматирование лога с выделением времени и типа
  const formatLog = (log: string) => {
    // Пример паттерна: [14:30:45] [INFO] Сообщение лога
    const timeMatch = log.match(/\[(\d{2}:\d{2}:\d{2})\]/);
    const time = timeMatch ? timeMatch[1] : '';
    
    const logWithoutTime = timeMatch ? log.replace(timeMatch[0], '') : log;
    
    return (
      <div className="flex flex-wrap items-start mb-1">
        {time && <span className="text-gray-500 mr-2">[{time}]</span>}
        {getLogBadge(log)}
        <span>{logWithoutTime.replace(/\[(INFO|WARNING|ERROR|DEBUG)\]/g, '')}</span>
      </div>
    );
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h3 className="text-lg font-medium">Логи выполнения</h3>
        
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
              <DropdownMenuCheckboxItem
                checked={filter.info}
                onCheckedChange={(checked) => setFilter({ ...filter, info: !!checked })}
              >
                Информация
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filter.warning}
                onCheckedChange={(checked) => setFilter({ ...filter, warning: !!checked })}
              >
                Предупреждения
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filter.error}
                onCheckedChange={(checked) => setFilter({ ...filter, error: !!checked })}
              >
                Ошибки
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filter.debug}
                onCheckedChange={(checked) => setFilter({ ...filter, debug: !!checked })}
              >
                Отладка
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleExportLogs}
            disabled={displayLogs.length === 0}
          >
            <Download className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleClearLogs}
            disabled={displayLogs.length === 0}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        {displayLogs.length > 0 ? (
          <div className="space-y-1 text-sm">
            {displayLogs.map((log, index) => (
              <div key={index} className={`
                py-1 border-b border-gray-800 
                ${log.includes('[ERROR]') ? 'text-red-400' : 
                  log.includes('[WARNING]') ? 'text-yellow-400' : 
                  log.includes('[DEBUG]') ? 'text-gray-400' : 'text-gray-200'}
              `}>
                {formatLog(log)}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-500">
            <p>Логи пока отсутствуют</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
