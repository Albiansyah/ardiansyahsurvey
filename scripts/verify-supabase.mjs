import { readFile } from "node:fs/promises";

const parseEnv = (text) => Object.fromEntries(
  text.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    })
);

const env = parseEnv(await readFile(new URL("../.env.local", import.meta.url), "utf8"));
const url = env.VITE_SUPABASE_URL;
const publishable = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const secret = env.SUPABASE_SECRET_KEY;

if (!url || !publishable || !secret) throw new Error("Konfigurasi Supabase belum lengkap.");

const checks = [];
const request = async (name, endpoint, key) => {
  try {
    const response = await fetch(`${url}${endpoint}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }
    });
    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
    checks.push({ name, status: response.status, ok: response.ok, payload });
  } catch (error) {
    checks.push({ name, status: 0, ok: false, error: error.message });
  }
};

await request("auth", "/auth/v1/settings", publishable);
await request("auth-admin", "/auth/v1/admin/users?page=1&per_page=1", secret);
await request("rest", "/rest/v1/", secret);
await request("service-profiles", "/rest/v1/profiles?select=id&limit=1", secret);
await request("storage", "/storage/v1/bucket", secret);

for (const check of checks) {
  console.log(`${check.name}: ${check.ok ? "PASS" : "FAIL"} (${check.status || "network"})`);
}

const rest = checks.find((check) => check.name === "rest");
const definitions = rest?.payload?.definitions || {};
const paths = rest?.payload?.paths || {};
const requiredTables = ["profiles", "outlets", "survey_targets", "survey_reports", "change_requests", "audit_logs"];
const foundTables = requiredTables.filter((table) => Object.hasOwn(definitions, table));
console.log(`schema tables: ${foundTables.length}/${requiredTables.length}`);
if (foundTables.length) console.log(`found: ${foundTables.join(", ")}`);
const approvalRpcReady = Object.hasOwn(paths, "/rpc/resolve_change_request");
console.log(`approval rpc: ${approvalRpcReady ? "READY" : "MISSING"}`);

const storage = checks.find((check) => check.name === "storage");
const buckets = Array.isArray(storage?.payload) ? storage.payload : [];
console.log(`storage bucket: ${buckets.some((bucket) => bucket.id === "survey-evidence") ? "READY" : "MISSING"}`);

const authAdmin = checks.find((check) => check.name === "auth-admin");
const userCount = authAdmin?.payload?.total ?? authAdmin?.payload?.users?.length ?? 0;
console.log(`auth users: ${userCount}`);

let edgeStatus = "UNKNOWN";
try {
  const edgeResponse = await fetch(`${url}/functions/v1/admin-create-surveyor`, {
    method: "POST",
    headers: {
      apikey: publishable,
      Authorization: `Bearer ${publishable}`,
      "Content-Type": "application/json"
    },
    body: "{}"
  });
  edgeStatus = edgeResponse.status === 404 ? "MISSING" : "DEPLOYED";
} catch {
  edgeStatus = "NETWORK_ERROR";
}
console.log(`admin create surveyor function: ${edgeStatus}`);

let anonymousDataDenied = false;
try {
  const anonymousResponse = await fetch(`${url}/rest/v1/outlets?select=id&limit=1`, {
    headers: { apikey: publishable }
  });
  anonymousDataDenied = anonymousResponse.status === 401 || anonymousResponse.status === 403;
} catch {
  anonymousDataDenied = false;
}
console.log(`anonymous data access: ${anonymousDataDenied ? "DENIED" : "REVIEW"}`);

if (checks.some((check) => !check.ok) || foundTables.length !== requiredTables.length || !approvalRpcReady || !anonymousDataDenied) process.exitCode = 1;
