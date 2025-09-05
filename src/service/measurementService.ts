import { pool } from "../database/postgreSQL";
import cron from "node-cron";
import {
  TABLE_NAME,
  ARCHIVE_TABLE_NAME,
  UNIFIED_VIEW_NAME,
  HOURLY_VIEW_NAME,
  DAILY_VIEW_NAME,
  CREATE_MEASUREMENTS_TABLE,
  CREATE_ARCHIVE_TABLE,
  CREATE_UNIFIED_VIEW,
  CREATE_HOURLY_AGG_VIEW,
  CREATE_DAILY_AGG_VIEW,
  REFRESH_HOURLY_AGG_VIEW,
  REFRESH_DAILY_AGG_VIEW,
  SELECT_BY_RANGE,
  SELECT_BY_TYPE_AND_RANGE,
  ARCHIVE_OLD_DATA,
  DELETE_OLD_DATA,
  RETENTION_DAYS,
} from "../model/measurements";
import { BufferedMeasurement } from "../types/types";

// ==============================
// Initialize Tables + Views
// ==============================
export const createTablesAndViews = async () => {
  try {
    await pool.query(CREATE_MEASUREMENTS_TABLE);
    await pool.query(CREATE_ARCHIVE_TABLE);
    await pool.query(CREATE_UNIFIED_VIEW);
    await pool.query(CREATE_HOURLY_AGG_VIEW);
    await pool.query(CREATE_DAILY_AGG_VIEW);
    console.log("✅ Schema initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing schema:", error);
  }
};

const buffer: BufferedMeasurement[] = [];
const BATCH_SIZE = 100; // flush if buffer reaches this size
const FLUSH_INTERVAL_MS = 1000; // flush every 1s

async function flushBuffer() {
  if (buffer.length === 0) return;

  const client = await pool.connect();
  try {
    const rows = buffer.splice(0, buffer.length); // drain buffer
    const values = rows
      .map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`)
      .join(", ");

    const params = rows.flatMap((row) => [
      row.sensorType,
      row.value,
      row.createdAt,
    ]);

    const query = `
      INSERT INTO ${TABLE_NAME} (sensor_type, value, created_at)
      VALUES ${values}
      ON CONFLICT (sensor_type, created_at) DO NOTHING;
    `;

    const res = await client.query(query, params);
    const inserted = res.rowCount ?? 0;
    console.log(
      `📥 Flushed ${rows.length} measurements (inserted: ${inserted}, skipped duplicates: ${rows.length - inserted})`,
    );
  } catch (error) {
    console.error("❌ Error flushing buffer:", error);
    // ⚠️ in production, add a retry/dead-letter queue
  } finally {
    client.release();
  }
}

// Periodic flush
setInterval(flushBuffer, FLUSH_INTERVAL_MS);

// ==============================
// Insert Measurement (Buffered)
// ==============================
export async function createMeasurement(sensorType: string, value: number) {
  buffer.push({ sensorType, value, createdAt: new Date() });

  if (buffer.length >= BATCH_SIZE) {
    await flushBuffer();
  }
  return { sensorType, value, createdAt: new Date() }; // optimistic return
}

// Convenience wrappers
export const createRecordKwh = (kwh: number) => createMeasurement("kwh", kwh);
export const createRecordRpm = (rpm: number) => createMeasurement("rpm", rpm);
export const createRecordTemperature = (temp: number) =>
  createMeasurement("temperature", temp);
export const createRecordVoltage = (voltage: number) =>
  createMeasurement("voltage", voltage);

// ==============================
// Query Routing Logic
// ==============================
function pickSourceForRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  const hoursRange = (endDate.getTime() - startDate.getTime()) / (1000 * 3600);
  const daysRange = hoursRange / 24;

  if (hoursRange <= 1) {
    // up to 1 hour -> raw
    if (endDate >= cutoff && startDate >= cutoff) return TABLE_NAME;
    if (endDate < cutoff) return ARCHIVE_TABLE_NAME;
    return UNIFIED_VIEW_NAME;
  }

  if (daysRange <= 7) return HOURLY_VIEW_NAME; // 1h–7d → hourly buckets
  if (daysRange <= 180) return DAILY_VIEW_NAME; // >7d–180d → daily
  return DAILY_VIEW_NAME; // fallback
}

// ==============================
// Range Queries
// ==============================
export async function selectByRange(start: string, end: string) {
  const source = pickSourceForRange(start, end);
  const client = await pool.connect();
  try {
    const res = await client.query(SELECT_BY_RANGE(source), [start, end]);
    return res.rows;
  } finally {
    client.release();
  }
}

export async function selectByTypeAndRange(
  sensorType: string,
  start: string,
  end: string,
) {
  const source = pickSourceForRange(start, end);
  const client = await pool.connect();
  try {
    const res = await client.query(SELECT_BY_TYPE_AND_RANGE(source), [
      sensorType,
      start,
      end,
    ]);
    return res.rows;
  } finally {
    client.release();
  }
}

// ==============================
// Cron Jobs
// ==============================

// Refresh aggregates
cron.schedule("5 * * * *", async () => {
  const client = await pool.connect();
  try {
    await client.query(REFRESH_HOURLY_AGG_VIEW);
    console.log("🔄 Hourly aggregates refreshed", new Date().toISOString());
  } finally {
    client.release();
  }
});

cron.schedule("10 0 * * *", async () => {
  const client = await pool.connect();
  try {
    await client.query(REFRESH_DAILY_AGG_VIEW);
    console.log("📊 Daily aggregates refreshed", new Date().toISOString());
  } finally {
    client.release();
  }
});

// Archive old data
cron.schedule("0 1 * * *", async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(ARCHIVE_OLD_DATA(RETENTION_DAYS));
    await client.query(DELETE_OLD_DATA(RETENTION_DAYS));
    await client.query("COMMIT");
    console.log(
      `📦 Archived & purged raw data older than ${RETENTION_DAYS} days`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error archiving data:", error);
  } finally {
    client.release();
  }
});
