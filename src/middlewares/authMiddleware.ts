import { Context, Next } from "hono";
import { verifyToken } from "../utils/tokenizer";
import { MiddlewareHandler } from "hono";

export const authMiddleware: MiddlewareHandler = async (
  c: Context,
  next: Next,
) => {
  const jwt = c.req.header("Authorization")?.replace("Bearer ", "");

  if (!jwt) return c.json({ message: "Unauthorized" }, 401);

  try {
    const decoded = verifyToken(jwt);
    c.set("user", decoded);
    await next();
  } catch (err) {
    return c.json({ message: "Unauthorized" }, 401);
  }
};
