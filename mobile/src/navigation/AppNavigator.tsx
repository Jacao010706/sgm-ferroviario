import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import WorkOrderListScreen from "../screens/WorkOrderListScreen";
import WorkOrderDetailScreen from "../screens/WorkOrderDetailScreen";
import QRScanScreen from "../screens/QRScanScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function OrdersStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#1E3A5F" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Stack.Screen
        name="WorkOrderList"
        component={WorkOrderListScreen}
        options={{ title: "Minhas OS" }}
      />
      <Stack.Screen
        name="WorkOrderDetail"
        component={WorkOrderDetailScreen}
        options={{ title: "Detalhes da OS" }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: "#2563EB",
          tabBarInactiveTintColor: "#9CA3AF",
          tabBarStyle: { backgroundColor: "#fff", borderTopColor: "#E5E7EB" },
          tabBarIcon: ({ color, size }) => {
            const icons: Record<string, string> = {
              Orders: "clipboard-list",
              QRScan: "qrcode-scan",
            };
            return <Icon name={icons[route.name] || "home"} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Orders" component={OrdersStack} options={{ tabBarLabel: "OS" }} />
        <Tab.Screen
          name="QRScan"
          component={QRScanScreen}
          options={{
            tabBarLabel: "Escanear",
            headerShown: true,
            headerStyle: { backgroundColor: "#1E3A5F" },
            headerTintColor: "#fff",
            title: "Escanear Ativo",
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
