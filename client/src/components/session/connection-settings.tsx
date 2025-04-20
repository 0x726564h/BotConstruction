import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { TelegramConnectionSettings, TelegramDeviceSettings, telegramClientPresets } from "@shared/schema";
import { Smartphone, Monitor, Apple, Chrome } from "lucide-react";

const presetIcons = {
  android: <Smartphone className="h-4 w-4 mr-2" />,
  ios: <Smartphone className="h-4 w-4 mr-2" />,
  desktop: <Monitor className="h-4 w-4 mr-2" />,
  macos: <Apple className="h-4 w-4 mr-2" />,
  web_k: <Chrome className="h-4 w-4 mr-2" />,
  web_z: <Chrome className="h-4 w-4 mr-2" />,
};

const presetNames = {
  android: "Android",
  ios: "iOS",
  desktop: "Windows",
  macos: "MacOS",
  web_k: "Web K",
  web_z: "Web Z",
};

const connectionSettingsSchema = z.object({
  timeout: z.number().min(1).max(120).default(10),
  request_retries: z.number().min(-1).max(50).default(5),
  connection_retries: z.number().min(-1).max(50).default(5),
  retry_delay: z.number().min(0.1).max(10).default(1),
  auto_reconnect: z.boolean().default(true),
  sequential_updates: z.boolean().default(false),
  flood_sleep_threshold: z.number().min(0).max(300).default(60),
});

const deviceSettingsSchema = z.object({
  device_model: z.string().min(1).default("PC 64bit"),
  system_version: z.string().min(1).default("Windows 10"),
  app_version: z.string().min(1).default("1.0.0"),
  lang_code: z.string().min(1).default("ru"),
  system_lang_code: z.string().min(1).default("ru"),
});

const settingsSchema = z.object({
  api_id: z.string().min(1),
  api_hash: z.string().min(1),
  connection_settings: connectionSettingsSchema,
  device_settings: deviceSettingsSchema,
});

type SettingsForm = z.infer<typeof settingsSchema>;

interface ConnectionSettingsProps {
  defaultApiId?: string;
  defaultApiHash?: string;
  defaultConnectionSettings?: TelegramConnectionSettings;
  defaultDeviceSettings?: TelegramDeviceSettings;
  onSettingsChange: (settings: {
    api_id: string;
    api_hash: string;
    connection_settings: TelegramConnectionSettings;
    device_settings: TelegramDeviceSettings;
  }) => void;
}

