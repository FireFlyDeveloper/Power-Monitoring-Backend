import { getMonthRange } from "../utils/getMonthRange";
import { selectByRange } from "../service/measurementService";
import { Context } from "hono";
import { withRetry } from "../utils/retry";
import { AggregatedSensor, CacheEntry, SensorRow } from "../types/types";
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
const client = new OpenAI({ apiKey: apiKey });

const reportCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = Number(process.env.REPORT_CACHE_TTL_MS) || 3600000; // default 1 hour

const reportLocks = new Map<string, Promise<any>>();
const rawDataLocks = new Map<string, Promise<any>>();

class ReportController {
  constructor() {
    this.getRawData = this.getRawData.bind(this);
    this.createReport = this.createReport.bind(this);
  }

  private toDateKey(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toISOString().split("T")[0];
  }

  private getCache(cacheKey: string): CacheEntry | null {
    const entry = reportCache.get(cacheKey);
    const now = Date.now();
    if (!entry) return null;
    if (entry.expiry <= now) {
      reportCache.delete(cacheKey);
      return null;
    }
    return entry;
  }

  private setCache(cacheKey: string, part: Partial<CacheEntry>) {
    const now = Date.now();
    const existing = reportCache.get(cacheKey) || {
      expiry: now + CACHE_TTL_MS,
    };
    const merged: CacheEntry = {
      data: part.data ?? existing.data,
      report: part.report ?? existing.report,
      expiry: now + CACHE_TTL_MS,
    };
    reportCache.set(cacheKey, merged);
  }

  public async getRawData(ctx: Context) {
    try {
      const msg = await ctx.req.json();
      if (!msg.month) {
        ctx.status(400);
        return ctx.json({ error: `Missing month` });
      }

      const year = msg.year ?? new Date().getFullYear();
      let start: string, end: string;
      try {
        ({ start, end } = getMonthRange(msg.month, year));
      } catch {
        ctx.status(400);
        return ctx.json({ error: "Invalid month" });
      }

      const cacheKey = `${start}__${end}`;
      const cached = this.getCache(cacheKey);
      if (cached?.data) {
        return ctx.json({ data: cached.data, cached: true });
      }

      if (rawDataLocks.has(cacheKey)) {
        console.log(`⏳ Waiting for existing raw data fetch for ${cacheKey}`);
        await rawDataLocks.get(cacheKey);
        const afterWait = this.getCache(cacheKey);
        if (afterWait?.data) {
          return ctx.json({ data: afterWait.data, cached: true });
        }
      }

      const lockPromise = (async () => {
        try {
          const rows = await selectByRange(start, end);
          if (!rows?.length) {
            ctx.status(404);
            return ctx.json({ error: "No data to report" });
          }

          this.setCache(cacheKey, { data: rows });
          return rows;
        } finally {
          rawDataLocks.delete(cacheKey);
        }
      })();

      rawDataLocks.set(cacheKey, lockPromise);

      const rows = await lockPromise;
      if (!rows) {
        ctx.status(500);
        return ctx.json({ error: "Something went wrong fetching raw data" });
      }

      return ctx.json({ data: rows, cached: false });
    } catch (error) {
      console.error(`❌ Error handling getRawData.`, error);
      ctx.status(500);
      return ctx.json({ error: "Something went wrong" });
    }
  }

