import { WSContext } from "hono/ws";
import {
  webSocketService,
  WebSocketMessage,
} from "../service/websocketService";

export class WebSocketController {
  handleConnection(clientId: string, ws: WSContext): void {
    webSocketService.addClient(clientId, ws);

    ws.send(
      JSON.stringify({
        type: "connected",
        clientId,
        topic: webSocketService.getFixedTopic(),
      }),
    );
  }

  handleDisconnection(clientId: string): void {
    webSocketService.removeClient(clientId);
  }

  handleMessage(clientId: string, event: MessageEvent, ws: WSContext): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data.toString());
      const fixedTopic = webSocketService.getFixedTopic();

      switch (message.type) {
        case "subscribe":
          if (message.topic === fixedTopic) {
            const success = webSocketService.handleSubscription(
              clientId,
              fixedTopic,
            );
            ws.send(
              JSON.stringify({
                type: "subscribed",
                topic: fixedTopic,
                success,
              }),
            );
          }
          break;

        case "unsubscribe":
          if (message.topic === fixedTopic) {
            const success = webSocketService.handleUnsubscription(
              clientId,
              fixedTopic,
            );
            ws.send(
              JSON.stringify({
                type: "unsubscribed",
                topic: fixedTopic,
                success,
              }),
            );
          }
          break;

        case "publish":
          if (message.topic === fixedTopic) {
            const sentCount = webSocketService.broadcastMessage(
              fixedTopic,
              message.data,
            );
            ws.send(
              JSON.stringify({
                type: "published",
                topic: fixedTopic,
                sentTo: sentCount,
                success: sentCount > 0,
              }),
            );
          }
          break;

        default:
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Unknown message type",
            }),
          );
      }
    } catch (error) {
      console.error("Error processing message:", error);
      try {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Invalid message format",
          }),
        );
      } catch (sendError) {
        console.error("Failed to send error message:", sendError);
      }
    }
  }
}

export const webSocketController = new WebSocketController();
