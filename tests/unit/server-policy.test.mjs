import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { once } from "node:events";
import { request } from "node:http";
import test from "node:test";

function fetchAsset(port, acceptEncoding, path = "/styles.css") {
  return new Promise((resolve, reject) => {
    const req = request({
      hostname: "127.0.0.1",
      port,
      path,
      headers: { "Accept-Encoding": acceptEncoding },
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({
        body: Buffer.concat(chunks),
        headers: response.headers,
        statusCode: response.statusCode,
      }));
    });
    req.on("error", reject);
    req.end();
  });
}

function waitForReady(child) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      child.off("error", onError);
      child.off("exit", onExit);
      child.off("message", onMessage);
      resolve(result);
    };
    const onError = (error) => finish({ status: "error", message: error.message });
    const onExit = (code, signal) => finish({ status: "exit", code, signal });
    const onMessage = (message) => {
      if (message?.type === "huajuan:server-ready") finish({ status: "ready", ...message });
    };
    const timeout = setTimeout(() => finish({ status: "timeout" }), 1500);
    child.once("error", onError);
    child.once("exit", onExit);
    child.on("message", onMessage);
  });
}

async function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit");
  child.kill("SIGTERM");
  await exited;
}

test("serves encoding policy from its own isolated child", async (t) => {
  const child = fork("scripts/serve.mjs", [], {
    cwd: new URL("../..", import.meta.url),
    env: { ...process.env, HUAJUAN_SERVER_PORT: "0" },
    stdio: ["ignore", "ignore", "ignore", "ipc"],
  });
  const readiness = await waitForReady(child);

  try {
    assert.equal(readiness.status, "ready", `child did not announce readiness: ${JSON.stringify(readiness)}`);
    assert.equal(readiness.pid, child.pid, "readiness must come from the spawned child");
    assert.ok(Number.isInteger(readiness.port) && readiness.port > 0, `invalid child port: ${readiness.port}`);
    const port = readiness.port;

    await t.test("does not gzip when gzip is explicitly disabled", async () => {
      const { headers, statusCode } = await fetchAsset(port, "br, gzip;q=0");
      assert.equal(statusCode, 200);
      assert.equal(headers["content-encoding"], undefined);
      assert.equal(headers.vary, "Accept-Encoding");
    });

    await t.test("varies compressible identity responses by Accept-Encoding", async () => {
      const { headers } = await fetchAsset(port, "identity");
      assert.equal(headers["content-encoding"], undefined);
      assert.equal(headers.vary, "Accept-Encoding");
    });

    await t.test("accepts gzip directly or through a positive wildcard", async () => {
      for (const acceptEncoding of ["gzip;q=0.7", "br;q=0, *;q=0.5"]) {
        const { headers } = await fetchAsset(port, acceptEncoding);
        assert.equal(headers["content-encoding"], "gzip", acceptEncoding);
        assert.equal(headers.vary, "Accept-Encoding", acceptEncoding);
      }
    });

    await t.test("an explicit gzip denial overrides a positive wildcard", async () => {
      const { headers } = await fetchAsset(port, "gzip;q=0, *;q=1");
      assert.equal(headers["content-encoding"], undefined);
      assert.equal(headers.vary, "Accept-Encoding");
    });

    await t.test("accepts only valid RFC qvalue boundaries", async () => {
      for (const acceptEncoding of ["gzip", "gzip;q=0.001", "gzip;q=0.999", "gzip;q=1", "gzip;q=1.", "gzip;q=1.000"]) {
        const { headers } = await fetchAsset(port, acceptEncoding);
        assert.equal(headers["content-encoding"], "gzip", acceptEncoding);
      }
      for (const acceptEncoding of ["gzip;q=0", "gzip;q=0.", "gzip;q=0.000"]) {
        const { headers } = await fetchAsset(port, acceptEncoding);
        assert.equal(headers["content-encoding"], undefined, acceptEncoding);
      }
    });

    await t.test("rejects malformed duplicate and unsupported gzip parameters", async () => {
      for (const acceptEncoding of [
        "gzip;q=.5",
        "gzip;q=1e-3",
        "gzip;q=0.1234",
        "gzip;q=1.001",
        "gzip;q=00.5",
        "gzip;level=1",
        "gzip;q=0.5;q=0.4",
        "gzip;q=0.5;level=1",
      ]) {
        const { headers } = await fetchAsset(port, acceptEncoding);
        assert.equal(headers["content-encoding"], undefined, acceptEncoding);
        assert.equal(headers.vary, "Accept-Encoding", acceptEncoding);
      }
    });

    await t.test("serves the root index and returns 404 for missing directories and files", async () => {
      const root = await fetchAsset(port, "identity", "/");
      assert.equal(root.statusCode, 200);
      assert.equal(root.headers["content-type"], "text/html; charset=utf-8");
      assert.match(root.body.toString(), /花卷 AI 实验室/);

      for (const path of ["/assets/", "/missing-file.txt"]) {
        const missing = await fetchAsset(port, "identity", path);
        assert.equal(missing.statusCode, 404, path);
        assert.equal(missing.headers["content-type"], "text/plain; charset=utf-8", path);
      }
    });

    await t.test("denies encoded traversal outside the site root", async () => {
      const response = await fetchAsset(port, "identity", "/..%2fpackage.json");
      assert.equal(response.statusCode, 403);
      assert.equal(response.body.toString(), "Forbidden");
    });

    await t.test("serves every site MIME type from the isolated child", async () => {
      for (const [path, contentType] of [
        ["/index.html", "text/html; charset=utf-8"],
        ["/styles.css", "text/css; charset=utf-8"],
        ["/app.js", "text/javascript; charset=utf-8"],
        ["/assets/huajuan-mark.svg", "image/svg+xml"],
        ["/assets/fonts/IBMPlexMono-SemiBold.woff2", "font/woff2"],
      ]) {
        const response = await fetchAsset(port, "identity", path);
        assert.equal(response.statusCode, 200, path);
        assert.equal(response.headers["content-type"], contentType, path);
      }
    });

    await t.test("does not attach explicit cache metadata", async () => {
      for (const path of ["/", "/styles.css", "/missing-file.txt"]) {
        const { headers } = await fetchAsset(port, "identity", path);
        for (const name of ["cache-control", "expires", "etag", "last-modified"]) {
          assert.equal(headers[name], undefined, `${path} ${name}`);
        }
      }
    });
  } finally {
    await stopChild(child);
  }
});
