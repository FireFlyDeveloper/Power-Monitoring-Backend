import { Context } from "hono";
import { createRecord, selectByDate } from "../service/powerService";

export class PowerController {
  async create(ctx: Context) {
    const { temperature, rpm, kwh, voltage } = await ctx.req.json();
    const measurement = await createRecord(temperature, rpm, kwh, voltage);

    return ctx.json({
      message: "Measurement created successfully",
      data: measurement,
    });
  }

  async getByDate(ctx: Context) {
    const date = ctx.req.query("date");
    const measurements = await selectByDate(date);

    return ctx.json({
      message: `Measurements for ${date ?? "today"}`,
      data: measurements,
    });
  }
}
