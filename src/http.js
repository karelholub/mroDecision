import { readFile } from "node:fs/promises";
import path from "node:path";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

export async function readJson(req, limitBytes = 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limitBytes) {
      const error = new Error("Request body too large");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Invalid JSON body");
    error.statusCode = 400;
    throw error;
  }
}

export function sendJson(res, statusCode, payload, headers = {}) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...headers,
    ...responseHeaders(res)
  });
  res.end(body);
}

export function sendText(res, statusCode, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, {
    "content-type": contentType,
    "cache-control": "no-store",
    ...responseHeaders(res)
  });
  res.end(body);
}

export function sendBuffer(res, statusCode, body, contentType = "application/octet-stream") {
  res.writeHead(statusCode, {
    "content-type": contentType,
    "cache-control": "public, max-age=31536000, immutable",
    ...responseHeaders(res)
  });
  res.end(body);
}

export function sendError(res, error) {
  sendJson(res, error.statusCode || 500, {
    error: error.code || "error",
    message: error.statusCode ? error.message : "Internal server error"
  });
}

export async function serveStatic(res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const publicRoot = path.resolve("public");
  const filePath = path.resolve(publicRoot, `.${safePath}`);
  if (!filePath.startsWith(publicRoot)) return false;

  try {
    const file = await readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, {
      "content-type": contentTypes[ext] || "application/octet-stream",
      "cache-control": "no-store",
      ...responseHeaders(res)
    });
    res.end(file);
    return true;
  } catch {
    return false;
  }
}

export function notFound(res) {
  sendJson(res, 404, { error: "not_found", message: "Route not found" });
}

export function createdAtNow() {
  return new Date().toISOString();
}

function responseHeaders(res) {
  return {
    ...(res.requestId ? { "x-request-id": res.requestId } : {}),
    ...(res.corsOrigin
      ? {
          "access-control-allow-origin": res.corsOrigin,
          "access-control-allow-credentials": "false",
          "access-control-allow-headers": "authorization, content-type, idempotency-key, x-request-id, ngrok-skip-browser-warning, x-dee-app, x-dee-app-id, x-dee-env, x-dee-environment",
          "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
          "access-control-max-age": "600",
          vary: "Origin"
        }
      : {})
  };
}
