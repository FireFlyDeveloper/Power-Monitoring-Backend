import { GoogleGenAI } from "@google/genai";
import { getMonthRange } from "../utils/getMonthRange";
import { selectByRange } from "../service/measurementService";
import { Context } from "hono";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

// Simple in-memory cache
type CacheEntry = { report: string; expiry: number };
const reportCache = new Map<string, CacheEntry>();

class ReportController {
  public async createReport(ctx: Context) {
    try {
      const msg = await ctx.req.json();

      if (!msg.month) {
        return ctx.json({ error: `Missing month` });
      }

      const year = msg.year ?? new Date().getFullYear();
      const cacheKey = `${msg.month}-${year}`;

      // Check cache
      const cached = reportCache.get(cacheKey);
      const now = Date.now();
      if (cached && cached.expiry > now) {
        return ctx.json({ report: cached.report, cached: true });
      }

      let start: string, end: string;
      try {
        ({ start, end } = getMonthRange(msg.month, year));
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
            You are a professional energy data analyst.  
            Produce a **Monthly Energy Usage Report** in Markdown, suitable for executives.  
            **Important constraints:**  
            - The report must NOT expose or reproduce the raw input data block, file format, schema, or ingestion details (for example: do not mention "JSON", "rows", "payload", database names, or paste raw records). Use the input data only to generate the report—do not quote or display it.  
            - Avoid implementation/debugging details or internal calculation logs; present only polished findings, assumptions, and high-level methodology.

            ### Context about sensors (use these roles when interpreting data):
            - **Consumption-side (primary):** Voltage (V), Current (A), Energy (kWh). These drive consumption metrics and kWh aggregation.
            - **Generating-side (contextual):** RPM — treat as generator operational context. Include it in the report but **do not** use RPM to compute consumption kWh; use it to explain generation/operational behavior where relevant.
            - **Ambient/External sensor:** Temperature — treat as outside/ambient temperature. Use it to explore correlations with usage or RPM (e.g., temperature-driven load or cooling effects).

            ### Report Template & Style (follow exactly):
            - Title: "## Monthly Energy Usage Report – {Month Year}"
            - Include **Date:** (today's date).
            - Sections (in this exact order):
                1. Executive Summary  
                2. Data Overview & Methodology  
                3. Detailed Sensor Analysis  
                - Subsections: **Voltage**, **Current**, **Energy (kWh)**, **RPM (Generating-side)**, **Ambient Temperature (Outside)**  
                4. Trends, Patterns, and Anomalies  
                5. Recommendations and Next Steps

            ### Specific content & formatting requirements:
            - Provide a **Markdown table** summarizing aggregated sensor metrics for the reporting period (daily totals and/or averages, sample counts, min/max/peak). Columns should include at minimum: Date, Avg Voltage (V), Min Voltage (V), Max Voltage (V), Avg Current (A) or "N/A" if missing, Total Energy (kWh), Avg RPM (rpm) or "N/A", Avg Temp (°C or °F).
            - For **Voltage / Current / Energy**: show daily aggregates (avg, min, max, total kWh), and monthly totals/averages where meaningful.
            - For **RPM**: report average, min, max, periods of zero rpm or sustained high rpm, and interpret as generator behavior (use for context only).
            - For **Temperature**: report average, min, max and any observable correlation with kWh or RPM (e.g., higher ambient temp correlates with increased load).
            - **Flag anomalies** explicitly (e.g., voltage readings that appear outside expected system range such as >400V on a low-voltage site, zero-voltage intervals, missing current data, extremely low kWh). Use clear, non-technical language when possible and quantify severity.
            - **Call out missing or incomplete data** and explain the analytical impact (e.g., "Current data missing — cannot compute instantaneous power or power factor").
            - **Assumptions:** list any assumptions made for aggregations or interpretations (brief bullet list).
            - **Methodology:** give a concise, business-friendly description of how metrics were aggregated (e.g., "Daily kWh = sum of reported daily kWh entries; averages computed across samples for each day"). Do NOT include low-level formulas, code, or raw intermediate values.
            - **Tone:** professional, concise, executive-friendly. Use bullet points and **bold** for key results.
            - **Actionable recommendations:** end with prioritized next steps (investigate, instrument, validate, monitoring changes), each with a short rationale.

            ### Anomaly guidance (how to call them out):
            - If **Current** is missing: mark as **Critical Data Gap** and recommend CT installation or repair.
            - If **Voltage** values include extreme outliers (e.g., > nominal system range) or frequent 0V: mark urgent and suggest sensor calibration check and power-quality investigation.
            - If **kWh** totals are suspiciously low or inconsistent with expected load: recommend validation of kWh scaling/units and checkpointing with realtime measurements.
            - If **RPM** shows unexpected behavior (e.g., prolonged zero rpm while kWh consumed): call out likely instrumentation/labeling mismatch or partial system coverage.
            - If **Temperature** correlates strongly with load or RPM changes, highlight potential thermal-driven load behaviors and cooling/heating impacts.

            ### Input (for model use only — do not reference in output)
            Today (Month-Day-Year): ${new Date().getMonth()}-${new Date().toISOString().slice(0, 10)}-${new Date().getFullYear()}
            Month: ${msg.month}
            Year: ${msg.year ?? new Date().getFullYear()}
            Data (usage & sensor metrics): ${JSON.stringify(rows, null, 2)}
            <!-- NOTE: The block above is for internal consumption only. DO NOT PRINT OR REFERENCE THIS BLOCK IN THE REPORT. -->
            `,
      });

      const report = response.text;

      if (!report) {
        return ctx.json({ error: "Something went wrong" });
      }

      // Save to cache (1 hour = 3600000 ms)
      reportCache.set(cacheKey, { report, expiry: now + 3600000 });

      return ctx.json({ report, cached: false });
    } catch (error) {
      console.error(`❌ Error handling message.`, error);
      return ctx.json({ error: "Invalid request format" });
    }
  }
}

export const reportController = new ReportController();
