import { Hono } from "hono";
import { createHmac, createHash, timingSafeEqual } from "crypto";
import { config } from "../config.js";
import logger from "../utils/logger.js";

const app = new Hono();

const toSha256 = (value: string) => createHash("sha256").update(value).digest();

const safeEqual = (left: string, right: string): boolean => {
  const leftBuffer = toSha256(left);
  const rightBuffer = toSha256(right);
  return timingSafeEqual(leftBuffer, rightBuffer);
};

const firstHeader = (c: { req: { header: (name: string) => string | undefined } }, name: string) =>
  c.req.header(name)?.trim() || "";

const firstQuery = (c: { req: { query: (name: string) => string | undefined } }, name: string) =>
  c.req.query(name)?.trim() || "";

const readBodyValue = async (c: { req: { text: () => Promise<string> } }, name: string): Promise<string> => {
  try {
    const raw = await c.req.text();
    if (!raw) return "";

    try {
      const parsed = JSON.parse(raw);
      return typeof parsed?.[name] === "string" ? parsed[name] : "";
    } catch {
      const params = new URLSearchParams(raw);
      return params.get(name) || "";
    }
  } catch {
    return "";
  }
};

const buildSignedToken = (
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  secret: string,
) => createHmac("sha256", secret)
    .update(`${method}\n${path}\n${timestamp}\n${nonce}`)
    .digest("hex");

const isTimestampValid = (timestamp: string): boolean => {
  const parsed = Number(timestamp);
  if (!Number.isFinite(parsed)) return false;
  const drift = Math.abs(Date.now() / 1000 - parsed);
  return drift <= config.ORIGIN_AUTH_TTL;
};

app.all("/", async (c) => {
  const secret = config.QINIU_ORIGIN_AUTH_SECRET;

  if (!secret) {
    logger.warn("QINIU_ORIGIN_AUTH_SECRET is not configured; origin auth is disabled");
    return c.json({ ok: false, error: "origin auth is not configured" }, 503);
  }

  const method = c.req.method.toUpperCase();
  const path = c.req.path;
  const sign =
    firstQuery(c, config.ORIGIN_AUTH_SIGN_QUERY) ||
    firstHeader(c, "x-origin-auth-sign") ||
    "";
  const timestamp =
    firstQuery(c, config.ORIGIN_AUTH_SIGN_TIMESTAMP_QUERY) ||
    firstHeader(c, "x-origin-auth-timestamp") ||
    "";
  const nonce =
    firstQuery(c, config.ORIGIN_AUTH_SIGN_NONCE_QUERY) ||
    firstHeader(c, "x-origin-auth-nonce") ||
    "";

  if (sign && timestamp && isTimestampValid(timestamp)) {
    const expected = buildSignedToken(method, path, timestamp, nonce, secret);
    if (safeEqual(sign, expected)) {
      return c.json({ ok: true, mode: "signed" });
    }
  }

  const staticToken =
    firstHeader(c, config.ORIGIN_AUTH_STATIC_HEADER) ||
    firstQuery(c, config.ORIGIN_AUTH_STATIC_QUERY) ||
    await readBodyValue(c, config.ORIGIN_AUTH_STATIC_QUERY);

  if (staticToken && safeEqual(staticToken, secret)) {
    return c.json({ ok: true, mode: "static" });
  }

  logger.warn("Origin auth request rejected");
  return c.json({ ok: false, error: "forbidden" }, 403);
});

export default app;
