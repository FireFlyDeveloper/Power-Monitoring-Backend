import MqttService from "../service/mqttService";
import {
  createMeasurement,
  selectByRange,
  selectByTypeAndRange,
  createTablesAndViews,
} from "../service/measurementService";
import { webSocketService } from "../service/websocketService";
import { Data, HistoryCacheEntry, Topic } from "../types/types";
import { WSContext } from "hono/ws";

const mqttService = new MqttService();

const historyCache = new Map<string, HistoryCacheEntry>();
const HISTORY_CACHE_TTL_MS = Number(process.env.HISTORY_CACHE_TTL_MS) || 30000;

class WebsocketController {
  private getHistoryCache(cacheKey: string): HistoryCacheEntry | null {
    const entry = historyCache.get(cacheKey);
    const now = Date.now();
    if (!entry) return null;
    if (entry.expiry <= now) {
      historyCache.delete(cacheKey);
      return null;
    }
    return entry;
  }

  private setHistoryCache(cacheKey: string, data: any[]) {
    historyCache.set(cacheKey, {
      data,
      expiry: Date.now() + HISTORY_CACHE_TTL_MS,
    });
  }

  private lastData: Data = {
    rpm: 0,
    kwh: 0,
    temperature: 0,
    voltage: 0,
    current: 0,
  };

  private topicToSensor: Record<
    string,
    { sensorType: string; key: keyof Data }
  > = {
    [Topic.RPM]: { sensorType: "rpm", key: "rpm" },
    [Topic.KWH]: { sensorType: "kwh", key: "kwh" },
    [Topic.TEMPERATURE]: { sensorType: "temperature", key: "temperature" },
    [Topic.VOLTAGE]: { sensorType: "voltage", key: "voltage" },
    [Topic.CURRENT]: { sensorType: "current", key: "current" },
  };

  constructor() {
    const createTable = async () => {
      await createTablesAndViews();
    };
    createTable();

    mqttService.onMessage = async (topic: string, message: string) => {
      const value = Number(message);
      if (!isNaN(value)) {
        await this.handleIncomingMeasurement(topic, value);
      } else {
        console.warn(`⚠️ Non-numeric payload on topic ${topic}: ${message}`);
      }
    };
  }

  private async handleIncomingMeasurement(
    topic: string,
    value: number,
  ): Promise<void> {
    const mapping = this.topicToSensor[topic];
    if (!mapping) {
      console.log(`❓ Unknown topic: ${topic} | Value: ${value}`);
      return;
    }

    const { sensorType, key } = mapping;

    try {
      await createMeasurement(sensorType, value);
      this.lastData[key] = value;

      console.log(`✅ Stored ${sensorType}: ${value}`);

      this.broadcast({ [key]: value });
    } catch (error) {
      console.error(`❌ Failed to process ${sensorType}:`, error);
    }
  }

  public async handleClientMessage(
    clientId: string,
    ws: WSContext,
    rawMessage: string,
  ): Promise<void> {
    try {
      const msg = JSON.parse(rawMessage);

      switch (msg.action) {
        case "getLastData": {
          ws.send(
            JSON.stringify({ action: "lastData", data: this.getLastData() }),
          );
          break;
        }
        case "getHistory": {
          const { start, end } = msg;
          const cacheKey = `history__${start}__${end}`;

          const cached = this.getHistoryCache(cacheKey);
          if (cached) {
            ws.send(
              JSON.stringify({
                action: "history",
                data: cached.data,
                cached: true,
              }),
            );
            break;
          }

          const rows = await selectByRange(start, end);
          this.setHistoryCache(cacheKey, rows);
          ws.send(
            JSON.stringify({ action: "history", data: rows, cached: false }),
          );
          break;
        }
        case "getHistoryByType": {
          const { sensorType, start, end } = msg;
          const cacheKey = `historyByType__${sensorType}__${start}__${end}`;

          const cached = this.getHistoryCache(cacheKey);
          if (cached) {
            ws.send(
              JSON.stringify({
                action: "historyByType",
                data: cached.data,
                cached: true,
              }),
            );
            break;
          }

          const rows = await selectByTypeAndRange(sensorType, start, end);
          this.setHistoryCache(cacheKey, rows);
          ws.send(
            JSON.stringify({
              action: "historyByType",
              data: rows,
              cached: false,
            }),
          );
          break;
        }
        default:
          ws.send(JSON.stringify({ error: `Unknown action: ${msg.action}` }));
          break;
      }
    } catch (error) {
      console.error(`❌ Error handling message from ${clientId}:`, error);
      ws.send(JSON.stringify({ error: "Invalid request format" }));
    }
  }

  public getLastData(): Data {
    return this.lastData;
  }

  public handleConnection(clientId: string, ws: WSContext): void {
    webSocketService.addClient(clientId, ws);

    // Send snapshot
    ws.send(JSON.stringify({ action: "lastData", data: this.getLastData() }));
  }

  public handleDisconnection(clientId: string): void {
    webSocketService.removeClient(clientId);
  }

  private broadcast(data: Partial<Data>): void {
    try {
      webSocketService.broadcastMessage({ action: "update", data });
    } catch (error) {
      console.error("❌ Broadcast error:", error);
    }
  }
}

export const websocketController = new WebsocketController();