export function ConnectionSettings({
  defaultApiId = "",
  defaultApiHash = "",
  defaultConnectionSettings,
  defaultDeviceSettings,
  onSettingsChange
}: ConnectionSettingsProps) {
  const [activeTab, setActiveTab] = useState("presets");

  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      api_id: defaultApiId,
      api_hash: defaultApiHash,
      connection_settings: defaultConnectionSettings || {
        timeout: 10,
        request_retries: 5,
        connection_retries: 5,
        retry_delay: 1,
        auto_reconnect: true,
        sequential_updates: false,
        flood_sleep_threshold: 60,
      },
      device_settings: defaultDeviceSettings || {
        device_model: "PC 64bit",
        system_version: "Windows 10",
        app_version: "1.0.0",
        lang_code: "ru",
        system_lang_code: "ru",
      },
    },
  });

  const handlePresetSelect = (preset: keyof typeof telegramClientPresets) => {
    const presetConfig = telegramClientPresets[preset];
    
    form.setValue("api_id", presetConfig.api_id);
    form.setValue("api_hash", presetConfig.api_hash);
    form.setValue("device_settings", presetConfig.device_settings);
    
    // Обновляем родительский компонент с новыми настройками
    onSettingsChange({
      api_id: presetConfig.api_id,
      api_hash: presetConfig.api_hash,
      connection_settings: form.getValues("connection_settings"),
      device_settings: presetConfig.device_settings,
    });
  };

  const onSubmit = (data: SettingsForm) => {
    onSettingsChange(data);
  };

  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <CardTitle>Настройки подключения Telegram</CardTitle>
        <CardDescription>
          Выберите предустановленные настройки или настройте вручную
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="presets" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="presets">Предустановки</TabsTrigger>
            <TabsTrigger value="advanced">Расширенные</TabsTrigger>
          </TabsList>
          
          <TabsContent value="presets" className="space-y-4 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.keys(telegramClientPresets).map((preset) => (
                <Button
                  key={preset}
                  variant={form.getValues("api_id") === telegramClientPresets[preset as keyof typeof telegramClientPresets].api_id ? "default" : "outline"}
                  className="flex items-center justify-center h-20 w-full"
                  onClick={() => handlePresetSelect(preset as keyof typeof telegramClientPresets)}
                >
                  <div className="flex flex-col items-center">
                    {presetIcons[preset as keyof typeof presetIcons]}
                    <span>{presetNames[preset as keyof typeof presetNames]}</span>
                  </div>
                </Button>
              ))}
            </div>
            
            <div className="space-y-2 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FormLabel>API ID</FormLabel>
                  <Input 
                    value={form.getValues("api_id")} 
                    readOnly 
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel>API Hash</FormLabel>
                  <Input 
                    value={form.getValues("api_hash")} 
                    readOnly 
                    className="bg-muted"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <FormLabel>Модель устройства</FormLabel>
                <Input 
                  value={form.getValues("device_settings.device_model")} 
                  readOnly 
                  className="bg-muted"
                />
              </div>
              
              <div className="space-y-2">
                <FormLabel>Версия системы</FormLabel>
                <Input 
                  value={form.getValues("device_settings.system_version")} 
                  readOnly 
                  className="bg-muted"
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="advanced" className="py-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Основные настройки</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="api_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API ID</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="api_hash"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Hash</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <h3 className="text-lg font-medium mt-6">Настройки подключения</h3>
                  
                  <FormField
                    control={form.control}
                    name="connection_settings.timeout"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Тайм-аут подключения (сек)</FormLabel>
                        <FormControl>
                          <div className="flex items-center space-x-3">
                            <Slider
                              min={1}
                              max={120}
                              step={1}
                              defaultValue={[field.value]}
                              onValueChange={(value) => field.onChange(value[0])}
                              className="flex-1"
                            />
                            <Input
                              type="number"
                              {...field}
                              className="w-16"
                              onChange={e => field.onChange(Number(e.target.value))}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Тайм-аут в секундах для подключения к серверам Telegram
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="connection_settings.request_retries"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Повторы запросов</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              {...field} 
                              onChange={e => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Количество повторов запросов (-1 для бесконечных)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="connection_settings.connection_retries"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Повторы подключения</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              {...field} 
                              onChange={e => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Количество повторов подключения (-1 для бесконечных)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="connection_settings.retry_delay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Задержка между повторами (сек)</FormLabel>
                        <FormControl>
                          <div className="flex items-center space-x-3">
                            <Slider
                              min={0.1}
                              max={10}
                              step={0.1}
                              defaultValue={[field.value]}
                              onValueChange={(value) => field.onChange(value[0])}
                              className="flex-1"
                            />
                            <Input
                              type="number"
                              step={0.1}
                              {...field}
                              className="w-16"
                              onChange={e => field.onChange(Number(e.target.value))}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="connection_settings.auto_reconnect"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Автоматическое переподключение</FormLabel>
                          <FormDescription>
                            Автоматически переподключаться при разрыве соединения
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="connection_settings.sequential_updates"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Последовательные обновления</FormLabel>
                          <FormDescription>
                            Обрабатывать обновления последовательно вместо параллельной обработки
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="connection_settings.flood_sleep_threshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Порог ожидания флуд-контроля (сек)</FormLabel>
                        <FormControl>
                          <div className="flex items-center space-x-3">
                            <Slider
                              min={0}
                              max={300}
                              step={1}
                              defaultValue={[field.value]}
                              onValueChange={(value) => field.onChange(value[0])}
                              className="flex-1"
                            />
                            <Input
                              type="number"
                              {...field}
                              className="w-16"
                              onChange={e => field.onChange(Number(e.target.value))}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Максимальное время ожидания при флуд-контроле
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <h3 className="text-lg font-medium mt-6">Настройки устройства</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="device_settings.device_model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Модель устройства</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="device_settings.system_version"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Версия системы</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="device_settings.app_version"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Версия приложения</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="device_settings.lang_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Код языка</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите язык" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ru">Русский (ru)</SelectItem>
                              <SelectItem value="en">Английский (en)</SelectItem>
                              <SelectItem value="uk">Украинский (uk)</SelectItem>
                              <SelectItem value="be">Белорусский (be)</SelectItem>
                              <SelectItem value="kk">Казахский (kk)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="device_settings.system_lang_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Системный код языка</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите язык" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ru">Русский (ru)</SelectItem>
                              <SelectItem value="en">Английский (en)</SelectItem>
                              <SelectItem value="uk">Украинский (uk)</SelectItem>
                              <SelectItem value="be">Белорусский (be)</SelectItem>
                              <SelectItem value="kk">Казахский (kk)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <Button type="submit" className="w-full">Сохранить настройки</Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}