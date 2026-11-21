const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const sessionKey = "ardi-supabase-session";

export const isSupabaseConfigured = Boolean(supabaseUrl && publishableKey);

const assertConfigured = () => {
  if (!isSupabaseConfigured) throw new Error("Konfigurasi layanan data belum tersedia.");
};

const readSession = () => {
  try {
    const value = localStorage.getItem(sessionKey);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const saveSession = (payload) => {
  const session = {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at: payload.expires_at || Math.floor(Date.now() / 1000) + Number(payload.expires_in || 3600),
    user: payload.user
  };
  localStorage.setItem(sessionKey, JSON.stringify(session));
  return session;
};

const clearSession = () => localStorage.removeItem(sessionKey);

const parseResponse = async (response) => {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
};

const errorFrom = (payload, fallback) => {
  const message = payload?.msg || payload?.message || payload?.error_description || payload?.error || fallback;
  const error = new Error(message);
  error.details = payload;
  return error;
};

const authRequest = async (path, options = {}) => {
  assertConfigured();
  const response = await fetch(`${supabaseUrl}/auth/v1${path}`, {
    ...options,
    headers: {
      apikey: publishableKey,
      "Content-Type": "application/json",
      ...options.headers
    }
  });
  const payload = await parseResponse(response);
  if (!response.ok) throw errorFrom(payload, "Autentikasi gagal.");
  return payload;
};

const refreshSession = async (refreshToken) => {
  const payload = await authRequest("/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  return saveSession(payload);
};

export const getValidSession = async () => {
  const session = readSession();
  if (!session) return null;
  if (session.expires_at > Math.floor(Date.now() / 1000) + 60) return session;
  try { return await refreshSession(session.refresh_token); }
  catch { clearSession(); return null; }
};

const authorizedFetch = async (url, options = {}, retry = true) => {
  const session = await getValidSession();
  if (!session) throw new Error("Sesi berakhir. Silakan masuk kembali.");
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers
    }
  });
  if (response.status === 401 && retry && session.refresh_token) {
    await refreshSession(session.refresh_token);
    return authorizedFetch(url, options, false);
  }
  return response;
};

export const supabaseAuth = {
  async signIn(email, password) {
    const payload = await authRequest("/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    return saveSession(payload);
  },
  async signOut() {
    const session = readSession();
    if (session?.access_token) {
      try {
        await authRequest("/logout", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } });
      } catch {
        // Local sign-out tetap dilakukan jika jaringan sedang tidak tersedia.
      }
    }
    clearSession();
  },
  getSession: getValidSession
};

export const restRequest = async (table, { method = "GET", query = "", body, prefer = "return=representation" } = {}) => {
  assertConfigured();
  const response = await authorizedFetch(`${supabaseUrl}/rest/v1/${table}${query ? `?${query}` : ""}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Prefer: prefer
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await parseResponse(response);
  if (!response.ok) throw errorFrom(payload, `Operasi ${table} gagal.`);
  return payload;
};

export const rpc = async (name, params = {}) => restRequest(`rpc/${name}`, { method: "POST", body: params });

export const invokeFunction = async (name, body = {}) => {
  assertConfigured();
  try {
    const response = await authorizedFetch(`${supabaseUrl}/functions/v1/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await parseResponse(response);
    if (response.status === 404) throw new Error("Layanan pembuatan akun belum diaktifkan.");
    if (!response.ok) throw errorFrom(payload, "Permintaan tidak dapat diproses.");
    return payload;
  } catch (error) {
    const isNetworkError = error instanceof TypeError || /failed to fetch|networkerror|network request failed/i.test(error?.message || "");
    if (!isNetworkError) throw error;
    throw new Error("Layanan pembuatan akun belum dapat dihubungi. Pastikan layanan admin sudah diaktifkan.");
  }
};

const dataUrlToBlob = async (dataUrl) => {
  const response = await fetch(dataUrl);
  return response.blob();
};

export const uploadEvidence = async (userId, evidence) => {
  if (!evidence?.dataUrl?.startsWith("data:")) return evidence?.path || null;
  const blob = await dataUrlToBlob(evidence.dataUrl);
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const response = await authorizedFetch(`${supabaseUrl}/storage/v1/object/survey-evidence/${path}`, {
    method: "POST",
    headers: { "Content-Type": "image/jpeg", "x-upsert": "false" },
    body: blob
  });
  const payload = await parseResponse(response);
  if (!response.ok) throw errorFrom(payload, "Foto bukti gagal diunggah.");
  return path;
};

export const createEvidenceUrl = async (path, expiresIn = 3600) => {
  if (!path) return null;
  const response = await authorizedFetch(`${supabaseUrl}/storage/v1/object/sign/survey-evidence/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn })
  });
  const payload = await parseResponse(response);
  if (!response.ok) return null;
  const signed = payload?.signedURL || payload?.signedUrl;
  return signed ? `${supabaseUrl}/storage/v1${signed}` : null;
};

export const withEvidenceUrls = async (reports) => Promise.all(reports.map(async (report) => ({
  ...report,
  evidence_url: await createEvidenceUrl(report.evidence_path)
})));

export const supabaseProject = { url: supabaseUrl };
