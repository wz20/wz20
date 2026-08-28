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
const compressibleExtensions = new Set([".html", ".css", ".js", ".svg"]);

function acceptsGzip(header = "") {
  let gzipQuality;
  let wildcardQuality;
  for (const entry of header.split(",")) {
    const [rawEncoding, ...parameters] = entry.trim().split(";");
    const encoding = rawEncoding.trim().toLowerCase();
    if (!encoding) continue;
    const qualityParameter = parameters.find((parameter) => /^\s*q\s*=/i.test(parameter));
    const parsedQuality = qualityParameter ? Number(qualityParameter.split("=")[1]?.trim()) : 1;
    const quality = Number.isFinite(parsedQuality) && parsedQuality >= 0 && parsedQuality <= 1 ? parsedQuality : 0;
    if (encoding === "gzip") gzipQuality = quality;
    if (encoding === "*") wildcardQuality = quality;
  }
  return (gzipQuality ?? wildcardQuality ?? 0) > 0;
}

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
    const compressible = compressibleExtensions.has(extension);
    if (compressible) headers.Vary = "Accept-Encoding";
    if (compressible && acceptsGzip(request.headers["accept-encoding"])) {
      headers["Content-Encoding"] = "gzip";
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
