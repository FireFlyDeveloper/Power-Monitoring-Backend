import MqttService from "../service/mqttService";
import {
  createRecordKwh,
  createRecordRpm,
  createRecordTemperature,
  createRecordVoltage,
} from "../service/measurementService";
import { webSocketService } from "../service/websocketService";
import { Data, Topic } from "../types/types";
import { WSContext } from "hono/ws";

const mqttService = new MqttService();

class WebsocketController {
  private rpm: number = 0;
  private kwh: number = 0;
  private temperature: number = 0;
  private voltage: number = 0;

  constructor() {
    mqttService.onMessage = async (topic: string, message: string) => {
      const data = Number(message);
      await this.verifyData(topic, data);
    };
  }

  private async verifyData(topic: string, message: number): Promise<void> {
    let payload: Partial<Data> | null = null;

    switch (topic) {
      case Topic.RPM:
        console.log(`RPM: ${message}`);
        this.rpm = message;
        await createRecordRpm(message);
        payload = { rpm: message };
        break;

      case Topic.KWH:
        console.log(`KWH: ${message}`);
        this.kwh = message;
        await createRecordKwh(message);
        payload = { kwh: message };
        break;

      case Topic.TEMPERATURE:
        console.log(`Temperature: ${message}`);
        this.temperature = message;
        await createRecordTemperature(message);
        payload = { temperature: message };
        break;

      case Topic.VOLTAGE:
        console.log(`Voltage: ${message}`);
        this.voltage = message;
        await createRecordVoltage(message);
        payload = { voltage: message };
        break;

      default:
        console.log(`Unknown topic: ${topic} with message: ${message}`);
        break;
    }

    if (payload) {
      this.broadcast(payload);
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

  public handleConnection(clientId: string, ws: WSContext): void {
    webSocketService.addClient(clientId, ws);
    ws.send(JSON.stringify(this.getDataLastData()));
  }

  public handleDisconnection(clientId: string): void {
    webSocketService.removeClient(clientId);
  }

  private broadcast(data: any): void {
    webSocketService.broadcastMessage(data);
  }
}

export const websocketController = new WebsocketController();
