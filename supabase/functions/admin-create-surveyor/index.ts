const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY") ?? "";
const allowedOrigin = Deno.env.get("APP_ORIGIN") ?? "*";

const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

const respond = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), { status, headers: corsHeaders });

const parseJson = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { message: text }; }
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond(405, { message: "Metode tidak didukung." });
  if (!supabaseUrl || !serviceKey) return respond(500, { message: "Konfigurasi server belum lengkap." });

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return respond(401, { message: "Sesi pengguna tidak tersedia." });

  try {
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: serviceKey, Authorization: authorization }
    });
    const caller = await parseJson(userResponse);
    if (!userResponse.ok || !caller?.id) return respond(401, { message: "Sesi pengguna tidak valid." });

    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(caller.id)}&role=eq.master&active=eq.true&select=id,full_name,role`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    const profiles = await parseJson(profileResponse);
    const master = Array.isArray(profiles) ? profiles[0] : null;
    if (!profileResponse.ok || !master) return respond(403, { message: "Hanya master yang dapat membuat akun surveyor." });

    const input = await request.json();
    const fullName = String(input?.fullName ?? "").trim();
    const email = String(input?.email ?? "").trim().toLowerCase();
    const password = String(input?.password ?? "");

    if (fullName.length < 2 || fullName.length > 100) return respond(400, { message: "Nama surveyor tidak valid." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return respond(400, { message: "Email surveyor tidak valid." });
    if (password.length < 8 || password.length > 72) return respond(400, { message: "Password harus terdiri dari 8 sampai 72 karakter." });

    const createResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      })
    });
    const created = await parseJson(createResponse);
    if (!createResponse.ok || !created?.id) {
      const duplicate = createResponse.status === 422 || String(created?.message ?? "").toLowerCase().includes("already");
      return respond(duplicate ? 409 : 400, { message: duplicate ? "Email sudah digunakan oleh akun lain." : created?.message || "Akun surveyor gagal dibuat." });
    }

    const profileUpsert = await fetch(`${supabaseUrl}/rest/v1/profiles?on_conflict=id`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify({ id: created.id, full_name: fullName, email, role: "surveyor", active: true })
    });

    if (!profileUpsert.ok) {
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${created.id}`, {
        method: "DELETE",
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
      });
      return respond(500, { message: "Profil surveyor gagal dibuat. Akun Auth dibatalkan." });
    }

    await fetch(`${supabaseUrl}/rest/v1/audit_logs`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        actor_id: caller.id,
        actor_name: master.full_name,
        actor_role: "master",
        action: "create",
        entity_type: "profile",
        entity_id: created.id,
        description: "Membuat akun surveyor",
        details: { email, full_name: fullName, role: "surveyor" }
      })
    });

    return respond(201, {
      user: { id: created.id, fullName, email, role: "surveyor", active: true }
    });
  } catch (error) {
    return respond(500, { message: error instanceof Error ? error.message : "Terjadi kesalahan pada server." });
  }
});
