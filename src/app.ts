import { Context, Hono } from "hono";
import authRoute from "./routes/auth";
import powerRoute from "./routes/power";

const app = new Hono();

app.notFound((c) => {
  return c.text("Not found", 404);
});

app.onError((err, c) => {
  console.error(`${err}`);
  return c.text("Internal error", 500);
});

app.get("/ping", (c: Context) => {
  return c.text("pong🚀🎊");
});

app.route("/auth", authRoute);
app.route("/power", powerRoute);

export default app;
