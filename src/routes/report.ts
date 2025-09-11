import { Hono } from "hono";
import { reportController } from "../controller/ReportController";
import { authMiddleware } from "../middlewares/authMiddleware";

const reportRoute = new Hono();

reportRoute.post("/create", authMiddleware, reportController.createReport);

export default reportRoute;
