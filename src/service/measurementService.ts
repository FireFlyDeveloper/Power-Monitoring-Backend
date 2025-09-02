import { pool } from "../database/postgreSQL";
import {
  CREATE_ALL_TABLES,
  SELECT_BY_DATE_ALL,
  INSERT_KWH,
  INSERT_RPM,
  INSERT_TEMPERATURE,
  INSERT_VOLTAGE,
} from "../model/measurements";

export const createTable = async () => {
  try {
    await pool.query(CREATE_ALL_TABLES);
    console.log("Measurements table created successfully");
  } catch (error) {
    console.error("Error creating weather table:", error);
  }
};

export async function createRecordKwh(kwh: number) {
  const client = await pool.connect();
  try {
    const res = await client.query(INSERT_KWH, [kwh]);
    return res.rows[0];
  } finally {
    client.release();
  }
}

export async function createRecordRpm(rpm: number) {
  const client = await pool.connect();
  try {
    const res = await client.query(INSERT_RPM, [rpm]);
    return res.rows[0];
  } finally {
    client.release();
  }
}

export async function createRecordTemperature(temperature: number) {
  const client = await pool.connect();
  try {
    const res = await client.query(INSERT_TEMPERATURE, [temperature]);
    return res.rows[0];
  } finally {
    client.release();
  }
}

export async function createRecordVoltage(voltage: number) {
  const client = await pool.connect();
  try {
    const res = await client.query(INSERT_VOLTAGE, [voltage]);
    return res.rows[0];
  } finally {
    client.release();
  }
}

export async function selectByDate(date?: string) {
  const client = await pool.connect();
  try {
    const res = await client.query(SELECT_BY_DATE_ALL, [date ?? null]);
    return res.rows;
  } finally {
    client.release();
  }
}
