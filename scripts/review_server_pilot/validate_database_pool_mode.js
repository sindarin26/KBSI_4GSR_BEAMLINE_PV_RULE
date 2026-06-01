#!/usr/bin/env node

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const { loadPool } = require("../database_pool_pilot/database_pool");

const root = path.resolve(__dirname, "..", "..");
let failures = 0;

async function main() {
  await test("server rejects mixed legacy and database-pool invocation", async () => {
    const result = await runProcess([
      "scripts/review_server.js",
      "ID10",
      "--database-pool",
      "BL10A",
      "--port",
      "65535",
    ]);
    assert.notStrictEqual(result.code, 0);
    assert.match(result.stderr, /cannot be mixed with --database-pool/);
  });

  await test("single-pool database-pool mode serves adapted state", async () => {
    const tmpRoot = makeTempRoot(["BL10A"]);
    await withServer(tmpRoot, ["--database-pool", "BL10A"], async (port) => {
      const state = await requestJson(port, "/api/state");
      assert.strictEqual(state.mode, "database_pool");
      assert.deepStrictEqual(state.poolIds, ["BL10A"]);
      assert.strictEqual(state.seedDataset, "");
      assert(!state.reviewStatuses.includes("fixed"));
      assert.strictEqual(state.abbreviationRegistry.entryCount, 50);

      const sourceUids = sourceUidsFor(tmpRoot, "BL10A");
      const stateUids = new Set(state.rows.map((row) => row.uid));
      assert.deepStrictEqual(stateUids, sourceUids);
      assert(state.rows.every((row) => row.poolId === "BL10A"));
      assert(state.rows.every((row) => row.dataset === "BL10A"));
      assert(state.rows.every((row) => "decisionSource" in row));
      assert(state.rows.every((row) => row.computed && Array.isArray(row.computed.abbreviationIssues)));

      const html = (await requestText(port, "/")).text;
      assert(!html.includes("Fixed Seed"));
      assert(!html.includes("SEO Seed"));
      assert(html.includes("fixtures/seo_v3_pilot/abbreviation_registry.json"));
      assert(html.includes("function markDirty(row)"));
      assert(html.includes("isDatabasePoolMode() ? row.__dirty"));
    });
  });

  await test("multi-pool database-pool mode preserves pool ownership", async () => {
    const poolIds = ["BL10A", "4GSR_Beamline_PV_Naming_Standard_v1.0"];
    const tmpRoot = makeTempRoot(poolIds);
    await withServer(tmpRoot, ["--database-pool", poolIds[0], "--database-pool", poolIds[1]], async (port) => {
      const state = await requestJson(port, "/api/state");
      assert.deepStrictEqual(state.poolIds, poolIds);
      for (const poolId of poolIds) {
        assert(state.rows.some((row) => row.poolId === poolId), `missing rows for ${poolId}`);
      }
      const expected = new Set();
      for (const poolId of poolIds) {
        for (const uid of sourceUidsFor(tmpRoot, poolId)) expected.add(`${poolId}\0${uid}`);
      }
      const actual = new Set(state.rows.map((row) => `${row.poolId}\0${row.uid}`));
      assert.deepStrictEqual(actual, expected);
    });
  });

  await test("save writes only the owning pool workbench decisions", async () => {
    const poolIds = ["BL10A", "4GSR_Beamline_PV_Naming_Standard_v1.0"];
    const tmpRoot = makeTempRoot(poolIds);
    const otherWorkbench = path.join(tmpRoot, "database_pool", poolIds[1], "decisions", "workbench.decisions.json");
    writeJson(otherWorkbench, {
      poolId: poolIds[1],
      decisions: [
        {
          uid: "pvrow_other_pool_existing_workbench",
          reviewStatus: "approved",
          reviewNote: "Must not be rewritten by another pool save.",
        },
      ],
    });
    const protectedFiles = listProtectedPoolFiles(tmpRoot, poolIds);
    const before = digestFiles(protectedFiles);
    const beforeDecisionFiles = listPoolDecisionFiles(tmpRoot, poolIds);

    await withServer(tmpRoot, ["--database-pool", poolIds[0], "--database-pool", poolIds[1]], async (port) => {
      const state = await requestJson(port, "/api/state");
      const row = state.rows.find((item) => item.poolId === "BL10A" && !item.orphan);
      assert(row);

      const forged = {
        ...row,
        poolId: poolIds[1],
        dataset: poolIds[1],
        reviewStatus: "approved",
      };
      const rejected = await requestJson(port, "/api/decisions", "POST", { rows: [forged] });
      assert.strictEqual(rejected.statusCode, 400);

      row.reviewStatus = "approved";
      row.reviewNote = "Milestone 4 save isolation check.";
      const saved = await requestJson(port, "/api/decisions", "POST", { rows: [row] });
      assert.strictEqual(saved.statusCode, 200);

      const workbench = path.join(tmpRoot, "database_pool", "BL10A", "decisions", "workbench.decisions.json");
      assert(fs.existsSync(workbench));
      for (const [file, digest] of before.entries()) {
        assert.strictEqual(sha1(file), digest, `${file} changed`);
      }
      const afterDecisionFiles = listPoolDecisionFiles(tmpRoot, poolIds);
      assert.deepStrictEqual(
        afterDecisionFiles,
        [...beforeDecisionFiles, workbench].sort(),
      );

      const after = await requestJson(port, "/api/state");
      const updated = after.rows.find((item) => item.uid === row.uid);
      assert.strictEqual(updated.reviewStatus, "approved");
      assert.strictEqual(updated.decisionSource, "workbench.decisions.json");
    });
  });

  await test("orphan decisions are surfaced and can be preserved by workbench save", async () => {
    const tmpRoot = makeTempRoot(["BL10A"]);
    const orphanFile = path.join(tmpRoot, "database_pool", "BL10A", "decisions", "orphan_fixture.decisions.json");
    writeJson(orphanFile, {
      poolId: "BL10A",
      decisions: [
        {
          uid: "pvrow_orphan_m4_review_server",
          reviewStatus: "approved",
          reviewNote: "orphan fixture",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
      ],
    });
    const orphanHash = sha1(orphanFile);

    await withServer(tmpRoot, ["--database-pool", "BL10A"], async (port) => {
      const state = await requestJson(port, "/api/state");
      const orphan = state.rows.find((row) => row.uid === "pvrow_orphan_m4_review_server");
      assert(orphan);
      assert.strictEqual(orphan.orphan, true);
      assert.strictEqual(orphan.reviewStatus, "orphan");
      orphan.reviewNote = "preserved by workbench";

      const saved = await requestJson(port, "/api/decisions", "POST", { rows: [orphan] });
      assert.strictEqual(saved.statusCode, 200);
      assert.strictEqual(sha1(orphanFile), orphanHash);

      const after = await requestJson(port, "/api/state");
      const updated = after.rows.find((row) => row.uid === orphan.uid);
      assert(updated);
      assert.strictEqual(updated.orphan, true);
      assert.strictEqual(updated.decisionSource, "workbench.decisions.json");
    });
  });

  await test("workbench.decisions.json has precedence over curated decisions", async () => {
    const tmpRoot = makeTempRoot(["BL10A"]);
    const pool = loadPool(path.join(tmpRoot, "database_pool", "BL10A"));
    const uid = pool.sourceRows[0].uid;
    writeJson(path.join(tmpRoot, "database_pool", "BL10A", "decisions", "aaa_curated.decisions.json"), {
      poolId: "BL10A",
      decisions: [{ uid, reviewStatus: "rejected", reviewNote: "curated lower precedence" }],
    });
    writeJson(path.join(tmpRoot, "database_pool", "BL10A", "decisions", "workbench.decisions.json"), {
      poolId: "BL10A",
      decisions: [{ uid, reviewStatus: "approved", reviewNote: "workbench wins" }],
    });

    await withServer(tmpRoot, ["--database-pool", "BL10A"], async (port) => {
      const state = await requestJson(port, "/api/state");
      const row = state.rows.find((item) => item.uid === uid);
      assert(row);
      assert.strictEqual(row.reviewStatus, "approved");
      assert.strictEqual(row.reviewNote, "workbench wins");
      assert.strictEqual(row.decisionSource, "workbench.decisions.json");
    });
  });

  if (failures > 0) {
    console.error(`Review server database-pool validation failed with ${failures} failure(s).`);
    process.exit(1);
  }
  console.log("Review server database-pool validation passed.");
}

async function test(message, fn) {
  try {
    await fn();
    console.log(`PASS: ${message}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL: ${message}`);
    console.error(error && error.stack ? error.stack : String(error));
  }
}

function makeTempRoot(poolIds) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pv-review-server-"));
  copyPath("scripts/review_server.js", tmpRoot);
  copyPath("scripts/lib", tmpRoot);
  copyPath("scripts/database_pool_pilot", tmpRoot);
  copyPath("scripts/abbreviation_registry_pilot", tmpRoot);
  copyPath("scripts/seo_v3_pilot", tmpRoot);
  copyPath("fixtures/seo_v3_pilot", tmpRoot);
  for (const poolId of poolIds) copyPath(path.join("database_pool", poolId), tmpRoot);
  return tmpRoot;
}

