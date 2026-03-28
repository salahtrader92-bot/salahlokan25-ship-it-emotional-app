import { Camera, Mic, PenTool } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { THEME } from "@/constants/theme";

type QuickActionsProps = {
  onAddNote: () => void;
  onAddVoice: () => void;
  onAddPhoto: () => void;
};

export function QuickActions({
  onAddNote,
  onAddVoice,
  onAddPhoto,
}: QuickActionsProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={onAddNote} activeOpacity={0.7}>
        <LinearGradient
          colors={["#3b82f6", "#6366f1"]}
          style={styles.iconContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <PenTool color="#ffffff" size={24} />
        </LinearGradient>
        <Text style={styles.label}>Note</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={onAddVoice} activeOpacity={0.7}>
        <LinearGradient
          colors={["#a855f7", "#ec4899"]}
          style={styles.iconContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Mic color="#ffffff" size={24} />
        </LinearGradient>
        <Text style={styles.label}>Voice</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={onAddPhoto} activeOpacity={0.7}>
        <LinearGradient
          colors={["#10b981", "#34d399"]}
          style={styles.iconContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Camera color="#ffffff" size={24} />
        </LinearGradient>
        <Text style={styles.label}>Photo</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 20,
    backgroundColor: THEME.card,
    borderRadius: 24,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  button: {
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: THEME.text,
  },
});
