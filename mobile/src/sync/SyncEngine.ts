/**
 * Motor de sincronização offline-first.
 * Estratégia:
 *  1. Ao abrir o app com conexão: baixa todas as OS atribuídas ao técnico
 *  2. Offline: todas as atualizações vão para sync_queue (SQLite)
 *  3. Ao reconectar: drena a fila em ordem FIFO com retry
 */
import NetInfo from "@react-native-community/netinfo";
import { database } from "../database";
import { Q } from "@nozbe/watermelondb";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = "http://localhost:8000/api/v1"; // configurar via env

class SyncEngine {
  private isSyncing = false;
  private unsubscribeNetInfo: (() => void) | null = null;

  async initialize() {
    this.unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        this.sync();
      }
    });
  }

  destroy() {
    this.unsubscribeNetInfo?.();
  }

  private async getAuthHeader(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async downloadMyWorkOrders(): Promise<number> {
    const headers = await this.getAuthHeader();
    try {
      const resp = await axios.get(`${API_BASE}/work-orders/my-orders`, { headers, timeout: 15000 });
      const serverOrders: any[] = resp.data;

      await database.write(async () => {
        const woCollection = database.get<any>("work_orders");
        for (const so of serverOrders) {
          const existing = await woCollection
            .query(Q.where("server_id", so.id))
            .fetch();
          if (existing.length > 0) {
            await existing[0].update((rec: any) => {
              rec.status = so.status;
              rec.assignedToId = so.assigned_to_id;
              rec.isSynced = true;
            });
          } else {
            await woCollection.create((rec: any) => {
              rec.serverId = so.id;
              rec.number = so.number;
              rec.title = so.title;
              rec.description = so.description || "";
              rec.assetId = so.asset_id;
              rec.assetTag = so.asset?.tag || "";
              rec.assetName = so.asset?.name || "";
              rec.maintenanceType = so.maintenance_type;
              rec.status = so.status;
              rec.priority = so.priority;
              rec.scheduledStart = so.scheduled_start ? new Date(so.scheduled_start) : null;
              rec.scheduledEnd = so.scheduled_end ? new Date(so.scheduled_end) : null;
              rec.checklistProgressRaw = JSON.stringify(so.checklist_progress || {});
              rec.isSynced = true;
            });
          }
        }
      });

      await this.downloadAssets(headers);
      return serverOrders.length;
    } catch (err) {
      console.warn("Download falhou — modo offline", err);
      return 0;
    }
  }

  private async downloadAssets(headers: Record<string, string>) {
    try {
      const resp = await axios.get(`${API_BASE}/assets`, { headers, params: { limit: 500 }, timeout: 15000 });
      await database.write(async () => {
        const col = database.get<any>("assets");
        for (const a of resp.data) {
          const existing = await col.query(Q.where("server_id", a.id)).fetch();
          if (existing.length === 0) {
            await col.create((rec: any) => {
              rec.serverId = a.id;
              rec.tag = a.tag;
              rec.name = a.name;
              rec.assetType = a.asset_type;
              rec.status = a.status;
              rec.manufacturer = a.manufacturer || "";
              rec.model = a.model || "";
              rec.qrCode = a.qr_code || "";
            });
          }
        }
      });
    } catch (_) {}
  }

  async enqueue(action: string, entityType: string, entityId: string, payload: object) {
    await database.write(async () => {
      const col = database.get<any>("sync_queue");
      await col.create((rec: any) => {
        rec.entityType = entityType;
        rec.entityId = entityId;
        rec.action = action;
        rec.payload = JSON.stringify(payload);
        rec.attempts = 0;
      });
    });
  }

  async sync(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;
    try {
      const headers = await this.getAuthHeader();
      const col = database.get<any>("sync_queue");
      const pending = await col.query(Q.sortBy("created_at", Q.asc)).fetch();

      for (const item of pending) {
        try {
          const payload = JSON.parse(item.payload);
          await this.processQueueItem(item.action, item.entityType, item.entityId, payload, headers);
          await database.write(async () => { await item.destroyPermanently(); });
        } catch (err: any) {
          await database.write(async () => {
            await item.update((rec: any) => {
              rec.attempts += 1;
              rec.lastAttemptAt = new Date();
              rec.error = err.message || "unknown";
            });
          });
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  private async processQueueItem(
    action: string, entityType: string, entityId: string, payload: any, headers: Record<string, string>
  ) {
    if (entityType === "work_order") {
      const woCollection = database.get<any>("work_orders");
      const [local] = await woCollection.query(Q.where("server_id", entityId)).fetch();
      const serverId = local?.serverId || entityId;

      if (action === "update" || action === "complete") {
        await axios.patch(`${API_BASE}/work-orders/${serverId}`, payload, { headers });
        if (local) {
          await database.write(async () => {
            await local.update((rec: any) => { rec.isSynced = true; });
          });
        }
      }

      if (action === "upload_photo" && payload.photo_base64) {
        const formData = new FormData();
        formData.append("file", {
          uri: payload.local_path,
          type: "image/jpeg",
          name: `photo_${Date.now()}.jpg`,
        } as any);
        await axios.post(`${API_BASE}/work-orders/${serverId}/photos`, formData, {
          headers: { ...headers, "Content-Type": "multipart/form-data" },
        });
      }
    }
  }
}

export const syncEngine = new SyncEngine();
