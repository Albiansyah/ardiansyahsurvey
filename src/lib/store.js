import { create } from "zustand";
import {
  createEvidenceUrl,
  invokeFunction,
  restRequest,
  rpc,
  supabaseAuth,
  uploadEvidence,
  withEvidenceUrls
} from "./supabase.js";

const mapProfile = (row) => ({
  id: row.id,
  nama: row.full_name,
  email: row.email,
  role: row.role === "master" ? "master" : "user",
  backendRole: row.role,
  active: row.active
});

const mapOutlet = (row) => ({
  id: row.id,
  outletName: row.outlet_name,
  picName: row.pic_name,
  storeName: row.store_name,
  address: row.address,
  phone: row.phone,
  email: row.email,
  latitude: row.latitude ?? "",
  longitude: row.longitude ?? "",
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  isDemo: false
});

const mapReport = (row) => ({
  id: row.id,
  userId: row.surveyor_id,
  userName: row.surveyor_name,
  outletId: row.outlet_id,
  outlet: row.outlet ? mapOutlet(row.outlet) : null,
  answers: row.answers || [],
  evidencePath: row.evidence_path,
  evidence: {
    path: row.evidence_path,
    dataUrl: row.evidence_url || null,
    metadata: row.evidence_metadata || {}
  },
  presence: row.presence || {
    surveyorName: row.surveyor_name,
    teamMembers: row.team_members
  },
  recordedAt: row.recorded_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapTarget = (row, profileMap) => ({
  id: row.id,
  userId: row.surveyor_id,
  userName: profileMap.get(row.surveyor_id)?.nama || "Surveyor",
  target: row.target_count,
  periodStart: row.period_start,
  updatedAt: row.updated_at
});

const mapRequest = (row) => ({
  id: row.id,
  type: row.request_type,
  reportId: row.report_id,
  proposedData: row.proposed_data,
  reason: row.reason,
  reportLabel: row.report_label,
  requesterId: row.requester_id,
  requesterName: row.requester_name,
  status: row.status,
  masterNote: row.master_note,
  resolvedAt: row.resolved_at,
  resolvedBy: row.resolved_by_name,
  createdAt: row.created_at
});

const mapLog = (row) => ({
  id: String(row.id),
  actorId: row.actor_id,
  actorName: row.actor_name,
  actorRole: row.actor_role === "surveyor" ? "user" : row.actor_role,
  action: row.action,
  entityType: row.entity_type,
  entityId: row.entity_id,
  description: row.description,
  requestId: row.request_id,
  details: row.details,
  createdAt: row.created_at
});

const mapQuestion = (row) => ({
  id: row.id,
  text: row.question_text,
  type: row.question_type,
  options: row.options || [],
  orderIndex: row.order_index,
  isActive: row.is_active
});

const outletPayload = (outlet) => ({
  outlet_name: outlet.outletName.trim(),
  pic_name: outlet.picName.trim(),
  store_name: outlet.storeName.trim(),
  address: outlet.address.trim(),
  phone: outlet.phone.trim(),
  email: outlet.email.trim(),
  latitude: outlet.latitude === "" ? null : Number(outlet.latitude),
  longitude: outlet.longitude === "" ? null : Number(outlet.longitude),
  status: outlet.status
});

const periodStartJakarta = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit"
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year").value;
  const month = parts.find((part) => part.type === "month").value;
  return `${year}-${month}-01`;
};

export const useStore = create((set, get) => ({
  user: null,
  surveyors: [],
  reports: [],
  outlets: [],
  targets: [],
  changeRequests: [],
  auditLogs: [],
  questions: [], // State untuk pertanyaan dinamis
  hydrated: false,
  loadingData: false,
  storageError: null,

  initialize: async () => {
    try {
      const session = await supabaseAuth.getSession();
      if (!session?.user?.id) {
        set({ hydrated: true, user: null, storageError: null });
        return;
      }
      const rows = await restRequest("profiles", { query: `id=eq.${session.user.id}&select=*` });
      if (!rows?.[0]?.active) throw new Error("Profil tidak aktif atau belum tersedia.");
      set({ user: mapProfile(rows[0]), hydrated: true, storageError: null });
      await get().loadData();
    } catch (error) {
      set({ hydrated: true, user: null, storageError: error.message });
    }
  },

  login: async (identifier, password) => {
    set({ storageError: null });
    const session = await supabaseAuth.signIn(identifier.trim(), password);
    const rows = await restRequest("profiles", { query: `id=eq.${session.user.id}&select=*` });
    if (!rows?.[0]) {
      await supabaseAuth.signOut();
      throw new Error("Profil pengguna belum tersedia.");
    }
    if (!rows[0].active) {
      await supabaseAuth.signOut();
      throw new Error("Akun ini tidak aktif.");
    }
    const user = mapProfile(rows[0]);
    set({ user, hydrated: true, storageError: null });
    await get().loadData();
    return user;
  },

  logout: async () => {
    await supabaseAuth.signOut();
    set({ 
      user: null, 
      surveyors: [], 
      reports: [], 
      outlets: [], 
      targets: [], 
      changeRequests: [], 
      auditLogs: [], 
      questions: [], 
      storageError: null 
    });
  },

  loadData: async () => {
    const user = get().user;
    if (!user) return;
    set({ loadingData: true, storageError: null });
    try {
      const [profileRows, outletRows, reportRows, targetRows, requestRows, logRows, questionRows] = await Promise.all([
        restRequest("profiles", { query: "select=*&order=full_name.asc" }),
        restRequest("outlets", { query: "select=*&order=outlet_name.asc" }),
        restRequest("survey_reports", { query: "select=*,outlet:outlets(*)&order=created_at.desc" }),
        restRequest("survey_targets", { query: "select=*&order=period_start.desc" }),
        restRequest("change_requests", { query: "select=*&order=created_at.desc" }),
        restRequest("audit_logs", { query: "select=*&order=created_at.desc&limit=500" }),
        restRequest("survey_questions", { query: "select=*&is_active=eq.true&order=order_index.asc" })
      ]);
      
      const profiles = profileRows.map(mapProfile);
      const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
      
      const activeReportRows = reportRows.filter((row) => !row.deleted_at);
      const reportsWithUrls = await withEvidenceUrls(activeReportRows);
      
      set({
        surveyors: profiles.filter((profile) => profile.backendRole === "surveyor"),
        outlets: outletRows.map(mapOutlet),
        reports: reportsWithUrls.map(mapReport),
        targets: targetRows.map((row) => mapTarget(row, profileMap)),
        changeRequests: requestRows.map(mapRequest),
        auditLogs: logRows.map(mapLog),
        questions: questionRows.map(mapQuestion), // Simpan pertanyaan ke state
        loadingData: false,
        storageError: null
      });
    } catch (error) {
      set({ loadingData: false, storageError: error.message });
      throw error;
    }
  },

  addReport: async (report) => {
    const user = get().user;
    const id = crypto.randomUUID();
    const evidencePath = await uploadEvidence(user.id, report.evidence);
    await restRequest("survey_reports", {
      method: "POST",
      body: {
        id,
        surveyor_id: user.id,
        surveyor_name: user.nama,
        outlet_id: report.outletId,
        recorded_at: report.recordedAt || new Date().toISOString(),
        answers: report.answers,
        evidence_path: evidencePath,
        evidence_metadata: report.evidence?.metadata || {},
        team_members: report.presence.teamMembers,
        attendance_confirmed: true,
        presence: report.presence
      }
    });
    await get().loadData();
    return id;
  },

  updateReport: async (id, data) => {
    const user = get().user;
    const existing = get().reports.find((report) => report.id === id);
    const evidencePath = data.evidence?.dataUrl?.startsWith("data:")
      ? await uploadEvidence(existing?.userId || user.id, data.evidence)
      : data.evidence?.path || existing?.evidencePath;
      
    await restRequest("survey_reports", {
      method: "PATCH",
      query: `id=eq.${id}`,
      body: {
        outlet_id: data.outletId,
        answers: data.answers,
        evidence_path: evidencePath,
        evidence_metadata: data.evidence?.metadata || {},
        team_members: data.presence.teamMembers,
        attendance_confirmed: true,
        presence: data.presence
      }
    });
    await get().loadData();
  },

  deleteReport: async (id) => {
    await restRequest("survey_reports", { method: "DELETE", query: `id=eq.${id}`, prefer: "return=minimal" });
    await get().loadData();
  },

  addOutlet: async (outlet) => {
    const rows = await restRequest("outlets", { method: "POST", body: outletPayload(outlet) });
    await get().loadData();
    return rows?.[0] ? mapOutlet(rows[0]) : null;
  },

  updateOutlet: async (id, data) => {
    await restRequest("outlets", { method: "PATCH", query: `id=eq.${id}`, body: outletPayload(data) });
    await get().loadData();
  },

  deleteOutlet: async (id) => {
    await restRequest("outlets", { method: "DELETE", query: `id=eq.${id}`, prefer: "return=minimal" });
    await get().loadData();
  },

  bulkAddOutlets: async (items) => {
    await restRequest("outlets", { method: "POST", body: items.map(outletPayload) });
    await get().loadData();
  },

  setTarget: async (userId, userName, target) => {
    const body = {
      surveyor_id: userId,
      period_start: periodStartJakarta(),
      target_count: Number(target)
    };
    await restRequest("survey_targets", {
      method: "POST",
      query: "on_conflict=surveyor_id,period_start",
      body,
      prefer: "resolution=merge-duplicates,return=representation"
    });
    await get().loadData();
  },

  createSurveyorAccount: async ({ fullName, email, password }) => {
    const result = await invokeFunction("admin-create-surveyor", {
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      password
    });
    await get().loadData();
    return result.user;
  },

  submitChangeRequest: async ({ type, reportId, proposedData, reason }) => {
    const user = get().user;
    const report = get().reports.find((item) => item.id === reportId);
    let proposed = null;
    if (type === "edit") {
      const evidencePath = proposedData.evidence?.dataUrl?.startsWith("data:")
        ? await uploadEvidence(user.id, proposedData.evidence)
        : proposedData.evidence?.path || report?.evidencePath;
      proposed = {
        outlet_id: proposedData.outletId,
        answers: proposedData.answers,
        evidence_path: evidencePath,
        evidence_metadata: proposedData.evidence?.metadata || {},
        team_members: proposedData.presence.teamMembers,
        attendance_confirmed: true,
        presence: proposedData.presence
      };
    }
    await restRequest("change_requests", {
      method: "POST",
      body: {
        request_type: type,
        report_id: reportId,
        report_label: report?.outlet?.outletName || reportId,
        requester_id: user.id,
        requester_name: user.nama,
        proposed_data: proposed,
        reason,
        status: "pending"
      }
    });
    await get().loadData();
  },

  resolveChangeRequest: async (requestId, decision, note = "") => {
    await rpc("resolve_change_request", { p_request_id: requestId, p_decision: decision, p_note: note });
    await get().loadData();
    return true;
  },

  refreshEvidenceUrl: async (reportId) => {
    const report = get().reports.find((item) => item.id === reportId);
    if (!report?.evidencePath) return null;
    const dataUrl = await createEvidenceUrl(report.evidencePath);
    set((state) => ({ 
      reports: state.reports.map((item) => item.id === reportId ? { ...item, evidence: { ...item.evidence, dataUrl } } : item) 
    }));
    return dataUrl;
  },

  // ==========================================
  // FUNGSI CRUD PERTANYAAN SURVEI DINAMIS
  // ==========================================
  fetchQuestions: async () => {
    const rows = await restRequest("survey_questions", { query: "select=*&order=order_index.asc" });
    set({ questions: rows.map(mapQuestion) });
  },

  addQuestion: async (payload) => {
    await restRequest("survey_questions", { 
      method: "POST", 
      body: { 
        question_text: payload.text, 
        question_type: payload.type, 
        options: payload.options, 
        order_index: payload.orderIndex 
      } 
    });
    await get().fetchQuestions();
  },

  updateQuestion: async (id, payload) => {
    await restRequest("survey_questions", { 
      method: "PATCH", 
      query: `id=eq.${id}`, 
      body: { 
        question_text: payload.text, 
        question_type: payload.type, 
        options: payload.options 
      } 
    });
    await get().fetchQuestions();
  },

  deleteQuestion: async (id) => {
    await restRequest("survey_questions", { 
      method: "DELETE", 
      query: `id=eq.${id}`, 
      prefer: "return=minimal" 
    });
    await get().fetchQuestions();
  }
}));