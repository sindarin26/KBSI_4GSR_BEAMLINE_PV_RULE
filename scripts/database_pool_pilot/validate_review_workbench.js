#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const {
  DEFAULT_REGISTRY_PATH,
  bulkApproveVisible,
  createServer,
  filterRows,
  loadWorkbenchState,
  previewImport,
  saveAbbreviationDecision,
  saveImport,
  saveRowDecision,
} = require("./review_workbench");
const { loadRegistry } = require("../abbreviation_registry_pilot/abbreviation_registry");

const root = path.resolve(__dirname, "..", "..");
const registryPath = DEFAULT_REGISTRY_PATH;
const withHttp = process.argv.includes("--with-http");

let failures = 0;
const cleanup = [];

function pass(message) {
  console.log(`PASS: ${message}`);
}

function fail(message, error) {
  failures += 1;
  console.error(`FAIL: ${message}`);
  if (error && error.stack) console.error(error.stack);
  else if (error) console.error(String(error));
}

async function test(message, fn) {
  try {
    await fn();
    pass(message);
  } catch (error) {
    fail(message, error);
  }
}

function makeTempRoot(poolIds = ["BL10A"]) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pv-m5-"));
  fs.mkdirSync(path.join(tmpRoot, "database_pool"), { recursive: true });
  fs.mkdirSync(path.join(tmpRoot, "fixtures", "seo_v3_pilot"), { recursive: true });
  fs.mkdirSync(path.join(tmpRoot, "inputs"), { recursive: true });
  for (const poolId of poolIds) {
    fs.cpSync(path.join(root, "database_pool", poolId), path.join(tmpRoot, "database_pool", poolId), {
      recursive: true,
    });
  }
  fs.cpSync(path.join(root, "inputs", "BL10A"), path.join(tmpRoot, "inputs", "BL10A"), {
    recursive: true,
  });
  fs.copyFileSync(
    path.join(root, registryPath),
    path.join(tmpRoot, "fixtures", "seo_v3_pilot", "abbreviation_registry.json"),
  );
  cleanup.push(tmpRoot);
  return tmpRoot;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function requestJson(server, pathName, options = {}) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      const body = options.body ? JSON.stringify(options.body) : "";
      const request = http.request(
        {
          host: "127.0.0.1",
          port,
          path: pathName,
          method: options.method || "GET",
          headers: body
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body),
              }
            : {},
        },
        (res) => {
          let text = "";
          res.on("data", (chunk) => {
            text += chunk;
          });
          res.on("end", () => {
            server.close();
            try {
              resolve({ statusCode: res.statusCode, body: JSON.parse(text) });
            } catch (error) {
              reject(error);
            }
          });
        },
      );
      request.on("error", (error) => {
        server.close();
        reject(error);
      });
      if (body) request.write(body);
      request.end();
    });
  });
}

