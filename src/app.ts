import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import authRoute from "./routes/auth";
import measurementRoute from "./routes/measurements";
import websocketRoute from "./routes/websocket";
import healthRoute from "./routes/health";
import { cors } from 'hono/cors'

const { websocket } = createBunWebSocket();
const app = new Hono();

app.use('*', cors());

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
app.route("/measurements", measurementRoute);

export default {
  fetch: app.fetch,
  websocket,
};
