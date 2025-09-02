import { Context } from "hono";
import { selectByDate, createTable } from "../service/measurementService";

export default class MeasurementController {
  constructor() {
    const createDatabase = async () => {
      await createTable();
    };

    createDatabase();
  }

  async getByDate(ctx: Context) {
    const date = ctx.req.query("date");
    const measurements = await selectByDate(date);

    return ctx.json({
      message: `Weather for ${date ?? "today"}`,
      data: measurements,
    });
  }
}
