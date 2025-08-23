import { pool } from "../database/postgreSQL";
import { verifyPassword, hashPassword } from "../utils/auth";
import {
  CREATE,
  GET_USER,
  SELECT_USER,
  INSERT_USER,
  UPDATE,
} from "../model/auth";

export const createTable = async () => {
  try {
    await pool.query(CREATE);
    console.log("Users table created successfully");
  } catch (error) {
    console.error("Error creating users table:", error);
  }
};

export const getUser = async (
  username: string,
  password: string,
): Promise<Boolean> => {
  try {
    const result = await pool.query(GET_USER, [username]);
    if (result.rows.length > 0) {
      const hashedPassword = result.rows[0].password;
      const isMatch = await verifyPassword(password, hashedPassword);
      return isMatch;
    }
    return false;
  } catch (error) {
    console.error("Error fetching user:", error);
    return false;
  }
};

export const createUser = async (): Promise<boolean> => {
  const adminUsername = "admin";
  const adminPassword = "admin";

  try {
    const existingUser = await pool.query(SELECT_USER, [adminUsername]);

    if (existingUser.rows.length > 0) {
      console.log("Admin user already exists");
      return false;
    }

    const hashedPassword = await hashPassword(adminPassword);
    await pool.query(INSERT_USER, [adminUsername, hashedPassword]);

    console.log("Admin user created successfully");
    return true;
  } catch (error) {
    console.error("Error creating admin user:", error);
    return false;
  }
};

export const updateUser = async (
  username: string,
  password: string,
): Promise<Boolean> => {
  const hashedPassword = await hashPassword(password);
  try {
    await pool.query(UPDATE, [hashedPassword, username]);
    return true;
  } catch (error) {
    console.error("Error updating user:", error);
    return false;
  }
};
