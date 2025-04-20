import { useState, useEffect } from 'react';
import { NodeData } from '@shared/schema';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Pencil } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose 
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';

interface NodePropertiesProps {
  node: any;
  onUpdateNodeData: (data: any) => void;
}

export function NodeProperties({ node, onUpdateNodeData }: NodePropertiesProps) {
  const [nodeData, setNodeData] = useState({ ...node.data });
  
  // Обновляем локальные данные при изменении узла
  useEffect(() => {
    setNodeData({ ...node.data });
  }, [node]);
  
  // Обновление данных узла в реальном времени
  const updateNodeData = (changes: any) => {
    const updatedData = { ...nodeData, ...changes };
    setNodeData(updatedData);
    onUpdateNodeData(updatedData);
  };
  
  // Функция для рендеринга свойств в зависимости от типа узла
  const renderNodeProperties = () => {
    switch (node.type) {
      case 'start':
        return renderStartNodeProperties();
      case 'message':
        return renderMessageNodeProperties();
      case 'condition':
        return renderConditionNodeProperties();
      case 'action':
        return renderActionNodeProperties();
      case 'delay':
        return renderDelayNodeProperties();
      case 'api_request':
        return renderApiRequestNodeProperties();
      case 'data_collection':
        return renderDataCollectionNodeProperties();
      default:
        return <p className="text-gray-500">Выберите узел для настройки</p>;
    }
  };
  
  // Свойства для узла "Старт"
  const renderStartNodeProperties = () => (
    <div className="space-y-4">
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Название узла</Label>
        <Input 
          type="text"
          value={nodeData.label || 'Начало цепочки'}
          onChange={(e) => updateNodeData({ label: e.target.value })}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Описание</Label>
        <Textarea 
          rows={3}
          value={nodeData.description || ''}
          onChange={(e) => updateNodeData({ description: e.target.value })}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Описание узла начала цепочки"
        />
      </div>
      
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Условие запуска</Label>
        <div className="space-y-2">
          <div className="flex items-center">
            <Checkbox 
              id="start-on-message" 
              checked={nodeData.startOnMessage}
              onCheckedChange={(checked) => updateNodeData({ startOnMessage: checked })}
              className="mr-2" 
            />
            <Label htmlFor="start-on-message" className="text-sm">Запуск при получении сообщения</Label>
          </div>
          <div className="flex items-center">
            <Checkbox 
              id="start-on-join" 
              checked={nodeData.startOnJoin}
              onCheckedChange={(checked) => updateNodeData({ startOnJoin: checked })}
              className="mr-2" 
            />
            <Label htmlFor="start-on-join" className="text-sm">Запуск при присоединении пользователя</Label>
          </div>
          <div className="flex items-center">
            <Checkbox 
              id="start-on-command" 
              checked={nodeData.startOnCommand}
              onCheckedChange={(checked) => updateNodeData({ startOnCommand: checked })}
              className="mr-2" 
            />
            <Label htmlFor="start-on-command" className="text-sm">Запуск по команде</Label>
          </div>
        </div>
      </div>
      
      {nodeData.startOnCommand && (
        <div>
          <Label className="block text-sm font-medium text-gray-400 mb-1">Команда для запуска</Label>
          <Input 
            type="text"
            value={nodeData.command || ''}
            onChange={(e) => updateNodeData({ command: e.target.value })}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="/start"
          />
        </div>
      )}
    </div>
  );
  
  // Свойства для узла "Сообщение"
  const renderMessageNodeProperties = () => (
    <div className="space-y-4">
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Название узла</Label>
        <Input 
          type="text"
          value={nodeData.label || 'Сообщение'}
          onChange={(e) => updateNodeData({ label: e.target.value })}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Описание</Label>
        <Input 
          type="text"
          value={nodeData.description || ''}
          onChange={(e) => updateNodeData({ description: e.target.value })}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Опишите назначение этого сообщения"
        />
      </div>
      
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Текст сообщения</Label>
        <Textarea 
          rows={5}
          value={nodeData.messageText || ''}
          onChange={(e) => updateNodeData({ messageText: e.target.value })}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
          placeholder="Введите текст сообщения"
        />
      </div>
      
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Формат сообщения</Label>
        <RadioGroup 
          value={nodeData.format || 'text'} 
          onValueChange={(value) => updateNodeData({ format: value })}
          className="flex items-center space-x-4 text-sm"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="text" id="format-text" />
            <Label htmlFor="format-text">Текст</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="html" id="format-html" />
            <Label htmlFor="format-html">HTML</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="markdown" id="format-markdown" />
            <Label htmlFor="format-markdown">Markdown</Label>
          </div>
        </RadioGroup>
      </div>
      
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Добавить кнопки</Label>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-2">
            {nodeData.buttons?.length > 0 ? (
              <div className="space-y-2 mb-2">
                {nodeData.buttons.map((button: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{`Кнопка ${index + 1}: "${button.text}"`}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-gray-400 hover:text-white"
                      onClick={() => {
                        // Редактирование кнопки через диалог
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
            
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full text-sm bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  <span>Добавить кнопку</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-700">
                <DialogHeader>
                  <DialogTitle>Добавить кнопку</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="button-text">Текст кнопки</Label>
                    <Input 
                      id="button-text" 
                      className="bg-gray-800 border-gray-700" 
                      placeholder="Нажми меня" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="button-url">URL (опционально)</Label>
                    <Input 
                      id="button-url" 
                      className="bg-gray-800 border-gray-700" 
                      placeholder="https://example.com" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="button-callback">Callback данные (опционально)</Label>
                    <Input 
                      id="button-callback" 
                      className="bg-gray-800 border-gray-700" 
                      placeholder="callback_data" 
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <DialogClose asChild>
                    <Button variant="outline">Отмена</Button>
                  </DialogClose>
                  <Button>Добавить</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
      
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Задержка перед отправкой</Label>
        <div className="flex items-center">
          <Input 
            type="number" 
            min={0} 
            max={30} 
            value={nodeData.delay || 0}
            onChange={(e) => updateNodeData({ delay: parseInt(e.target.value) })}
            className="w-20 bg-gray-800 text-white px-3 py-2 rounded-l border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <span className="bg-gray-700 text-gray-400 px-3 py-2 rounded-r border border-l-0 border-gray-700">секунд</span>
        </div>
      </div>
      
      <div className="pt-2">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Дополнительные настройки</h4>
        <div className="space-y-2">
          <div className="flex items-center">
            <Checkbox 
              id="send-once" 
              checked={nodeData.sendOnce}
              onCheckedChange={(checked) => updateNodeData({ sendOnce: checked })}
              className="mr-2" 
            />
            <Label htmlFor="send-once" className="text-sm">Отправить только один раз</Label>
          </div>
          <div className="flex items-center">
            <Checkbox 
              id="add-media" 
              checked={nodeData.hasMedia}
              onCheckedChange={(checked) => updateNodeData({ hasMedia: checked })}
              className="mr-2" 
            />
            <Label htmlFor="add-media" className="text-sm">Добавить медиа-файл</Label>
          </div>
        </div>
      </div>
    </div>
  );
  
  // Свойства для узла "Условие"
  const renderConditionNodeProperties = () => (
    <div className="space-y-4">
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Название узла</Label>
        <Input 
          type="text"
          value={nodeData.label || 'Условие'}
          onChange={(e) => updateNodeData({ label: e.target.value })}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Описание</Label>
        <Input 
          type="text"
          value={nodeData.description || ''}
          onChange={(e) => updateNodeData({ description: e.target.value })}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Опишите проверяемое условие"
        />
      </div>
      
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Тип условия</Label>
        <RadioGroup 
          value={nodeData.conditionType || 'message'} 
          onValueChange={(value) => updateNodeData({ conditionType: value })}
          className="flex flex-col space-y-2 text-sm"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="message" id="condition-message" />
            <Label htmlFor="condition-message">Проверка содержимого сообщения</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="user" id="condition-user" />
            <Label htmlFor="condition-user">Проверка данных пользователя</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="callback" id="condition-callback" />
            <Label htmlFor="condition-callback">Проверка callback данных</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="custom" id="condition-custom" />
            <Label htmlFor="condition-custom">Пользовательское выражение</Label>
          </div>
        </RadioGroup>
      </div>
      
      {nodeData.conditionType === 'message' && (
        <div>
          <Label className="block text-sm font-medium text-gray-400 mb-1">Проверка сообщения</Label>
          <Input 
            type="text"
            value={nodeData.messagePattern || ''}
            onChange={(e) => updateNodeData({ messagePattern: e.target.value })}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Паттерн для проверки сообщения"
          />
          <p className="text-xs text-gray-500 mt-1">Поддерживаются регулярные выражения</p>
        </div>
      )}
      
      {nodeData.conditionType === 'user' && (
        <div>
          <Label className="block text-sm font-medium text-gray-400 mb-1">Проверка пользователя</Label>
          <div className="space-y-2">
            <select 
              value={nodeData.userField || 'username'} 
              onChange={(e) => updateNodeData({ userField: e.target.value })}
              className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="username">Имя пользователя</option>
              <option value="id">ID пользователя</option>
              <option value="is_bot">Является ботом</option>
              <option value="language_code">Код языка</option>
            </select>
            <Input 
              type="text"
              value={nodeData.userValue || ''}
              onChange={(e) => updateNodeData({ userValue: e.target.value })}
              className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Значение для проверки"
            />
          </div>
        </div>
      )}
      
      {nodeData.conditionType === 'custom' && (
        <div>
          <Label className="block text-sm font-medium text-gray-400 mb-1">Пользовательское выражение</Label>
          <Textarea 
            rows={4}
            value={nodeData.customExpression || ''}
            onChange={(e) => updateNodeData({ customExpression: e.target.value })}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
            placeholder="user.id > 1000 && user.username.startsWith('admin')"
          />
          <p className="text-xs text-gray-500 mt-1">JavaScript выражение, доступны переменные: user, message, context</p>
        </div>
      )}
      
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Метки для выходов</Label>
        <div className="space-y-2">
          <div>
            <Label className="text-xs text-gray-500">Метка для "Да"</Label>
            <Input 
              type="text"
              value={nodeData.yesLabel || 'Да'}
              onChange={(e) => updateNodeData({ yesLabel: e.target.value })}
              className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Метка для "Нет"</Label>
            <Input 
              type="text"
              value={nodeData.noLabel || 'Нет'}
              onChange={(e) => updateNodeData({ noLabel: e.target.value })}
              className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
  
  // Свойства для узла "Действие"
  const renderActionNodeProperties = () => (
    <div className="space-y-4">
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Название узла</Label>
        <Input 
          type="text"
          value={nodeData.label || 'Действие'}
          onChange={(e) => updateNodeData({ label: e.target.value })}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Описание</Label>
        <Input 
          type="text"
          value={nodeData.description || ''}
          onChange={(e) => updateNodeData({ description: e.target.value })}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Опишите выполняемое действие"
        />
      </div>
      
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Тип действия</Label>
        <select 
          value={nodeData.actionType || 'code'} 
          onChange={(e) => updateNodeData({ actionType: e.target.value })}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="code">Выполнить код</option>
          <option value="function">Вызвать функцию</option>
          <option value="status">Изменить статус</option>
          <option value="variable">Установить переменную</option>
        </select>
      </div>
      
      {nodeData.actionType === 'code' && (
        <div>
          <Label className="block text-sm font-medium text-gray-400 mb-1">Код действия</Label>
          <Textarea 
            rows={5}
            value={nodeData.actionCode || ''}
            onChange={(e) => updateNodeData({ actionCode: e.target.value })}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
            placeholder="// Пример кода\nconst result = await context.doSomething();\nreturn result;"
          />
        </div>
      )}
      
      {nodeData.actionType === 'function' && (
        <div>
          <Label className="block text-sm font-medium text-gray-400 mb-1">Функция</Label>
          <Input 
            type="text"
            value={nodeData.functionName || ''}
            onChange={(e) => updateNodeData({ functionName: e.target.value })}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Имя функции"
          />
          <div className="mt-2">
            <Label className="block text-sm font-medium text-gray-400 mb-1">Параметры (JSON)</Label>
            <Textarea 
              rows={3}
              value={nodeData.functionParams || '{}'}
              onChange={(e) => updateNodeData({ functionParams: e.target.value })}
              className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
              placeholder='{"param1": "value1", "param2": "value2"}'
            />
          </div>
        </div>
      )}
      
      {nodeData.actionType === 'variable' && (
        <div>
          <Label className="block text-sm font-medium text-gray-400 mb-1">Имя переменной</Label>
          <Input 
            type="text"
            value={nodeData.variableName || ''}
            onChange={(e) => updateNodeData({ variableName: e.target.value })}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="myVariable"
          />
          <div className="mt-2">
            <Label className="block text-sm font-medium text-gray-400 mb-1">Значение</Label>
            <Input 
              type="text"
              value={nodeData.variableValue || ''}
              onChange={(e) => updateNodeData({ variableValue: e.target.value })}
              className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Значение переменной"
            />
          </div>
        </div>
      )}
      
      <div className="pt-2">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Дополнительные настройки</h4>
        <div className="flex items-center">
          <Checkbox 
            id="continue-on-error" 
            checked={nodeData.continueOnError}
            onCheckedChange={(checked) => updateNodeData({ continueOnError: checked })}
            className="mr-2" 
          />
          <Label htmlFor="continue-on-error" className="text-sm">Продолжить при ошибке</Label>
        </div>
      </div>
    </div>
  );
  
  // Свойства для узла "Задержка"
  const renderDelayNodeProperties = () => (
    <div className="space-y-4">
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Название узла</Label>
        <Input 
          type="text"
          value={nodeData.label || 'Задержка'}
          onChange={(e) => updateNodeData({ label: e.target.value })}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Описание</Label>
        <Input 
          type="text"
          value={nodeData.description || ''}
          onChange={(e) => updateNodeData({ description: e.target.value })}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Опишите назначение задержки"
        />
      </div>
      
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Время задержки</Label>
        <div className="flex items-center">
          <Input 
            type="number" 
            min={1} 
            max={3600} 
            value={nodeData.delaySeconds || 5}
            onChange={(e) => updateNodeData({ delaySeconds: parseInt(e.target.value) })}
            className="w-20 bg-gray-800 text-white px-3 py-2 rounded-l border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <select 
            value={nodeData.delayUnit || 'seconds'} 
            onChange={(e) => updateNodeData({ delayUnit: e.target.value })}
            className="bg-gray-700 text-gray-200 px-3 py-2 rounded-r border border-l-0 border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="seconds">секунд</option>
            <option value="minutes">минут</option>
            <option value="hours">часов</option>
          </select>
        </div>
      </div>
      
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Тип задержки</Label>
        <RadioGroup 
          value={nodeData.delayType || 'fixed'} 
          onValueChange={(value) => updateNodeData({ delayType: value })}
          className="flex flex-col space-y-2 text-sm"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="fixed" id="delay-fixed" />
            <Label htmlFor="delay-fixed">Фиксированная</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="random" id="delay-random" />
            <Label htmlFor="delay-random">Случайная</Label>
          </div>
        </RadioGroup>
      </div>
      
      {nodeData.delayType === 'random' && (
        <div>
          <Label className="block text-sm font-medium text-gray-400 mb-1">Диапазон случайной задержки</Label>
          <div className="flex items-center space-x-2">
            <Input 
              type="number" 
              min={1} 
              max={3600} 
              value={nodeData.delayMin || 1}
              onChange={(e) => updateNodeData({ delayMin: parseInt(e.target.value) })}
              className="w-20 bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <span className="text-gray-400">до</span>
            <Input 
              type="number" 
              min={1} 
              max={3600} 
              value={nodeData.delayMax || 10}
              onChange={(e) => updateNodeData({ delayMax: parseInt(e.target.value) })}
              className="w-20 bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <span className="text-gray-400">
              {nodeData.delayUnit === 'seconds' ? 'сек.' :
               nodeData.delayUnit === 'minutes' ? 'мин.' : 'час.'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
  
  // Свойства для узла "API запрос"
  const renderApiRequestNodeProperties = () => (
    <div className="space-y-4">
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Название узла</Label>
        <Input 
          type="text"
          value={nodeData.label || 'API запрос'}
          onChange={(e) => updateNodeData({ label: e.target.value })}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Описание</Label>
        <Input 
          type="text"
          value={nodeData.description || ''}
          onChange={(e) => updateNodeData({ description: e.target.value })}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Опишите назначение API запроса"
        />
      </div>
      
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">URL</Label>
        <Input 
          type="text"
          value={nodeData.url || ''}
          onChange={(e) => updateNodeData({ url: e.target.value })}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="https://api.example.com/endpoint"
        />
      </div>
      
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Метод</Label>
        <select 
          value={nodeData.method || 'GET'} 
          onChange={(e) => updateNodeData({ method: e.target.value })}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
        </select>
      </div>
      
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Заголовки (JSON)</Label>
        <Textarea 
          rows={3}
          value={nodeData.headers || '{}'}
          onChange={(e) => updateNodeData({ headers: e.target.value })}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
          placeholder='{"Content-Type": "application/json", "Authorization": "Bearer {token}"}'
        />
      </div>
      
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Тело запроса (JSON)</Label>
        <Textarea 
          rows={4}
          value={nodeData.body || '{}'}
          onChange={(e) => updateNodeData({ body: e.target.value })}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
          placeholder='{"key": "value", "data": {"nested": "value"}}'
        />
      </div>
      
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Результат в переменную</Label>
        <Input 
          type="text"
          value={nodeData.resultVariable || 'apiResult'}
          onChange={(e) => updateNodeData({ resultVariable: e.target.value })}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Имя переменной для результата"
        />
      </div>
      
      <div className="pt-2">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Дополнительные настройки</h4>
        <div className="space-y-2">
          <div className="flex items-center">
            <Checkbox 
              id="api-continue-on-error" 
              checked={nodeData.continueOnError}
              onCheckedChange={(checked) => updateNodeData({ continueOnError: checked })}
              className="mr-2" 
            />
            <Label htmlFor="api-continue-on-error" className="text-sm">Продолжить при ошибке</Label>
          </div>
          <div className="flex items-center">
            <Checkbox 
              id="api-retry" 
              checked={nodeData.retry}
              onCheckedChange={(checked) => updateNodeData({ retry: checked })}
              className="mr-2" 
            />
            <Label htmlFor="api-retry" className="text-sm">Повторять при ошибке</Label>
          </div>
        </div>
      </div>
      
      {nodeData.retry && (
        <div>
          <Label className="block text-sm font-medium text-gray-400 mb-1">Количество повторов</Label>
          <Input 
            type="number" 
            min={1} 
            max={10} 
            value={nodeData.retryCount || 3}
            onChange={(e) => updateNodeData({ retryCount: parseInt(e.target.value) })}
            className="w-20 bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      )}
    </div>
  );
  
  // Свойства для узла "Сбор данных"
  const renderDataCollectionNodeProperties = () => (
    <div className="space-y-4">
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Название узла</Label>
        <Input 
          type="text"
          value={nodeData.label || 'Сбор данных'}
          onChange={(e) => updateNodeData({ label: e.target.value })}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Описание</Label>
        <Input 
          type="text"
          value={nodeData.description || ''}
          onChange={(e) => updateNodeData({ description: e.target.value })}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Опишите собираемые данные"
        />
      </div>
      
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Тип сбора данных</Label>
        <select 
          value={nodeData.dataCollectionType || 'text'} 
          onChange={(e) => updateNodeData({ dataCollectionType: e.target.value })}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="text">Текст</option>
          <option value="number">Число</option>
          <option value="date">Дата</option>
          <option value="location">Геолокация</option>
          <option value="file">Файл</option>
          <option value="choice">Выбор из вариантов</option>
        </select>
      </div>
      
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Запрос к пользователю</Label>
        <Textarea 
          rows={3}
          value={nodeData.prompt || ''}
          onChange={(e) => updateNodeData({ prompt: e.target.value })}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Пожалуйста, введите ваше имя:"
        />
      </div>
      
      {nodeData.dataCollectionType === 'choice' && (
        <div>
          <Label className="block text-sm font-medium text-gray-400 mb-1">Варианты выбора (по одному на строку)</Label>
          <Textarea 
            rows={4}
            value={nodeData.choices || ''}
            onChange={(e) => updateNodeData({ choices: e.target.value })}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Вариант 1&#10;Вариант 2&#10;Вариант 3"
          />
        </div>
      )}
      
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Переменная для сохранения</Label>
        <Input 
          type="text"
          value={nodeData.variableName || ''}
          onChange={(e) => updateNodeData({ variableName: e.target.value })}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Имя переменной"
        />
      </div>
      
      <div>
        <Label className="block text-sm font-medium text-gray-400 mb-1">Валидация</Label>
        <div className="space-y-2">
          <div className="flex items-center">
            <Checkbox 
              id="validate-data" 
              checked={nodeData.validate}
              onCheckedChange={(checked) => updateNodeData({ validate: checked })}
              className="mr-2" 
            />
            <Label htmlFor="validate-data" className="text-sm">Использовать валидацию</Label>
          </div>
        </div>
      </div>
      
      {nodeData.validate && (
        <div>
          <Label className="block text-sm font-medium text-gray-400 mb-1">Выражение для валидации</Label>
          <Input 
            type="text"
            value={nodeData.validationExpression || ''}
            onChange={(e) => updateNodeData({ validationExpression: e.target.value })}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Например: value.length > 3"
          />
          <div className="mt-2">
            <Label className="block text-sm font-medium text-gray-400 mb-1">Сообщение об ошибке</Label>
            <Input 
              type="text"
              value={nodeData.validationErrorMessage || ''}
              onChange={(e) => updateNodeData({ validationErrorMessage: e.target.value })}
              className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Ошибка валидации. Пожалуйста, попробуйте снова."
            />
          </div>
        </div>
      )}
      
      <div className="pt-2">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Дополнительные настройки</h4>
        <div className="space-y-2">
          <div className="flex items-center">
            <Checkbox 
              id="data-collection-timeout" 
              checked={nodeData.useTimeout}
              onCheckedChange={(checked) => updateNodeData({ useTimeout: checked })}
              className="mr-2" 
            />
            <Label htmlFor="data-collection-timeout" className="text-sm">Использовать таймаут</Label>
          </div>
        </div>
      </div>
      
      {nodeData.useTimeout && (
        <div>
          <Label className="block text-sm font-medium text-gray-400 mb-1">Таймаут (в секундах)</Label>
          <Input 
            type="number" 
            min={1} 
            max={3600} 
            value={nodeData.timeoutSeconds || 60}
            onChange={(e) => updateNodeData({ timeoutSeconds: parseInt(e.target.value) })}
            className="w-20 bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      )}
    </div>
  );
  
  return (
    <div className="p-4">
      <h3 className="text-lg font-medium mb-4">Настройка узла</h3>
      
      {/* Индикатор типа узла */}
      <div className="mb-4">
        <span className={`
          text-xs px-2 py-0.5 rounded-full
          ${node.type === 'start' ? 'bg-primary-600 text-white' :
            node.type === 'message' ? 'bg-green-600 text-white' :
            node.type === 'condition' ? 'bg-yellow-600 text-white' :
            node.type === 'action' ? 'bg-red-600 text-white' :
            node.type === 'delay' ? 'bg-purple-600 text-white' :
            node.type === 'api_request' ? 'bg-blue-600 text-white' :
            'bg-pink-600 text-white'}
        `}>
          {node.type === 'start' ? 'Старт' :
           node.type === 'message' ? 'Сообщение' :
           node.type === 'condition' ? 'Условие' :
           node.type === 'action' ? 'Действие' :
           node.type === 'delay' ? 'Задержка' :
           node.type === 'api_request' ? 'API запрос' :
           'Сбор данных'}
        </span>
        <span className="text-sm text-gray-400 ml-2">ID: {node.id}</span>
      </div>
      
      {/* Форма свойств узла */}
      {renderNodeProperties()}
    </div>
  );
}
