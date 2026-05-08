import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Image,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { database } from "../database";
import { syncEngine } from "../sync/SyncEngine";
import { launchCamera } from "react-native-image-picker";

type ChecklistItem = { id: string; description: string };

export default function WorkOrderDetailScreen() {
  const route = useRoute<any>();
  const { orderId } = route.params;
  const [order, setOrder] = useState<any>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [observations, setObservations] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadOrder(); }, []);

  const loadOrder = async () => {
    const wo = await database.get<any>("work_orders").find(orderId);
    setOrder(wo);
    setChecklist(wo.checklistProgress);
    setObservations(wo.observations || "");
    setPhotos(wo.photos || []);
  };

  const toggleChecklistItem = async (itemId: string) => {
    const updated = { ...checklist, [itemId]: !checklist[itemId] };
    setChecklist(updated);
    await database.write(async () => {
      await order.update((rec: any) => {
        rec.checklistProgressRaw = JSON.stringify(updated);
        rec.isSynced = false;
      });
    });
  };

  const startOrder = async () => {
    await database.write(async () => {
      await order.update((rec: any) => {
        rec.status = "in_progress";
        rec.actualStart = new Date();
        rec.isSynced = false;
      });
    });
    await syncEngine.enqueue("update", "work_order", order.serverId || order.id, {
      status: "in_progress",
      actual_start: new Date().toISOString(),
    });
    loadOrder();
  };

  const completeOrder = async () => {
    const unchecked = Object.values(checklist).filter((v) => !v).length;
    if (unchecked > 0) {
      Alert.alert("Atenção", `Ainda há ${unchecked} item(ns) do checklist não concluídos. Deseja finalizar mesmo assim?`, [
        { text: "Cancelar" },
        { text: "Finalizar", style: "destructive", onPress: () => doComplete() },
      ]);
      return;
    }
    doComplete();
  };

  const doComplete = async () => {
    setSaving(true);
    const now = new Date();
    const start = order.actualStart || now;
    const durationH = (now.getTime() - start.getTime()) / 3600000;

    await database.write(async () => {
      await order.update((rec: any) => {
        rec.status = "completed";
        rec.actualEnd = now;
        rec.actualDurationH = Math.round(durationH * 100) / 100;
        rec.observations = observations;
        rec.isSynced = false;
      });
    });

    await syncEngine.enqueue("complete", "work_order", order.serverId || order.id, {
      status: "completed",
      actual_end: now.toISOString(),
      actual_duration_h: durationH,
      observations,
      checklist_progress: checklist,
    });

    await syncEngine.sync();
    setSaving(false);
    Alert.alert("Sucesso", "Ordem de Serviço concluída e sincronizada!");
  };

  const takePhoto = async () => {
    const result = await launchCamera({ mediaType: "photo", quality: 0.7, saveToPhotos: false });
    if (result.assets?.[0]?.uri) {
      const uri = result.assets[0].uri;
      const updated = [...photos, uri];
      setPhotos(updated);
      await database.write(async () => {
        await order.update((rec: any) => {
          rec.photosRaw = JSON.stringify(updated);
          rec.isSynced = false;
        });
      });
      await syncEngine.enqueue("upload_photo", "work_order", order.serverId || order.id, {
        local_path: uri,
      });
    }
  };

  if (!order) return null;

  const checklistItems: ChecklistItem[] = Object.keys(checklist).map((id) => ({ id, description: id }));

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.number}>{order.number}</Text>
        <Text style={styles.title}>{order.title}</Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>Ativo: {order.assetTag} — {order.assetName}</Text>
          <Text style={styles.metaText}>Tipo: {order.maintenanceType}</Text>
        </View>
      </View>

      {/* Checklist */}
      {checklistItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Checklist</Text>
          {checklistItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.checkItem}
              onPress={() => toggleChecklistItem(item.id)}
            >
              <View style={[styles.checkbox, checklist[item.id] && styles.checkboxChecked]}>
                {checklist[item.id] && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={[styles.checkLabel, checklist[item.id] && styles.checkLabelDone]}>
                {item.description}
              </Text>
            </TouchableOpacity>
          ))}
          <Text style={styles.checklistProgress}>
            {Object.values(checklist).filter(Boolean).length}/{checklistItems.length} concluídos
          </Text>
        </View>
      )}

      {/* Observações */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Observações</Text>
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={4}
          value={observations}
          onChangeText={setObservations}
          placeholder="Descreva o que foi realizado, anomalias encontradas..."
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Fotos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fotos ({photos.length})</Text>
        <View style={styles.photosGrid}>
          {photos.map((uri, i) => (
            <Image key={i} source={{ uri }} style={styles.photo} />
          ))}
          <TouchableOpacity style={styles.addPhotoBtn} onPress={takePhoto}>
            <Text style={styles.addPhotoBtnText}>+ Foto</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Ações */}
      <View style={styles.actions}>
        {order.status === "assigned" || order.status === "pending" ? (
          <TouchableOpacity style={styles.btnStart} onPress={startOrder}>
            <Text style={styles.btnText}>▶ Iniciar OS</Text>
          </TouchableOpacity>
        ) : order.status === "in_progress" ? (
          <TouchableOpacity
            style={[styles.btnComplete, saving && styles.btnDisabled]}
            onPress={completeOrder}
            disabled={saving}
          >
            <Text style={styles.btnText}>{saving ? "Salvando..." : "✓ Concluir OS"}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.completedLabel}>OS {order.status.toUpperCase()}</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F5F9" },
  header: { backgroundColor: "#1E3A5F", padding: 20 },
  number: { color: "#93C5FD", fontSize: 13, fontWeight: "600", marginBottom: 4 },
  title: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 8 },
  meta: { gap: 2 },
  metaText: { color: "#CBD5E1", fontSize: 13 },
  section: { backgroundColor: "#fff", margin: 12, padding: 16, borderRadius: 12, elevation: 1 },
  sectionTitle: { fontWeight: "700", fontSize: 15, color: "#1E3A5F", marginBottom: 12 },
  checkItem: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  checkbox: {
    width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: "#D1D5DB",
    alignItems: "center", justifyContent: "center", marginRight: 10,
  },
  checkboxChecked: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  checkmark: { color: "#fff", fontWeight: "700", fontSize: 13 },
  checkLabel: { fontSize: 14, color: "#374151", flex: 1 },
  checkLabelDone: { textDecorationLine: "line-through", color: "#9CA3AF" },
  checklistProgress: { fontSize: 12, color: "#6B7280", marginTop: 8, textAlign: "right" },
  textArea: {
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8,
    padding: 10, fontSize: 14, color: "#1F2937", minHeight: 100, textAlignVertical: "top",
  },
  photosGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photo: { width: 80, height: 80, borderRadius: 8 },
  addPhotoBtn: {
    width: 80, height: 80, borderRadius: 8, borderWidth: 2, borderColor: "#E5E7EB",
    alignItems: "center", justifyContent: "center", borderStyle: "dashed",
  },
  addPhotoBtnText: { color: "#6B7280", fontSize: 12, textAlign: "center" },
  actions: { padding: 16, paddingBottom: 32 },
  btnStart: {
    backgroundColor: "#2563EB", padding: 16, borderRadius: 12, alignItems: "center",
  },
  btnComplete: {
    backgroundColor: "#16A34A", padding: 16, borderRadius: 12, alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  completedLabel: { textAlign: "center", color: "#6B7280", fontSize: 15, fontWeight: "600" },
});