function copyPath(relPath, tmpRoot) {
  const source = path.join(root, relPath);
  const target = path.join(tmpRoot, relPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}

function listProtectedPoolFiles(tmpRoot, poolIds) {
  const files = [];
  for (const poolId of poolIds) {
    files.push(...listFiles(path.join(tmpRoot, "database_pool", poolId, "sources"), ".rows.json"));
    files.push(...listFiles(path.join(tmpRoot, "database_pool", poolId, "decisions"), ".decisions.json"));
  }
  return files.filter((file) => path.basename(file) !== "workbench.decisions.json" || !file.includes(`${path.sep}BL10A${path.sep}`));
}

function listPoolDecisionFiles(tmpRoot, poolIds) {
  return poolIds
    .flatMap((poolId) => listFiles(path.join(tmpRoot, "database_pool", poolId, "decisions"), ".decisions.json"))
    .sort();
}

function listFiles(dir, suffix) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(full, suffix));
    else if (entry.isFile() && entry.name.endsWith(suffix)) files.push(full);
  }
  return files.sort();
}

function digestFiles(files) {
  return new Map(files.map((file) => [file, sha1(file)]));
}

async function withServer(tmpRoot, args, fn) {
  const port = await freePort();
  const proc = spawn(process.execPath, ["scripts/review_server.js", ...args, "--port", String(port)], {
    cwd: tmpRoot,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  try {
    await new Promise((resolve, reject) => {
      proc.stdout.on("data", (chunk) => {
        stdout += String(chunk);
        if (stdout.includes("Review server")) resolve();
      });
      proc.stderr.on("data", (chunk) => {
        stderr += String(chunk);
      });
      proc.on("exit", (code) => reject(new Error(`server exited before ready: ${code}\n${stderr}`)));
      setTimeout(() => reject(new Error(`server startup timed out\n${stdout}\n${stderr}`)), 5000);
    });
    await fn(port);
  } finally {
    proc.kill("SIGTERM");
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

function runProcess(args) {
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    proc.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    proc.on("exit", (code) => resolve({ code, stdout, stderr }));
  });
}

function requestJson(port, pathName, method = "GET", payload = null) {
  return requestText(port, pathName, method, payload).then((result) => ({
    ...JSON.parse(result.text),
    statusCode: result.statusCode,
  }));
}

function requestText(port, pathName, method = "GET", payload = null) {
  return new Promise((resolve, reject) => {
    const body = payload ? JSON.stringify(payload) : "";
    const req = http.request(
      {
        method,
        host: "127.0.0.1",
        port,
        path: pathName,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let text = "";
        res.on("data", (chunk) => {
          text += chunk;
        });
        res.on("end", () => resolve({ statusCode: res.statusCode, text }));
      },
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });
}

function sourceUidsFor(tmpRoot, poolId) {
  const pool = loadPool(path.join(tmpRoot, "database_pool", poolId));
  return new Set(pool.sourceRows.map((row) => row.uid));
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function sha1(file) {
  return crypto.createHash("sha1").update(fs.readFileSync(file)).digest("hex");
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
