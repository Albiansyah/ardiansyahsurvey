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

const fileEnv = parseEnv(await readFile(new URL("../.env.local", import.meta.url), "utf8"));
const env = { ...fileEnv, ...process.env };
const url = env.VITE_SUPABASE_URL;
const secret = env.SUPABASE_SECRET_KEY;
const fullName = String(env.INITIAL_MASTER_FULL_NAME || "").trim();
const email = String(env.INITIAL_MASTER_EMAIL || "").trim().toLowerCase();
const password = String(env.INITIAL_MASTER_PASSWORD || "");

if (!url || !secret) throw new Error("Konfigurasi server Supabase belum lengkap.");
if (fullName.length < 2) throw new Error("INITIAL_MASTER_FULL_NAME belum diisi.");
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("INITIAL_MASTER_EMAIL belum valid.");
if (password.length < 8 || password.length > 72) throw new Error("INITIAL_MASTER_PASSWORD harus terdiri dari 8 sampai 72 karakter.");

const headers = {
  apikey: secret,
  Authorization: `Bearer ${secret}`,
  "Content-Type": "application/json"
};

const listResponse = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=1000`, { headers });
if (!listResponse.ok) throw new Error(`Daftar Auth gagal dibaca (${listResponse.status}).`);
const listed = await listResponse.json();
let user = listed.users?.find((item) => item.email?.toLowerCase() === email);

if (!user) {
  const createResponse = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: fullName } })
  });
  const payload = await createResponse.json();
  if (!createResponse.ok) throw new Error(payload.message || `Akun master gagal dibuat (${createResponse.status}).`);
  user = payload;
} else {
  const updateResponse = await fetch(`${url}/auth/v1/admin/users/${user.id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ password, email_confirm: true, user_metadata: { full_name: fullName } })
  });
  if (!updateResponse.ok) throw new Error(`Akun master gagal diperbarui (${updateResponse.status}).`);
}

const profileResponse = await fetch(`${url}/rest/v1/profiles?on_conflict=id`, {
  method: "POST",
  headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
  body: JSON.stringify({ id: user.id, full_name: fullName, email, role: "master", active: true })
});
if (!profileResponse.ok) {
  const payload = await profileResponse.text();
  if (profileResponse.status === 403 && payload.includes("42501")) {
    throw new Error("Role service_role belum memiliki akses tabel. Jalankan migration 202611210002_service_role_grants.sql, lalu ulangi perintah ini.");
  }
  throw new Error(`Profil master gagal disimpan (${profileResponse.status}): ${payload}`);
}

console.log("initial master: READY");
