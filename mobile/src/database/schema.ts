import { appSchema, tableSchema } from "@nozbe/watermelondb";

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: "work_orders",
      columns: [
        { name: "server_id", type: "string", isOptional: true },
        { name: "number", type: "string" },
        { name: "title", type: "string" },
        { name: "description", type: "string", isOptional: true },
        { name: "asset_id", type: "string" },
        { name: "asset_tag", type: "string" },
        { name: "asset_name", type: "string" },
        { name: "maintenance_type", type: "string" },
        { name: "status", type: "string" },
        { name: "priority", type: "string" },
        { name: "scheduled_start", type: "number", isOptional: true },
        { name: "scheduled_end", type: "number", isOptional: true },
        { name: "actual_start", type: "number", isOptional: true },
        { name: "actual_end", type: "number", isOptional: true },
        { name: "actual_duration_h", type: "number", isOptional: true },
        { name: "observations", type: "string", isOptional: true },
        { name: "root_cause", type: "string", isOptional: true },
        { name: "corrective_action", type: "string", isOptional: true },
        { name: "checklist_progress", type: "string", isOptional: true }, // JSON
        { name: "parts_used", type: "string", isOptional: true },          // JSON
        { name: "photos", type: "string", isOptional: true },               // JSON array paths
        { name: "is_synced", type: "boolean" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "assets",
      columns: [
        { name: "server_id", type: "string" },
        { name: "tag", type: "string" },
        { name: "name", type: "string" },
        { name: "asset_type", type: "string" },
        { name: "status", type: "string" },
        { name: "location_name", type: "string", isOptional: true },
        { name: "manufacturer", type: "string", isOptional: true },
        { name: "model", type: "string", isOptional: true },
        { name: "qr_code", type: "string", isOptional: true },
        { name: "specifications", type: "string", isOptional: true }, // JSON
        { name: "updated_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "checklist_items",
      columns: [
        { name: "work_order_id", type: "string" },
        { name: "item_id", type: "string" },
        { name: "description", type: "string" },
        { name: "is_completed", type: "boolean" },
        { name: "notes", type: "string", isOptional: true },
        { name: "completed_at", type: "number", isOptional: true },
      ],
    }),
    tableSchema({
      name: "sync_queue",
      columns: [
        { name: "entity_type", type: "string" },
        { name: "entity_id", type: "string" },
        { name: "action", type: "string" },      // "create" | "update" | "complete"
        { name: "payload", type: "string" },     // JSON
        { name: "attempts", type: "number" },
        { name: "created_at", type: "number" },
        { name: "last_attempt_at", type: "number", isOptional: true },
        { name: "error", type: "string", isOptional: true },
      ],
    }),
  ],
});
