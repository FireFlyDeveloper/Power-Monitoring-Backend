import { Hono } from "hono";
import AuthController from "../controller/AuthController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = new Hono();

const authController = new AuthController();

router.post("/refresh", authMiddleware, authController.refresh);
router.post("/user", authController.login);
router.post("/update", authMiddleware, authController.update);
router.post("/update-password", authMiddleware, authController.changePassword);

export default router;
