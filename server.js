import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const requestedPort = Number(process.env.PORT || 3000);
const host = "127.0.0.1";
const maxPortAttempts = 10;
let activePort = requestedPort;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

const normalizeRequestPath = (requestUrl) => {
  const url = new URL(requestUrl, `http://${host}:${activePort}`);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === "/" || pathname === "/index.html") {
    return path.join(__dirname, "rock.html");
  }

  const requestedPath = path.normalize(path.join(__dirname, pathname));
  if (!requestedPath.startsWith(__dirname)) {
    return null;
  }

  return requestedPath;
};

const send = (response, statusCode, body, contentType = "text/plain; charset=utf-8") => {
  response.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": "no-cache",
  });
  response.end(body);
};

const server = createServer(async (request, response) => {
  const filePath = normalizeRequestPath(request.url || "/");

  if (!filePath) {
    send(response, 403, "Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    send(response, 200, file, contentType);
  } catch {
    send(response, 404, "Not Found");
  }
});

const startServer = (portToTry) => {
  activePort = portToTry;
  server.listen(portToTry, host, () => {
    console.log(`Neon Arena running at http://${host}:${activePort}`);
  });
};

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    const lastPort = requestedPort + maxPortAttempts - 1;

    if (activePort < lastPort) {
      const nextPort = activePort + 1;
      console.log(`Port ${activePort} is busy, trying ${nextPort}...`);
      startServer(nextPort);
      return;
    }

    console.error(`No free port found between ${requestedPort} and ${lastPort}.`);
    process.exit(1);
  }

  throw error;
});

startServer(requestedPort);
