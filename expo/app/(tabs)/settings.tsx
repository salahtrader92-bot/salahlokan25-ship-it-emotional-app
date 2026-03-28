import { Trash2, Upload, Download, Shield, BrainCircuit, Moon, Sun, ChevronRight } from "lucide-react-native";
import React from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { THEME } from "@/constants/theme";
import { useMood } from "@/context/MoodContext";

export default function SettingsScreen() {
  const { clearEntries, entries } = useMood();
  const [isDarkMode, setIsDarkMode] = React.useState(true);
  const [isAiEnabled, setIsAiEnabled] = React.useState(true);

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "Are you sure you want to delete all your mood entries? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: clearEntries,
        },
      ]
    );
  };

  const handleExport = () => {
    Alert.alert(
      "Export Data",
      `Exporting ${entries.length} entries to JSON...`,
      [{ text: "OK" }]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[THEME.background, THEME.backgroundSecondary]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Settings</Text>

            <View style={styles.profileCard}>
              <LinearGradient
                colors={[THEME.primary, THEME.primaryLight]}
                style={styles.profileIconGradient}
              >
                <Text style={styles.profileInitial}>MP</Text>
              </LinearGradient>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>MoodPrint User</Text>
                <Text style={styles.profileSubtitle}>
                  {entries.length} entries • Tracking since Jan 2025
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>AI FEATURES</Text>
              
              <View style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.rowLeft}>
                    <View style={[styles.iconBox, styles.aiIconBox]}>
                      <BrainCircuit size={20} color={THEME.primaryLight} />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.rowLabel}>AI Mood Detection</Text>
                      <Text style={styles.rowSubtext}>Auto-analyze emotions</Text>
                    </View>
                  </View>
                  <Switch 
                    value={isAiEnabled} 
                    onValueChange={setIsAiEnabled}
                    trackColor={{ false: THEME.border, true: THEME.primary }}
                    thumbColor={isAiEnabled ? THEME.primaryLight : THEME.textSecondary}
                  />
                </View>

                <View style={styles.divider} />

                <View style={styles.row}>
                  <View style={styles.rowLeft}>
                    <View style={[styles.iconBox, styles.aiIconBox]}>
                      <Shield size={20} color={THEME.success} />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.rowLabel}>AI Predictions</Text>
                      <Text style={styles.rowSubtext}>24-hour mood forecasts</Text>
                    </View>
                  </View>
                  <Switch 
                    value={isAiEnabled} 
                    onValueChange={setIsAiEnabled}
                    trackColor={{ false: THEME.border, true: THEME.primary }}
                    thumbColor={isAiEnabled ? THEME.primaryLight : THEME.textSecondary}
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>APPEARANCE</Text>
              
              <View style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.rowLeft}>
                    <View style={[styles.iconBox, { backgroundColor: `${THEME.primary}22` }]}>
                      {isDarkMode ? (
                        <Moon size={20} color={THEME.primaryLight} />
                      ) : (
                        <Sun size={20} color={THEME.warning} />
                      )}
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.rowLabel}>Dark Mode</Text>
                      <Text style={styles.rowSubtext}>Currently {isDarkMode ? "enabled" : "disabled"}</Text>
                    </View>
                  </View>
                  <Switch 
                    value={isDarkMode} 
                    onValueChange={setIsDarkMode}
                    trackColor={{ false: THEME.border, true: THEME.primary }}
                    thumbColor={isDarkMode ? THEME.primaryLight : THEME.textSecondary}
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>DATA MANAGEMENT</Text>
              
              <View style={styles.card}>
                <TouchableOpacity style={styles.row} onPress={handleExport}>
                  <View style={styles.rowLeft}>
                    <View style={[styles.iconBox, { backgroundColor: `${THEME.primary}22` }]}>
                      <Download size={20} color={THEME.primaryLight} />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.rowLabel}>Export Data</Text>
                      <Text style={styles.rowSubtext}>Download as JSON or CSV</Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color={THEME.textTertiary} />
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity style={styles.row} onPress={() => Alert.alert("Backup", "Cloud backup coming soon")}>
                  <View style={styles.rowLeft}>
                    <View style={[styles.iconBox, { backgroundColor: `${THEME.success}22` }]}>
                      <Upload size={20} color={THEME.success} />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.rowLabel}>Cloud Backup</Text>
                      <Text style={styles.rowSubtext}>Sync across devices</Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color={THEME.textTertiary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>DANGER ZONE</Text>
              
              <TouchableOpacity style={styles.dangerCard} onPress={handleClearData}>
                <View style={styles.rowLeft}>
                  <View style={[styles.iconBox, { backgroundColor: `${THEME.error}22` }]}>
                    <Trash2 size={20} color={THEME.error} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={[styles.rowLabel, { color: THEME.error }]}>Delete All Data</Text>
                    <Text style={styles.rowSubtext}>This action cannot be undone</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            <Text style={styles.version}>MoodPrint v1.0.0</Text>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold" as const,
    color: THEME.text,
    marginBottom: 24,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.card,
    padding: 20,
    borderRadius: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  profileIconGradient: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  profileInitial: {
    fontSize: 24,
    fontWeight: "bold" as const,
    color: "#ffffff",
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: THEME.text,
    marginBottom: 4,
  },
  profileSubtitle: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: THEME.textTertiary,
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  dangerCard: {
    backgroundColor: `${THEME.error}11`,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: `${THEME.error}33`,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    minHeight: 60,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  aiIconBox: {
    backgroundColor: `${THEME.primary}22`,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: THEME.text,
    marginBottom: 2,
  },
  rowSubtext: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.border,
    marginHorizontal: 12,
  },
  version: {
    textAlign: "center",
    color: THEME.textTertiary,
    fontSize: 13,
    marginTop: 20,
  },
});
