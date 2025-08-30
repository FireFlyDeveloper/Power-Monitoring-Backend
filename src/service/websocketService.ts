import { WSContext } from "hono/ws";

export interface ClientInfo {
  ws: WSContext;
  subscriptions: Set<string>;
}

export interface WebSocketMessage {
  type: string;
  topic?: string;
  data?: any;
}

export class WebSocketService {
  private clients = new Map<string, ClientInfo>();
  private readonly FIXED_TOPIC = "device/data";

  addClient(clientId: string, ws: WSContext): void {
    this.clients.set(clientId, {
      ws,
      subscriptions: new Set(),
    });
    console.log(`Client ${clientId} connected`);
  }

  removeClient(clientId: string): void {
    if (this.clients.has(clientId)) {
      this.clients.delete(clientId);
      console.log(`Client ${clientId} disconnected`);
    }
  }

  handleSubscription(clientId: string, topic: string): boolean {
    const clientInfo = this.clients.get(clientId);
    if (clientInfo && topic === this.FIXED_TOPIC) {
      clientInfo.subscriptions.add(topic);
      console.log(`Client ${clientId} subscribed to ${topic}`);
      return true;
    }
    return false;
  }

  handleUnsubscription(clientId: string, topic: string): boolean {
    const clientInfo = this.clients.get(clientId);
    if (clientInfo && topic === this.FIXED_TOPIC) {
      clientInfo.subscriptions.delete(topic);
      console.log(`Client ${clientId} unsubscribed from ${topic}`);
      return true;
    }
    return false;
  }

  broadcastMessage(topic: string, data: any): number {
    let sentCount = 0;

    this.clients.forEach((clientInfo, clientId) => {
      if (clientInfo.subscriptions.has(topic)) {
        try {
          clientInfo.ws.send(
            JSON.stringify({
              topic,
              data,
              timestamp: new Date().toISOString(),
            }),
          );
          sentCount++;
        } catch (error) {
          console.log(`Client ${clientId} connection closed, removing...`);
          this.clients.delete(clientId);
        }
      }
    });

    console.log(`Message published to ${topic}, sent to ${sentCount} clients`);
    return sentCount;
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getSubscribedCount(topic: string): number {
    let count = 0;
    this.clients.forEach((clientInfo) => {
      if (clientInfo.subscriptions.has(topic)) {
        count++;
      }
    });
    return count;
  }

  getFixedTopic(): string {
    return this.FIXED_TOPIC;
  }
}

export const webSocketService = new WebSocketService();