  public async createReport(ctx: Context) {
    try {
      const msg = await ctx.req.json();
      if (!msg.month) {
        ctx.status(400);
        return ctx.json({ error: `Missing month` });
      }

      const year = msg.year ?? new Date().getFullYear();
      let start: string, end: string;
      try {
        ({ start, end } = getMonthRange(msg.month, year));
      } catch {
        ctx.status(400);
        return ctx.json({ error: "Invalid month" });
      }

      const cacheKey = `${start}__${end}`;
      const cached = this.getCache(cacheKey);
      if (cached?.report) {
        return ctx.json({ report: cached.report, cached: true });
      }

      if (reportLocks.has(cacheKey)) {
        console.log(
          `⏳ Waiting for existing report generation for ${cacheKey}`,
        );
        await reportLocks.get(cacheKey);
        const afterWait = this.getCache(cacheKey);
        if (afterWait?.report) {
          return ctx.json({ report: afterWait.report, cached: true });
        }
      }

      const lockPromise = (async () => {
        try {
          const rows: SensorRow[] =
            cached?.data ?? (await selectByRange(start, end));
          if (!rows?.length) {
            return ctx.json({ error: "No data to report" }, 404);
          }

          const grouped = rows.reduce<
            Record<
              string,
              {
                sensor_type: string;
                date: string;
                min_value: number;
                max_value: number;
                total_avg: number;
                total_samples: number;
              }
            >
          >((acc, row) => {
            const type = row.sensor_type;
            const dateKey = this.toDateKey(row.created_at);
            const key = `${type}_${dateKey}`;

            const min = parseFloat(row.min_value);
            const max = parseFloat(row.max_value);
            const avg = parseFloat(row.avg_value);
            const samples = parseFloat(row.samples);

            if (!acc[key]) {
              acc[key] = {
                sensor_type: type,
                date: dateKey,
                min_value: min,
                max_value: max,
                total_avg: avg * samples,
                total_samples: samples,
              };
            } else {
              acc[key].min_value = Math.min(acc[key].min_value, min);
              acc[key].max_value = Math.max(acc[key].max_value, max);
              acc[key].total_avg += avg * samples;
              acc[key].total_samples += samples;
            }

            return acc;
          }, {});

          const aggregated: AggregatedSensor[] = Object.values(grouped).map(
            (entry) => ({
              sensor_type: entry.sensor_type,
              date: entry.date,
              min_value: entry.min_value,
              max_value: entry.max_value,
              avg_value: entry.total_avg / entry.total_samples,
              samples: entry.total_samples,
            }),
          );

          const response = await withRetry(
            async () => {
              const res = await client.responses
                .create({
                  model: "gpt-4o",
                  instructions: `You are a professional energy data analyst.  
                    Produce a **Monthly Energy Usage Report** in Markdown, suitable for executives.  

                    **Important constraints:**  
                    - The report must NOT expose or reproduce the raw input data block, file format, schema, or ingestion details (for example: do not mention "JSON", "rows", "payload", database names, or paste raw records). Use the input data only to generate the report—do not quote or display it.  
                    - Avoid implementation/debugging details or internal calculation logs; present only polished findings, assumptions, and high-level methodology.

                    ---

                    ### Context about sensors (interpretation roles):
                    - **Consumption-side (primary):** Voltage (V), Current (A), Energy (kWh). These drive consumption metrics and kWh aggregation.
                    - **Generating-side (contextual):** RPM — represents generator operational behavior (for context only; do not use for kWh computation).
                    - **Ambient/External:** Temperature — represents external conditions that may correlate with load or RPM.

                    ---

                    ### Report Template & Style
                    - Title: "## Monthly Energy Usage Report – {Month Year}"
                    - Include **Date:** (today’s date)
                    - Sections (exact order):
                      1. Executive Summary  
                      2. Data Overview & Methodology  
                      3. Detailed Sensor Analysis  
                        - Subsections: **Voltage**, **Current**, **Energy (kWh)**, **RPM (Generating-side)**, **Ambient Temperature (Outside)**  
                      4. Trends, Patterns, and Anomalies  
                      5. Recommendations and Next Steps

                    ---

                    ### Table & Visualization Requirements

                    - Always include a **Markdown table** under the “Detailed Sensor Analysis” section summarizing **aggregated daily metrics**.  
                    - Each row must represent a **day** in the reporting month.  
                    - Include these columns (always in this order):

                    | Date | Avg Voltage (V) | Min Voltage (V) | Max Voltage (V) | Avg Current (A) | Total Energy (kWh) | Avg RPM | Avg Temp (°C) |

                    - If a sensor is missing data for that day, display **"N/A"**.  
                    - After the daily table, include a **Monthly Summary Table** with one row that aggregates totals/averages across the month (same columns).  
                    - Highlight anomalies with **bold text and footnotes or parenthetical remarks** (e.g., "**High Voltage (>400V)**").  
                    - Tables must render cleanly in Markdown (use pipe separators, header divider lines).

                    ---

                    ### Analytical Guidance & Content Rules

                    - **Voltage / Current / Energy:** show daily aggregates (avg, min, max, total kWh), and monthly totals/averages.  
                    - **RPM:** show average/min/max, note extended 0-RPM or sustained high-RPM intervals.  
                    - **Temperature:** show average/min/max, and any correlation with energy or RPM trends.  
                    - Explicitly **flag anomalies** (e.g., out-of-range voltages, missing data, unrealistic zeroes).  
                    - **Critical Data Gaps:** if any key sensor (especially Current) is missing for the month, call it out under anomalies and recommendations.  
                    - List assumptions used for aggregation (in concise bullet points).  
                    - Explain the aggregation methodology in business-friendly terms (no formulas or code).  
                    - End with **actionable recommendations**, each with a rationale (e.g., "Install CT to restore missing Current data" or "Validate voltage sensor calibration").

                    ---

                    ### Input (for model use only — do not reference in output)
                    Today (Month-Day-Year): ${new Date().toLocaleDateString()}
                    Month: ${msg.month}
                    Year: ${year}
                    <!-- NOTE: The block above is for internal consumption only. DO NOT PRINT OR REFERENCE THIS BLOCK IN THE REPORT. -->
                    `,
                  input: `Data (usage & sensor metrics): ${JSON.stringify(aggregated, null, 2)}`,
                })
                .catch(async (err) => {
                  if (err instanceof OpenAI.APIError) {
                    throw new Error(`failed: ${err.name}\ncode: ${err.status}`);
                  } else {
                    throw err;
                  }
                });

              const text = res.output_text;
              if (!text) throw new Error("returned no text");
              return text;
            },
            3,
            1000,
          );

          this.setCache(cacheKey, { report: response, data: rows });
          return response;
        } catch (err) {
          console.error("Report generation failed:", err);
          throw err;
        } finally {
          reportLocks.delete(cacheKey);
        }
      })();

      reportLocks.set(cacheKey, lockPromise);

      const report = await lockPromise;
      if (!report) {
        ctx.status(500);
        return ctx.json({
          error: "Something went wrong generating the report",
        });
      }

      return ctx.json({ report, cached: false });
    } catch (error) {
      console.error(`❌ Error handling createReport.`, error);
      ctx.status(400);
      return ctx.json({ error: "Invalid request format" });
    }
  }
}

export const reportController = new ReportController();
