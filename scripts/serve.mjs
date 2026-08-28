import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { createGzip } from "node:zlib";

const root = resolve("site");
const port = 4173;
const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".woff2", "font/woff2"],
]);

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    let filePath = resolve(root, `.${pathname}`);
    if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    if ((await stat(filePath)).isDirectory()) filePath = join(filePath, "index.html");
    const extension = extname(filePath);
    const headers = { "Content-Type": contentTypes.get(extension) ?? "application/octet-stream" };
    const source = createReadStream(filePath);
    if ([".html", ".css", ".js", ".svg"].includes(extension) && request.headers["accept-encoding"]?.includes("gzip")) {
      headers["Content-Encoding"] = "gzip";
      headers.Vary = "Accept-Encoding";
      response.writeHead(200, headers);
      source.pipe(createGzip()).pipe(response);
      return;
    }
    response.writeHead(200, headers);
    source.pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
}).listen(port, "127.0.0.1");
