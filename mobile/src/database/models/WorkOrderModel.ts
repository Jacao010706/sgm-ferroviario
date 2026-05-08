import { Model } from "@nozbe/watermelondb";
import { field, date, readonly } from "@nozbe/watermelondb/decorators";

export default class WorkOrderModel extends Model {
  static table = "work_orders";

  @field("server_id") serverId!: string;
  @field("number") number!: string;
  @field("title") title!: string;
  @field("description") description!: string;
  @field("asset_id") assetId!: string;
  @field("asset_tag") assetTag!: string;
  @field("asset_name") assetName!: string;
  @field("maintenance_type") maintenanceType!: string;
  @field("status") status!: string;
  @field("priority") priority!: string;
  @date("scheduled_start") scheduledStart!: Date | null;
  @date("scheduled_end") scheduledEnd!: Date | null;
  @date("actual_start") actualStart!: Date | null;
  @date("actual_end") actualEnd!: Date | null;
  @field("actual_duration_h") actualDurationH!: number | null;
  @field("observations") observations!: string;
  @field("root_cause") rootCause!: string;
  @field("corrective_action") correctiveAction!: string;
  @field("checklist_progress") checklistProgressRaw!: string;
  @field("parts_used") partsUsedRaw!: string;
  @field("photos") photosRaw!: string;
  @field("is_synced") isSynced!: boolean;
  @readonly @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  get checklistProgress(): Record<string, boolean> {
    try { return JSON.parse(this.checklistProgressRaw || "{}"); } catch { return {}; }
  }

  get partsUsed(): Array<{ code: string; qty: number }> {
    try { return JSON.parse(this.partsUsedRaw || "[]"); } catch { return []; }
  }

  get photos(): string[] {
    try { return JSON.parse(this.photosRaw || "[]"); } catch { return []; }
  }
}
