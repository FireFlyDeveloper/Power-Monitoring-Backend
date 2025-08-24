import { Context, Hono } from "hono";
import AuthController from "./controller/AuthController";
import PowerController from "./controller/PowerController";

const app = new Hono();

const authController = new AuthController();
const powerController = new PowerController();

async function initApp() {
  await authController.create_database();
  await powerController.create_database();

  app.get("/ping", (c: Context) => {
    return c.text("pong🚀🎊");
  });

  return app;
}

export default await initApp();
