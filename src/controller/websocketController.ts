import MqttService from "../service/mqttService";
import {
  createRecordKwh,
  createRecordRpm,
  createRecordTemperature,
  createRecordVoltage,
} from "../service/measurementService";
import { Data, Topic } from "../types/types";

const mqttService = new MqttService();

export default class WebsocketController {
  private rpm: number = 0;
  private kwh: number = 0;
  private temperature: number = 0;
  private voltage: number = 0;

  constructor() {
    mqttService.onMessage = (topic: string, message: string) => {
      const data = Number(message);
      this.verifyData(topic, data);
    };
  }

  private async verifyData(topic: string, message: number): Promise<void> {
    switch (topic) {
      case Topic.RPM:
        console.log(`RPM: ${message}`);
        this.rpm = message;
        await createRecordRpm(message);
        break;

      case Topic.KWH:
        console.log(`KWH: ${message}`);
        this.kwh = message;
        await createRecordKwh(message);
        break;

      case Topic.TEMPERATURE:
        console.log(`Temperature: ${message}`);
        this.temperature = message;
        await createRecordTemperature(message);
        break;

      case Topic.VOLTAGE:
        console.log(`Voltage: ${message}`);
        this.voltage = message;
        await createRecordVoltage(message);
        break;

      default:
        console.log(`Unknown topic: ${topic} with message: ${message}`);
        break;
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
