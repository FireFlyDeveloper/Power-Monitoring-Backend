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

export type SensorRow = {
  sensor_type: string;
  created_at: number;
  min_value: string;
  max_value: string;
  avg_value: string;
  samples: string;
};

export type AggregatedSensor = {
  sensor_type: string;
  date: string;
  min_value: number;
  max_value: number;
  avg_value: number;
  samples: number;
};

export type CacheEntry = { data?: any[]; report?: string; expiry: number };

export type HistoryCacheEntry = { data: any[]; expiry: number };
