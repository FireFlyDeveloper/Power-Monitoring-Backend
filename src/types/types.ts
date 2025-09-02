import { WSContext } from "hono/ws";

export interface ClientInfo {
  ws: WSContext;
  subscriptions: Set<string>;
}

export interface WebSocketMessage {
  type: string;
  topic?: string;
  rpm?: number;
  kwh?: number;
  temperature?: number;
  voltage?: number;
  device_uid?: string;
}

export interface Data {
  rpm: number;
  kwh: number;
  temperature: number;
  voltage: number;
}
