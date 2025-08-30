import { Hono } from "hono";
import PowerController from "../controller/WeatherController";
import { apiKeyMiddleware } from "../middlewares/authMiddleware";

const router = new Hono();

const weatherController = new PowerController();

weatherController.create_database();

router.post("/create", apiKeyMiddleware, weatherController.create);
router.post("/get-date", apiKeyMiddleware, weatherController.getByDate);

export default router;
