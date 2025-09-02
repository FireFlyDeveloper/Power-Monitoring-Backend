import { Hono } from "hono";

const healthRoute = new Hono();

healthRoute.get("/ping", (c) => {
  return c.text("pong🚀🎊");
});

export default healthRoute;
