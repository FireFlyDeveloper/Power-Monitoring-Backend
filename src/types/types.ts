import { WSContext } from "hono/ws";

export interface Data {
  rpm: number;
  kwh: number;
  temperature: number;
  voltage: number;
  current: number;
}

export const Topic = {
  RPM: "sensor/rpm",
  KWH: "sensor/kwh",
  TEMPERATURE: "sensor/temperature",
  VOLTAGE: "sensor/voltage",
  CURRENT: "sensor/current",
};

export interface ClientInfo {
  ws: WSContext;
  lastPing?: number;
}

export interface BufferedMeasurement {
  sensorType: string;
  value: number;
  createdAt: Date;
}
