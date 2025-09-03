import { WSContext } from "hono/ws";
import { ClientInfo } from "../types/types";

export class WebSocketService {
  private clients = new Map<string, ClientInfo>();

  addClient(clientId: string, ws: WSContext): void {
    this.clients.set(clientId, { ws, lastPing: Date.now() });
    console.log(`✅ Client ${clientId} connected (total=${this.clients.size})`);
  }

  removeClient(clientId: string): void {
    if (this.clients.has(clientId)) {
      this.clients.delete(clientId);
      console.log(
        `👋 Client ${clientId} disconnected (total=${this.clients.size})`,
      );
    }
  }

  safeSend(clientId: string, data: any): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    try {
      if (client.ws.readyState !== 1) {
        console.warn(`⚠️ Client ${clientId} not open, removing...`);
        this.removeClient(clientId);
        return false;
      }

      client.ws.send(
        JSON.stringify({
          ...data,
          timestamp: new Date().toISOString(),
        }),
      );
      return true;
    } catch (error) {
      console.error(`❌ Failed to send to client ${clientId}:`, error);
      this.removeClient(clientId);
      return false;
    }
  }

  broadcastMessage(data: any): number {
    let sentCount = 0;
    this.clients.forEach((_clientInfo, clientId) => {
      if (this.safeSend(clientId, { data })) {
        sentCount++;
      }
    });
    console.log(
      `📢 Broadcast sent to ${sentCount}/${this.clients.size} clients`,
    );
    return sentCount;
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getClients(): Map<string, WSContext> {
    const map = new Map<string, WSContext>();
    this.clients.forEach((info, id) => map.set(id, info.ws));
    return map;
  }
}

export const webSocketService = new WebSocketService();
