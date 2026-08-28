import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { createGzip } from "node:zlib";

const root = resolve("site");
const configuredPort = Number(process.env.HUAJUAN_SERVER_PORT ?? 4173);
if (!Number.isInteger(configuredPort) || configuredPort < 0 || configuredPort > 65535) {
  throw new Error("HUAJUAN_SERVER_PORT must be an integer from 0 to 65535");
}
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
    const qualityMatch = parameters.length === 0
      ? ["", "1"]
      : parameters.length === 1
        ? parameters[0].trim().match(/^q=(0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/i)
        : null;
    const quality = qualityMatch ? Number(qualityMatch[1]) : 0;
    if (encoding === "gzip") gzipQuality = quality;
    if (encoding === "*") wildcardQuality = quality;
  }
  return (gzipQuality ?? wildcardQuality ?? 0) > 0;
}

const server = createServer(async (request, response) => {
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
});

server.listen(configuredPort, "127.0.0.1", () => {
  const address = server.address();
  if (process.send && address && typeof address === "object") {
    process.send({ type: "huajuan:server-ready", pid: process.pid, port: address.port });
  }
});
