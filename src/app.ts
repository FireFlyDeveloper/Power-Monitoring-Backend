import { Context, Hono } from "hono";
import { authMiddleware } from "./middlewares/authMiddleware";

const app = new Hono();

app.get("/ping", (c: Context) => {
  return c.text("pong🚀🎊");
});

export default app;
