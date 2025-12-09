import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { DailySummary } from "@/components/DailySummary";
import { MoodRing } from "@/components/MoodRing";
import { QuickActions } from "@/components/QuickActions";
import { THEME } from "@/constants/theme";
import { useMood } from "@/context/MoodContext";

export default function HomeScreen() {
  const { moodScore, recentMood, todayEntries } = useMood();
  const router = useRouter();

  const handleAddNote = () => {
    router.push({ pathname: "/new-entry", params: { type: "text" } });
  };

  const handleAddVoice = () => {
    router.push({ pathname: "/new-entry", params: { type: "voice" } });
  };

  const handleAddPhoto = () => {
    router.push({ pathname: "/new-entry", params: { type: "photo" } });
  };

  const currentDate = new Date().toLocaleDateString("en-US", { 
    weekday: "long", 
    month: "long", 
    day: "numeric" 
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[THEME.background, THEME.backgroundSecondary]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView 
            contentContainerStyle={styles.content} 
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.glowTop} />
              <Text style={styles.greeting}>How are you feeling?</Text>
              <Text style={styles.date}>{currentDate}</Text>
            </View>

            <MoodRing score={moodScore} recentMood={recentMood} />

            <QuickActions
              onAddNote={handleAddNote}
              onAddVoice={handleAddVoice}
              onAddPhoto={handleAddPhoto}
            />

            <DailySummary entries={todayEntries} />
            
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Today's Activity</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{todayEntries.length}</Text>
                  <Text style={styles.statLabel}>Entries</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{moodScore}</Text>
                  <Text style={styles.statLabel}>Score</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {recentMood ? recentMood : "-"}
                  </Text>
                  <Text style={styles.statLabel}>Recent</Text>
                </View>
              </View>
            </View>
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
  },
  header: {
    marginBottom: 16,
    position: "relative" as const,
  },
  glowTop: {
    position: "absolute" as const,
    top: -100,
    left: "50%",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: THEME.glowPurple,
    opacity: 0.3,
    transform: [{ translateX: -150 }],
  },
  greeting: {
    fontSize: 32,
    fontWeight: "bold" as const,
    color: THEME.text,
    marginBottom: 4,
    textAlign: "center",
  },
  date: {
    fontSize: 14,
    color: THEME.textSecondary,
    textAlign: "center",
    fontWeight: "500" as const,
  },
  statsCard: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: THEME.text,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold" as const,
    color: THEME.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: THEME.textSecondary,
    fontWeight: "500" as const,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: THEME.border,
  },
});
