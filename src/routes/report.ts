import { Hono } from "hono";
import { reportController } from "../controller/ReportController";
import { authMiddleware } from "../middlewares/authMiddleware";

const reportRoute = new Hono();

reportRoute.post("/raw-data", authMiddleware, reportController.getRawData);
reportRoute.post("/generate", authMiddleware, reportController.createReport);

export default reportRoute;
