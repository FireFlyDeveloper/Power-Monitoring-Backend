import { Context } from "hono";
import {
  createRecord,
  selectByDate,
  createTable,
} from "../service/weatherService";

export default class PowerController {
  async create_database(): Promise<void> {
    await createTable();
  }

  async create(ctx: Context) {
    const { temperature, rpm } = await ctx.req.json();
    const measurement = await createRecord(temperature, rpm);

    return ctx.json({
      message: "Weather created successfully",
      data: measurement,
    });
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
