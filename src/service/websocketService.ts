import { WSContext } from "hono/ws";
import { ClientInfo } from "../types/types";

export class WebSocketService {
  private clients = new Map<string, ClientInfo>();

  addClient(clientId: string, ws: WSContext): void {
    this.clients.set(clientId, {
      ws,
    });
    console.log(`Client ${clientId} connected`);
  }

  removeClient(clientId: string): void {
    if (this.clients.has(clientId)) {
      this.clients.delete(clientId);
      console.log(`Client ${clientId} disconnected`);
    }
  }

  broadcastMessage(data: any): number {
    let sentCount = 0;

    this.clients.forEach((clientInfo, clientId) => {
      try {
        clientInfo.ws.send(
          JSON.stringify({
            data,
            timestamp: new Date().toISOString(),
          }),
        );
        sentCount++;
      } catch (error) {
        console.log(`Client ${clientId} connection closed, removing...`);
        this.clients.delete(clientId);
      }
    });

    console.log(`Message sent to ${sentCount} clients`);
    return sentCount;
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const webSocketService = new WebSocketService();
