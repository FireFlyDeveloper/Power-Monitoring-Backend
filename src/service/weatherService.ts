import { pool } from "../database/postgreSQL";
import { CREATE, INSERT, SELECT_BY_DATE } from "../model/weather";

export const createTable = async () => {
  try {
    await pool.query(CREATE);
    console.log("Weather table created successfully");
  } catch (error) {
    console.error("Error creating weather table:", error);
  }
};

export async function createRecord(temperature: number, rpm: number) {
  const client = await pool.connect();
  try {
    const res = await client.query(INSERT, [temperature, rpm]);
    return res.rows[0];
  } finally {
    client.release();
  }
}

export async function selectByDate(date?: string) {
  const client = await pool.connect();
  try {
    const res = await client.query(SELECT_BY_DATE, [date ?? null]);
    return res.rows;
  } finally {
    client.release();
  }
}
