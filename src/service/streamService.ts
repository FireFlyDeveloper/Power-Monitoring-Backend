import {
  createRecordKwh,
  createRecordRpm,
  createRecordTemperature,
  createRecordVoltage,
} from "./measurementService";
import { WebSocketMessage, Data } from "../types/types";

export default class StreamService {
  private rpm: number = 0;
  private kwh: number = 0;
  private temperature: number = 0;
  private voltage: number = 0;

  public async verifyData(data: WebSocketMessage): Promise<void> {
    if (data.rpm !== undefined) {
      this.rpm = data.rpm;
      await createRecordRpm(data.rpm);
    } else if (data.kwh !== undefined) {
      this.kwh = data.kwh;
      await createRecordKwh(data.kwh);
    } else if (data.temperature !== undefined) {
      this.temperature = data.temperature;
      await createRecordTemperature(data.temperature);
    } else if (data.voltage !== undefined) {
      this.voltage = data.voltage;
      await createRecordVoltage(data.voltage);
    } else {
      throw new Error("Invalid data");
    }
  }

  public getDataLastData(): Data {
    return {
      rpm: this.rpm,
      kwh: this.kwh,
      temperature: this.temperature,
      voltage: this.voltage,
    };
  }
}