(async () => {
  await test("workbench loads all database pools into one shared model", () => {
    const state = loadWorkbenchState({ rootDir: root, registryPath });
    assert.deepStrictEqual(state.poolIds, [
      "4GSR_Beamline_PV_Naming_Standard_v1.0",
      "BL10A",
      "seo_v3_m2_pilot",
    ]);
    assert.strictEqual(state.rows.length, 14);
    assert.strictEqual(state.registry.entries.length, 50);
    assert.strictEqual(state.stats.pending, 0);
    assert.strictEqual(state.stats.conflicts, 2);
    assert(state.stats.needsInput >= 13);
  });

  await test("filter semantics cover pool, source, state, components, prefix, and search", () => {
    const state = loadWorkbenchState({ rootDir: root, registryPath });
    assert.strictEqual(filterRows(state.rows, { poolId: "BL10A" }).length, 3);
    assert.strictEqual(filterRows(state.rows, { sourceId: "inputs/BL10A/undulator.md" }).length, 2);
    assert(filterRows(state.rows, { reviewStatus: "needs_input" }).length >= 1);
    assert(filterRows(state.rows, { section: "BL", port: "10A", area: "FE" }).length >= 3);
    assert(filterRows(state.rows, { device: "IVU", subdevice: "GIRD" }).length >= 2);
    assert(filterRows(state.rows, { prefix: "BL10A-FE" }).every((row) => row.computed.prefix === "BL10A-FE"));
    assert.deepStrictEqual(
      filterRows(state.rows, { search: "EncUS" }).map((row) => row.standardPv),
      ["BL10A-FE:IVU-ENC:US"],
    );
  });

  await test("row decision save writes an overlay without rewriting source rows", () => {
    const tmpRoot = makeTempRoot();
    const sourcePath = path.join(tmpRoot, "database_pool", "BL10A", "sources", "id10_small_subset.rows.json");
    const decisionPath = path.join(tmpRoot, "database_pool", "BL10A", "decisions", "m4.decisions.json");
    const beforeSource = fs.readFileSync(sourcePath, "utf8");
    const state = loadWorkbenchState({ rootDir: tmpRoot, registryPath, poolIds: ["BL10A"] });
    const row = state.rows.find((item) => item.standardPv === "BL10A-OH:MONO-CRYS:Theta");

    saveRowDecision({ rootDir: tmpRoot, registryPath, poolIds: ["BL10A"] }, row.uid, {
      reviewStatus: "accepted",
      reviewNote: "M5 validation overlay edit.",
    });

    const decisionData = readJson(decisionPath);
    assert.strictEqual(decisionData.decisions.length, 1);
    assert.strictEqual(decisionData.decisions[0].uid, row.uid);
    assert.strictEqual(decisionData.decisions[0].reviewStatus, "accepted");
    assert.strictEqual(fs.readFileSync(sourcePath, "utf8"), beforeSource);
  });

  await test("abbreviation decision save updates the registry only", () => {
    const tmpRoot = makeTempRoot();
    const targetRegistryPath = path.join(tmpRoot, registryPath);
    saveAbbreviationDecision({ rootDir: tmpRoot, registryPath, poolIds: ["BL10A"] }, {
      kind: "device",
      code: "MONO",
      status: "approved",
    });
    const registry = loadRegistry(targetRegistryPath);
    const mono = registry.entries.find((entry) => entry.kind === "device" && entry.code === "MONO");
    assert.strictEqual(mono.status, "approved");
  });

  await test("bulk approval only affects visible pending rows", () => {
    const tmpRoot = makeTempRoot();
    const options = { rootDir: tmpRoot, registryPath, poolIds: ["BL10A"] };
    const initialState = loadWorkbenchState(options);
    const visibleUids = initialState.rows.map((row) => row.uid);

    const blocked = bulkApproveVisible(options, visibleUids, false);
    assert.strictEqual(blocked.approvedCount, 0);
    assert.strictEqual(blocked.blockedCount, 3);

    const approved = bulkApproveVisible(options, visibleUids, true);
    assert.strictEqual(approved.approvedCount, 2);
    assert.strictEqual(approved.blockedCount, 1);

    const decisionPath = path.join(tmpRoot, "database_pool", "BL10A", "decisions", "m4.decisions.json");
    const decisions = readJson(decisionPath).decisions;
    assert.strictEqual(decisions.filter((decision) => decision.reviewStatus === "approved").length, 2);
    const nextState = loadWorkbenchState(options);
    const encRow = nextState.rows.find((row) => row.standardPv === "BL10A-FE:IVU-ENC:US");
    assert.strictEqual(encRow.reviewStatus, "needs_input");
  });

  await test("import preview and save use the shared importer and refresh state", () => {
    const tmpRoot = makeTempRoot();
    const options = { rootDir: tmpRoot, registryPath, poolIds: ["BL10A"] };
    const payload = { inputDir: "inputs/BL10A", poolId: "BL10A" };

    const preview = previewImport(options, payload);
    assert.strictEqual(preview.errors.length, 0);
    assert.strictEqual(preview.filesScanned, 7);
    assert.strictEqual(preview.rowsExtracted, 113);
    assert(preview.warnings.some((warning) => warning.includes("duplicate standardPv")));
    assert(preview.warnings.some((warning) => warning.includes("no source PV tokens found")));
    assert(!fs.existsSync(path.join(tmpRoot, "database_pool", "BL10A", "sources", "import_undulator_md.rows.json")));

    const saved = saveImport(options, payload);
    assert.strictEqual(saved.summary.errors.length, 0);
    assert(saved.state);
    assert.strictEqual(saved.state.rows.length, 116);
    assert(fs.existsSync(path.join(tmpRoot, "database_pool", "BL10A", "sources", "import_undulator_md.rows.json")));
    assert(saved.state.rows.filter((row) => row.sourceId === "inputs/BL10A/undulator.md").length > 2);
    assert(saved.state.rows.some((row) => row.reviewStatus === "needs_input" && row.computed.needsInput));

    const blocked = saveImport(options, payload);
    assert.strictEqual(blocked.state, null);
    assert(blocked.summary.errors.every((error) => error.includes("target exists")));

    const overwritten = saveImport(options, { ...payload, overwrite: true });
    assert.strictEqual(overwritten.summary.errors.length, 0);
    assert.strictEqual(overwritten.state.rows.length, 116);
  });

  await test("import save includes newly created pool in restricted workbench state", () => {
    const tmpRoot = makeTempRoot();
    const inputDir = path.join(tmpRoot, "inputs", "BL99A");
    fs.mkdirSync(inputDir, { recursive: true });
    fs.writeFileSync(path.join(inputDir, "custom.txt"), "BL10:DET:X\n");

    const saved = saveImport(
      { rootDir: tmpRoot, registryPath, poolIds: ["BL10A"] },
      { inputDir: "inputs/BL99A", poolId: "BL99A" },
    );
    assert.strictEqual(saved.summary.errors.length, 0);
    assert(saved.state.poolIds.includes("BL10A"));
    assert(saved.state.poolIds.includes("BL99A"));
    assert(saved.state.rows.some((row) => row.poolId === "BL99A" && row.reviewStatus === "needs_input"));
    const manifest = fs.readFileSync(path.join(tmpRoot, "database_pool", "BL99A", "manifest.yaml"), "utf8");
    assert(manifest.includes("status: pilot"));
  });

  if (withHttp) {
    await test("HTTP state endpoint serves the same shared model", async () => {
      const tmpRoot = makeTempRoot();
      const server = createServer({ rootDir: tmpRoot, registryPath, poolIds: ["BL10A"] });
      const response = await requestJson(server, "/api/state?poolId=BL10A");
      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(response.body.rows.length, 3);
      assert.strictEqual(response.body.visibleRows.length, 3);
      assert.strictEqual(response.body.registry.entries.length, 50);
    });

    await test("HTTP import endpoints preview and save imported rows", async () => {
      const tmpRoot = makeTempRoot();
      const payload = { inputDir: "inputs/BL10A", poolId: "BL10A" };
      const previewServer = createServer({ rootDir: tmpRoot, registryPath, poolIds: ["BL10A"] });
      const preview = await requestJson(previewServer, "/api/import-preview", {
        method: "POST",
        body: payload,
      });
      assert.strictEqual(preview.statusCode, 200);
      assert.strictEqual(preview.body.errors.length, 0);
      assert.strictEqual(preview.body.rowsExtracted, 113);

      const saveServer = createServer({ rootDir: tmpRoot, registryPath, poolIds: ["BL10A"] });
      const saved = await requestJson(saveServer, "/api/import-save", {
        method: "POST",
        body: payload,
      });
      assert.strictEqual(saved.statusCode, 200);
      assert.strictEqual(saved.body.summary.errors.length, 0);
      assert.strictEqual(saved.body.state.rows.length, 116);

      const blockedServer = createServer({ rootDir: tmpRoot, registryPath, poolIds: ["BL10A"] });
      const blocked = await requestJson(blockedServer, "/api/import-save", {
        method: "POST",
        body: payload,
      });
      assert.strictEqual(blocked.statusCode, 409);
      assert(blocked.body.summary.errors.every((error) => error.includes("target exists")));
      assert.strictEqual(blocked.body.state, null);
    });
  } else {
    pass("HTTP state endpoint smoke skipped (run with --with-http)");
  }

  await test("workbench UI text avoids retired user-facing labels", () => {
    const text = fs.readFileSync(path.join(root, "scripts", "database_pool_pilot", "review_workbench.js"), "utf8");
    assert(!/\bseed\b/i.test(text));
    assert(!/\bfixed\b/i.test(text));
    for (const label of ["All Rows", "Review", "Needs Input", "Conflicts", "Approved", "Abbreviations"]) {
      assert(text.includes(label), label);
    }
    for (const label of ["Preview Import", "Save Import", "overwrite existing import files"]) {
      assert(text.includes(label), label);
    }
  });

  for (const dir of cleanup) {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  if (failures > 0) {
    console.error(`M5 review workbench validation failed with ${failures} failure(s).`);
    process.exit(1);
  }

  console.log("M5 review workbench validation passed.");
})().catch((error) => {
  fail("unexpected validation failure", error);
  process.exit(1);
});
