import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { request } from "node:http";
import { after, before, test } from "node:test";

const port = 4173;
let server;

function fetchAsset(acceptEncoding) {
  return new Promise((resolve, reject) => {
    const req = request({
      hostname: "127.0.0.1",
      port,
      path: "/styles.css",
      headers: { "Accept-Encoding": acceptEncoding },
    }, (response) => {
      response.resume();
      response.on("end", () => resolve(response.headers));
    });
    req.on("error", reject);
    req.end();
  });
}

async function waitForServer() {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    try {
      await fetchAsset("identity");
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
  }
  throw new Error("local test server did not start");
}

before(async () => {
  server = spawn(process.execPath, ["scripts/serve.mjs"], {
    cwd: new URL("../..", import.meta.url),
    stdio: "ignore",
  });
  await waitForServer();
});

after(() => {
  server.kill("SIGTERM");
});

test("does not gzip when gzip is explicitly disabled", async () => {
  const headers = await fetchAsset("br, gzip;q=0");
  assert.equal(headers["content-encoding"], undefined);
  assert.equal(headers.vary, "Accept-Encoding");
});

test("varies compressible identity responses by Accept-Encoding", async () => {
  const headers = await fetchAsset("identity");
  assert.equal(headers["content-encoding"], undefined);
  assert.equal(headers.vary, "Accept-Encoding");
});

test("accepts gzip directly or through a positive wildcard", async () => {
  for (const acceptEncoding of ["gzip;q=0.7", "br;q=0, *;q=0.5"]) {
    const headers = await fetchAsset(acceptEncoding);
    assert.equal(headers["content-encoding"], "gzip", acceptEncoding);
    assert.equal(headers.vary, "Accept-Encoding", acceptEncoding);
  }
});

test("an explicit gzip denial overrides a positive wildcard", async () => {
  const headers = await fetchAsset("gzip;q=0, *;q=1");
  assert.equal(headers["content-encoding"], undefined);
  assert.equal(headers.vary, "Accept-Encoding");
});
