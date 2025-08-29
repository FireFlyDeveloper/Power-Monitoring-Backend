import { Context, Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import authRoute from "./routes/auth";
import powerRoute from "./routes/power";

const { upgradeWebSocket, websocket } = createBunWebSocket();

const app = new Hono();

app.notFound((c) => {
  return c.text("Not found", 404);
});

app.onError((err, c) => {
  console.error(`${err}`);
  return c.text("Internal error", 500);
});

app.get(
  "/ws",
  upgradeWebSocket((c) => {
    return {
      onMessage(event, ws) {
        console.log(`Message from client: ${event.data}`);
        ws.send("Hello from server!");
      },
      onClose: () => {
        console.log("Connection closed");
      },
    };
  }),
);

app.get("/ping", (c: Context) => {
  return c.text("pong🚀🎊");
});

app.route("/auth", authRoute);
app.route("/power", powerRoute);

export default {
  fetch: app.fetch,
  websocket,
}
