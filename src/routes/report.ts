import { Hono } from "hono";
import { reportController } from "../controller/ReportController";

const reportRoute = new Hono();

reportRoute.post("/create", reportController.createReport);

export default reportRoute;
