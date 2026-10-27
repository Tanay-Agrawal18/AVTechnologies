/**
 * IndexedDB offline storage helper for Vyorai IWMS PWA.
 * Enables offline viewing of cached tasks and offline drafting of submissions.
 */

const DB_NAME = "vyorai_offline_db";
const DB_VERSION = 1;

export interface OfflineTaskDraft {
  taskId: string;
  workDescription: string;
  externalLinks: string[];
  savedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return reject(new Error("IndexedDB not supported"));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Store for caching full task lists & details
      if (!db.objectStoreNames.contains("tasks")) {
        db.createObjectStore("tasks", { keyPath: "_id" });
      }

      // Store for caching draft submissions created offline
      if (!db.objectStoreNames.contains("draft_submissions")) {
        db.createObjectStore("draft_submissions", { keyPath: "taskId" });
      }

      // Store for key-value offline metadata
      if (!db.objectStoreNames.contains("metadata")) {
        db.createObjectStore("metadata", { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save tasks list to IndexedDB for offline reading
 */
export async function saveTasksOffline(tasks: Array<{ _id: string; [key: string]: unknown }>): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction("tasks", "readwrite");
    const store = tx.objectStore("tasks");
    for (const task of tasks) {
      store.put(task);
    }
  } catch (err) {
    console.warn("[OfflineDB] Failed to save tasks to IndexedDB:", err);
  }
}

/**
 * Get all cached tasks from IndexedDB when offline
 */
export async function getTasksOffline(): Promise<Array<{ _id: string; [key: string]: unknown }>> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("tasks", "readonly");
      const store = tx.objectStore("tasks");
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("[OfflineDB] Failed to read tasks from IndexedDB:", err);
    return [];
  }
}

/**
 * Save single task detail to IndexedDB
 */
export async function saveTaskDetailOffline(task: { _id: string; [key: string]: unknown }): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction("tasks", "readwrite");
    const store = tx.objectStore("tasks");
    store.put(task);
  } catch (err) {
    console.warn("[OfflineDB] Failed to save task detail:", err);
  }
}

/**
 * Get single task from IndexedDB
 */
export async function getTaskDetailOffline(taskId: string): Promise<{ _id: string; [key: string]: unknown } | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("tasks", "readonly");
      const store = tx.objectStore("tasks");
      const request = store.get(taskId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

/**
 * Save offline draft submission
 */
export async function saveOfflineDraftSubmission(draft: OfflineTaskDraft): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction("draft_submissions", "readwrite");
    const store = tx.objectStore("draft_submissions");
    store.put(draft);
  } catch (err) {
    console.warn("[OfflineDB] Failed to save draft submission:", err);
  }
}

/**
 * Get offline draft submission for a task
 */
export async function getOfflineDraftSubmission(taskId: string): Promise<OfflineTaskDraft | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("draft_submissions", "readonly");
      const store = tx.objectStore("draft_submissions");
      const request = store.get(taskId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

/**
 * Delete draft once submitted successfully
 */
export async function clearOfflineDraftSubmission(taskId: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction("draft_submissions", "readwrite");
    const store = tx.objectStore("draft_submissions");
    store.delete(taskId);
  } catch {
    // Non-blocking
  }
}
