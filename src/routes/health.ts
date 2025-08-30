import { Hono } from "hono";
import { webSocketService } from "../service/websocketService";

const healthRoute = new Hono();

healthRoute.get("/ping", (c) => {
  return c.text("pong🚀🎊");
});

healthRoute.get("/ws/stats", (c) => {
  const stats = {
    totalClients: webSocketService.getClientCount(),
    subscribedClients: webSocketService.getSubscribedCount(
      webSocketService.getFixedTopic(),
    ),
    fixedTopic: webSocketService.getFixedTopic(),
  };

  return c.json(stats);
});

export default healthRoute;
