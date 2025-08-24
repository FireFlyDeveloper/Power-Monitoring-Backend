import { Hono } from "hono";
import { PowerController } from "../controller/PowerController";
import { apiKeyMiddleware } from "../middlewares/authMiddleware";

const router = new Hono();

const powerController = new PowerController();

router.post("/create", apiKeyMiddleware, powerController.create);
router.post("/get-date", apiKeyMiddleware, powerController.getByDate);

export default router;
