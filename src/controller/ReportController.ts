import { GoogleGenAI } from "@google/genai";
import { getMonthRange } from "../utils/getMonthRange";
import { selectByRange } from "../service/measurementService";
import { Context } from "hono";

const apiKey = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: apiKey });

class ReportController {
  public async createReport(ctx: Context) {
    try {
      const msg = await ctx.req.json();

      if (!msg.month) {
        return ctx.json({ error: `Missing month` });
      }

      let start: string, end: string;
      try {
        ({ start, end } = getMonthRange(msg.month, msg.year));
        console.log(start, end);
      } catch (err) {
        return ctx.json({ error: "Invalid month" });
      }

      const rows = await selectByRange(start, end);

      if (!rows.length) {
        return ctx.json({ error: "No data to report" });
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `
    You are a professional **renewable energy data analyst**.  
    Generate a **Monthly Performance Report** in **Markdown** format, focusing specifically on **Solar Panel** and **Wind Turbine** systems.  
    Follow the structure, formatting, and professional tone exactly as described below.

    ### Report Template & Style:
    - Title: "## Monthly Report – {Month Year}"
    - Include today’s **Date**.
    - Sections must include:
      1. Executive Summary  
         - Provide a concise overview of key findings, overall system performance, and major insights.  
      2. Data Overview & Methodology  
         - Explain the source of data (sensor logs), timeframe, and methods used for aggregation.  
      3. Detailed Sensor Analysis  
         - Create separate subsections for **Solar Sensors** and **Wind Sensors**.  
         - Highlight energy production, efficiency, downtime, and anomalies.  
      4. Trends, Patterns, and Anomalies  
         - Identify seasonal/weather-related effects, recurring patterns, and irregularities.  
      5. Recommendations and Next Steps  
         - Provide clear, actionable recommendations for optimization, maintenance, or further investigation.  

    ### Formatting Requirements:
    - Include a **Markdown table** summarizing aggregated sensor data (production, efficiency, downtime, etc.).  
    - Use **bullet points** and **bold key terms** for clarity.  
    - Explicitly state **assumptions, limitations, or missing data** if applicable.  
    - End the report with **actionable recommendations**.  

    ### Input Data
    Day: ${new Date().getUTCDate()}
    Month: ${msg.month}  
    Year: ${msg.year ?? new Date().getFullYear()}  
    Data (JSON):  
    ${JSON.stringify(rows, null, 2)}
  `,
      });

      return ctx.json({ report: response.text });
    } catch (error) {
      console.error(`❌ Error handling message.`, error);
      return ctx.json({ error: "Invalid request format" });
    }
  }
}

export const reportController = new ReportController();
