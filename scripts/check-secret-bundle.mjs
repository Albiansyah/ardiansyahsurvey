import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const envText = await readFile(new URL("../.env.local", import.meta.url), "utf8");
const secretLine = envText.split(/\r?\n/).find((line) => line.startsWith("SUPABASE_SECRET_KEY="));
const secret = secretLine?.slice("SUPABASE_SECRET_KEY=".length);
if (!secret) throw new Error("Secret Supabase tidak ditemukan.");

const root = new URL("../dist/", import.meta.url);
const files = [];
const walk = async (directoryUrl) => {
  for (const entry of await readdir(directoryUrl, { withFileTypes: true })) {
    const child = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directoryUrl);
    if (entry.isDirectory()) await walk(child);
    else files.push(child);
  }
};
await walk(root);

let leaked = false;
for (const file of files) {
  const buffer = await readFile(file);
  if (buffer.includes(Buffer.from(secret))) {
    leaked = true;
    console.error(`secret bundle check: FAIL (${join("dist", file.pathname.split("/dist/")[1])})`);
  }
}

if (leaked) process.exitCode = 1;
else console.log("secret bundle check: PASS");
