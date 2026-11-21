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
const secret = env.SUPABASE_SECRET_KEY;
if (!url || !secret) throw new Error("Konfigurasi server Supabase belum lengkap.");

const headers = {
  apikey: secret,
  Authorization: `Bearer ${secret}`,
  "Content-Type": "application/json"
};

const list = await fetch(`${url}/storage/v1/bucket`, { headers });
if (!list.ok) throw new Error(`Pemeriksaan bucket gagal (${list.status}).`);
const buckets = await list.json();

if (buckets.some((bucket) => bucket.id === "survey-evidence")) {
  console.log("storage bucket: READY");
  process.exit(0);
}

const create = await fetch(`${url}/storage/v1/bucket`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    id: "survey-evidence",
    name: "survey-evidence",
    public: false,
    file_size_limit: 10485760,
    allowed_mime_types: ["image/jpeg", "image/png", "image/webp"]
  })
});

if (!create.ok) {
  const payload = await create.text();
  throw new Error(`Pembuatan bucket gagal (${create.status}): ${payload}`);
}
console.log("storage bucket: CREATED");
