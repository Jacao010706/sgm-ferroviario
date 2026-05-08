import React, { useEffect, useState, useCallback } from "react";
import {
  View, FlatList, Text, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { database } from "../database";
import { Q } from "@nozbe/watermelondb";
import { syncEngine } from "../sync/SyncEngine";
import NetInfo from "@react-native-community/netinfo";

const PRIORITY_COLOR: Record<string, string> = {
  critical: "#DC2626",
  high:     "#EA580C",
  medium:   "#D97706",
  low:      "#16A34A",
};

const STATUS_LABEL: Record<string, string> = {
  pending:       "Pendente",
  assigned:      "Atribuída",
  in_progress:   "Em execução",
  paused:        "Pausada",
  waiting_parts: "Aguardando peças",
  completed:     "Concluída",
};

export default function WorkOrderListScreen() {
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((s) => setIsOnline(!!s.isConnected));
    loadOrders();
    return unsub;
  }, []);

  const loadOrders = async () => {
    const col = database.get<any>("work_orders");
    const results = await col
      .query(
        Q.where("status", Q.notIn(["completed", "cancelled"])),
        Q.sortBy("priority", Q.asc),
      )
      .fetch();
    setOrders(results);
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (isOnline) {
      await syncEngine.downloadMyWorkOrders();
    }
    await loadOrders();
    setRefreshing(false);
  }, [isOnline]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Modo Offline — dados locais</Text>
        </View>
      )}
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>Nenhuma OS pendente</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("WorkOrderDetail", { orderId: item.id })}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLOR[item.priority] }]} />
              <Text style={styles.orderNumber}>{item.number}</Text>
              {!item.isSynced && <Text style={styles.unsyncedBadge}>⬆ Pendente</Text>}
            </View>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.assetTag}>{item.assetTag}</Text>
              <Text style={styles.statusBadge}>{STATUS_LABEL[item.status] || item.status}</Text>
            </View>
            {item.scheduledStart && (
              <Text style={styles.dueDate}>
                Prazo: {new Date(item.scheduledEnd || item.scheduledStart).toLocaleDateString("pt-BR")}
              </Text>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F5F9" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  offlineBanner: {
    backgroundColor: "#F59E0B", padding: 8, alignItems: "center",
  },
  offlineText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  card: {
    backgroundColor: "#fff", margin: 8, padding: 14,
    borderRadius: 12, elevation: 2,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  priorityDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  orderNumber: { fontWeight: "700", color: "#1E3A5F", fontSize: 14, flex: 1 },
  unsyncedBadge: { fontSize: 11, color: "#F59E0B", fontWeight: "600" },
  title: { fontSize: 15, color: "#1F2937", marginBottom: 8 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  assetTag: {
    fontSize: 12, color: "#6B7280",
    backgroundColor: "#E5E7EB", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  statusBadge: { fontSize: 12, color: "#2563EB", fontWeight: "600" },
  dueDate: { fontSize: 11, color: "#9CA3AF", marginTop: 4 },
  emptyText: { color: "#9CA3AF", fontSize: 16, marginTop: 20 },
});
