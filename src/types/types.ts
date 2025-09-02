export interface Data {
  rpm: number;
  kwh: number;
  temperature: number;
  voltage: number;
}

export const Topic = {
  RPM: "sensor/rpm",
  KWH: "sensor/kwh",
  TEMPERATURE: "sensor/temperature",
  VOLTAGE: "sensor/voltage",
};
