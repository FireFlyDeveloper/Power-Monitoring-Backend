import { GoogleGenAI } from "@google/genai";
import { getMonthRange } from "../utils/getMonthRange";
import { selectByRange } from "../service/measurementService";
import { Context } from "hono";
import { withRetry } from "../utils/retry";
import { CacheEntry } from "../types/types";
import fetch, { FormData } from "node-fetch";
import * as ExcelJS from "exceljs";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

const reportCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = Number(process.env.REPORT_CACHE_TTL_MS) || 3600000; // default 1 hour

const reportLocks = new Map<string, Promise<any>>();
const rawDataLocks = new Map<string, Promise<any>>();

async function convertRowsToExcel(rows: any[]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Data");

  if (!rows || rows.length === 0) {
    throw new Error("No data to convert");
  }

  worksheet.columns = Object.keys(rows[0]).map((key) => ({
    header: key,
    key,
  }));

  rows.forEach((row) => worksheet.addRow(row));

  return workbook.xlsx.writeBuffer();
}

class ReportController {
  constructor() {
    this.getRawData = this.getRawData.bind(this);
    this.createReport = this.createReport.bind(this);
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
          const rows = cached?.data ?? (await selectByRange(start, end));
          if (!rows?.length) {
            return ctx.json({ error: "No data to report" }, 404);
          }

          const excelBuffer = await convertRowsToExcel(rows);
          const fileName = `report_${start}_${end}.xlsx`;

          const form = new FormData();
          form.append("file", new Blob([excelBuffer]), fileName);
          form.append("fileName", fileName);
          form.append(
            "fileType",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          );
          form.append("github", "https://github.com/FireFlyDeveloper");
          form.append("developer", "This api is owned by FireFlyDeveloper");

          const response = await withRetry(
            async () => {
              const res = await fetch(
                "http://192.168.100.99:5678/webhook-test/58e78957-782c-4dcc-bcbc-8017fbd3f03c",
                {
                  method: "POST",
                  body: form,
                },
              );

              if (!res.ok) throw new Error(`Webhook failed: ${res.statusText}`);

              const text = await res.text();
              if (!text) throw new Error("Webhook returned no text");
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
