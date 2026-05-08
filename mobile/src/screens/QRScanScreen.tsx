import React, { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import QRCodeScanner from "react-native-qrcode-scanner";
import { database } from "../database";
import { Q } from "@nozbe/watermelondb";

export default function QRScanScreen() {
  const navigation = useNavigation<any>();
  const [scanned, setScanned] = useState(false);

  const onScan = async (e: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    const tag = e.data.trim().toUpperCase();
    const assetCol = database.get<any>("assets");
    const results = await assetCol.query(Q.where("tag", tag)).fetch();

    if (results.length === 0) {
      Alert.alert("Ativo não encontrado", `Tag "${tag}" não está na base local.`, [
        { text: "OK", onPress: () => setScanned(false) },
      ]);
      return;
    }

    const asset = results[0];
    const woCol = database.get<any>("work_orders");
    const openOrders = await woCol
      .query(
        Q.where("asset_id", asset.serverId),
        Q.where("status", Q.notIn(["completed", "cancelled"])),
      )
      .fetch();

    if (openOrders.length > 0) {
      navigation.replace("WorkOrderDetail", { orderId: openOrders[0].id });
    } else {
      Alert.alert(
        asset.name,
        `Tag: ${asset.tag}\nTipo: ${asset.assetType}\nStatus: ${asset.status}\n\nNão há OS abertas para este ativo.`,
        [
          { text: "OK", onPress: () => setScanned(false) },
          {
            text: "Ver Ativo",
            onPress: () => navigation.navigate("AssetDetail", { assetId: asset.serverId }),
          },
        ],
      );
    }
  };

  return (
    <View style={styles.container}>
      <QRCodeScanner
        onRead={onScan}
        topContent={
          <Text style={styles.hint}>
            Aponte a câmera para o QR Code do ativo
          </Text>
        }
        bottomContent={
          <Text style={styles.subHint}>
            O código será lido automaticamente
          </Text>
        }
        cameraStyle={styles.camera}
        containerStyle={styles.scanner}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  scanner: { flex: 1 },
  camera: { height: "60%" },
  hint: { color: "#fff", fontSize: 16, textAlign: "center", marginBottom: 20, paddingHorizontal: 20 },
  subHint: { color: "#94A3B8", fontSize: 13, textAlign: "center", marginTop: 20 },
});
