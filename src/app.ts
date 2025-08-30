import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import authRoute from "./routes/auth";
import powerRoute from "./routes/power";
import websocketRoute from "./routes/websocket";
import healthRoute from "./routes/health";

const { websocket } = createBunWebSocket();
const app = new Hono();

app.notFound((c) => {
  return c.text("Not found", 404);
});

app.onError((err, c) => {
  console.error(`${err}`);
  return c.text("Internal error", 500);
});

app.route("/ws", websocketRoute);
app.route("/health", healthRoute);
app.route("/auth", authRoute);
app.route("/power", powerRoute);

export default {
  fetch: app.fetch,
  websocket,
};
