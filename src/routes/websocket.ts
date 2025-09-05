import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import { websocketController } from "../controller/WebsocketController";
import { authMiddleware } from "../middlewares/authMiddleware";

const { upgradeWebSocket } = createBunWebSocket();

const websocketRoute = new Hono();

websocketRoute.get(
  "/data",
  authMiddleware,
  upgradeWebSocket((c) => {
    const clientId = Math.random().toString(36).substring(7);

    return {
      onOpen(_event, ws) {
        websocketController.handleConnection(clientId, ws);
      },

      onClose(_event) {
        websocketController.handleDisconnection(clientId);
      },

      onMessage(event, ws) {
        websocketController.handleClientMessage(clientId, ws, `${event.data}`);
      },
    };
  }),
);

export default websocketRoute;
