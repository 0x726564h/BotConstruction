import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCcw, AlertTriangle } from "lucide-react";
import { useWebSocket } from "@/hooks/use-websocket";

import { TelegramConnectionSettings, TelegramDeviceSettings } from "@shared/schema";

interface QRLoginProps {
  sessionId: number;
  apiId: string;
  apiHash: string;
  connectionSettings?: TelegramConnectionSettings;
  deviceSettings?: TelegramDeviceSettings;
  onSessionStringReceived: (sessionString: string) => void;
  onError?: (error: string) => void;
}

export function QRLogin({ 
  sessionId, 
  apiId, 
  apiHash, 
  connectionSettings,
  deviceSettings,
  onSessionStringReceived, 
  onError 
}: QRLoginProps) {
  const [qrCode, setQrCode] = useState<string>("");
  const [qrError, setQrError] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { status: wsStatus, sendTelegramCommand, getMessagesByType } = useWebSocket();

  // Получение QR-кода для входа
  const generateQrCode = useCallback(async () => {
    if (wsStatus !== "connected") {
      setQrError("WebSocket не подключен. Обновите страницу и попробуйте снова.");
      return;
    }

    try {
      setIsGenerating(true);
      setQrError("");
      
      await sendTelegramCommand({
        action: "generate_qr",
        sessionId,
        params: {
          apiId,
          apiHash,
          connectionSettings,
          deviceSettings
        }
      });
    } catch (err) {
      setQrError("Ошибка при генерации QR-кода");
      if (onError) onError("Не удалось сгенерировать QR-код");
    } finally {
      setIsGenerating(false);
    }
  }, [wsStatus, sessionId, apiId, apiHash, connectionSettings, deviceSettings, sendTelegramCommand, onError]);

  // Обработка ответа от WebSocket с QR-кодом или строкой сессии
  useEffect(() => {
    const telegramResponses = getMessagesByType("telegram_response") || [];
    
    const qrResponse = telegramResponses.find(
      (msg) => msg.data?.action === "generate_qr" && msg.data?.sessionId === sessionId
    );
    
    if (qrResponse) {
      if (qrResponse.data?.success) {
        if (qrResponse.data?.sessionString) {
          // Если получена строка сессии, значит QR-код был успешно отсканирован
          onSessionStringReceived(qrResponse.data.sessionString);
        } else if (qrResponse.data?.qrCode) {
          // Если получен QR-код, отображаем его
          setQrCode(qrResponse.data.qrCode);
        }
      } else if (qrResponse.data?.error) {
        setQrError(qrResponse.data.error);
        if (onError) onError(qrResponse.data.error);
      }
    }
  }, [getMessagesByType, sessionId, onSessionStringReceived, onError]);

  // Генерируем QR-код при первом рендере
  useEffect(() => {
    if (!qrCode && !qrError && !isGenerating && wsStatus === "connected") {
      generateQrCode();
    }
  }, [qrCode, qrError, isGenerating, wsStatus, generateQrCode]);

  return (
    <div className="flex flex-col items-center space-y-4 py-4">
      {qrError ? (
        <div className="flex items-center justify-center p-4 border border-red-400 bg-red-900/20 rounded-md w-full">
          <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
          <span className="text-red-400">{qrError}</span>
        </div>
      ) : qrCode ? (
        <Card className="bg-white p-4 rounded-lg w-64 h-64 mx-auto flex items-center justify-center">
          <CardContent className="p-0">
            <QRCodeSVG value={qrCode} size={230} />
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center justify-center h-64 w-64 bg-gray-800 border border-gray-700 rounded-lg">
          <RefreshCcw className={`h-8 w-8 text-gray-500 ${isGenerating ? "animate-spin" : ""}`} />
        </div>
      )}
      
      <div className="text-center max-w-md">
        <p className="text-gray-400 mb-2">
          Отсканируйте этот QR-код в приложении Telegram для входа
        </p>
        <p className="text-xs text-gray-500">
          Откройте Telegram, перейдите в Настройки → Устройства → Подключить устройство и отсканируйте QR-код
        </p>
      </div>
      
      <Button
        onClick={generateQrCode}
        disabled={isGenerating}
        variant="outline"
        className="mt-2"
      >
        {isGenerating ? "Генерация..." : "Обновить QR-код"}
      </Button>
    </div>
  );
}