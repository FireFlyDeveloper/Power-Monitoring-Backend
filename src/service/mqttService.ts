import mqtt, { MqttClient, IClientOptions } from "mqtt";
import { Topic } from "../types/types";

export default class MqttService {
  private client: MqttClient;
  private brokerUrl: string = process.env.BROKER_URL || "mqtt://localhost:1883";
  private username: string = process.env.BROKER_USERNAME || "";
  private password: string = process.env.BROKER_PASSWORD || "";

  public onMessage: (topic: string, message: string) => void = () => {};

  constructor() {
    console.log("MQTT Broker URL:", this.brokerUrl);
    const options: IClientOptions = {
      username: this.username,
      password: this.password,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000,
    };

    this.client = mqtt.connect(this.brokerUrl, options);

    this.client.on("connect", () => {
      console.log("Connected to MQTT broker");

      this.subscribe(Topic.TEMPERATURE);
      this.subscribe(Topic.RPM);
      this.subscribe(Topic.KWH);
      this.subscribe(Topic.VOLTAGE);
      this.subscribe(Topic.CURRENT);
    });

    this.client.on("message", (topic, message) => {
      if (this.onMessage) {
        this.onMessage(topic, message.toString());
      }
    });

    this.client.on("error", (err) => {
      console.error("MQTT Connection error:", err);
    });
  }

  public subscribe(topic: string): void {
    this.client.subscribe(topic, (err) => {
      if (err) {
        console.error(`Failed to subscribe to ${topic}:`, err);
      } else {
        console.log(`Subscribed to ${topic}`);
      }
    });
  }

  public publish(topic: string, message: string): void {
    this.client.publish(topic, message, {}, (err) => {
      if (err) {
        console.error(`Failed to publish message to ${topic}:`, err);
      }
    });
  }
}
