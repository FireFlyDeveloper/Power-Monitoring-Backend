import { Hono } from "hono";
import MeasurementController from "../controller/MeasurementController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = new Hono();

const authController = new MeasurementController();

router.get("/date", authMiddleware, authController.getByDate);

export default router;
