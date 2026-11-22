import { openDB } from "idb";

const DATABASE_NAME = "ardi-survey-offline";
const DATABASE_VERSION = 1;
const DRAFT_STORE = "drafts";
const QUEUE_STORE = "report-queue";

const database = () => openDB(DATABASE_NAME, DATABASE_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(DRAFT_STORE)) db.createObjectStore(DRAFT_STORE);
    if (!db.objectStoreNames.contains(QUEUE_STORE)) {
      const store = db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
      store.createIndex("userId", "userId");
    }
  }
});

const notifyQueueChanged = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ardi:queue-changed"));
};

export async function saveDraft(key, value) {
  const db = await database();
  await db.put(DRAFT_STORE, { ...value, savedAt: new Date().toISOString() }, key);
}

export async function readDraft(key) {
  const db = await database();
  return db.get(DRAFT_STORE, key);
}

export async function removeDraft(key) {
  const db = await database();
  await db.delete(DRAFT_STORE, key);
}

export async function enqueueReport(userId, payload) {
  const db = await database();
  const item = { id: crypto.randomUUID(), userId, payload, queuedAt: new Date().toISOString(), attempts: 0 };
  await db.put(QUEUE_STORE, item);
  notifyQueueChanged();
  return item.id;
}

export async function getQueuedReports(userId) {
  const db = await database();
  const items = await db.getAllFromIndex(QUEUE_STORE, "userId", userId);
  return items.sort((a, b) => new Date(a.queuedAt) - new Date(b.queuedAt));
}

export async function getQueueCount(userId) {
  if (!userId) return 0;
  const db = await database();
  return db.countFromIndex(QUEUE_STORE, "userId", userId);
}

export async function removeQueuedReport(id) {
  const db = await database();
  await db.delete(QUEUE_STORE, id);
  notifyQueueChanged();
}

export async function markQueueAttempt(item, message) {
  const db = await database();
  await db.put(QUEUE_STORE, {
    ...item,
    attempts: Number(item.attempts || 0) + 1,
    lastAttemptAt: new Date().toISOString(),
    lastError: message
  });
  notifyQueueChanged();
}
