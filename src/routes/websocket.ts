import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import { webSocketController } from "../controller/websocketController";

const { upgradeWebSocket } = createBunWebSocket();

const websocketRoute = new Hono();

websocketRoute.get(
  "/ws",
  upgradeWebSocket((c) => {
    const clientId = Math.random().toString(36).substring(7);

    return {
      onOpen(_event, ws) {
        webSocketController.handleConnection(clientId, ws);
      },

      onMessage(event, ws) {
        webSocketController.handleMessage(clientId, event, ws);
      },

      onClose(_event) {
        webSocketController.handleDisconnection(clientId);
      },
    };
  }),
);

export default websocketRoute;
