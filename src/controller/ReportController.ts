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
            You are a professional data analyst.  
            Generate a **Monthly Report** in Markdown format using the structure and style below.  
            Follow the exact headings, formatting, and tone shown in the template.  

            ### Report Template & Style:
            - Use a clear title: "## Monthly Report – {Month Year}"
            - Include the **Date** (today’s date).
            - Sections must include:
            1. Executive Summary  
            2. Data Overview & Methodology  
            3. Detailed Sensor Analysis (with subsections for each sensor type)  
            4. Trends, Patterns, and Anomalies  
            5. Recommendations and Next Steps  
            - Provide a **Markdown table** summarizing aggregated sensor data.  
            - Use bullet points and bold key terms for clarity.  
            - Call out assumptions, limitations, or missing data explicitly.  
            - End with actionable recommendations.  

            ### Input Data
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
