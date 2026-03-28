import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { EmotionType, EMOTION_COLORS, THEME } from "@/constants/theme";

type MoodRingProps = {
  score: number;
  recentMood: EmotionType | null;
};

export function MoodRing({ score, recentMood }: MoodRingProps) {
  const moodColor = recentMood
    ? EMOTION_COLORS[recentMood]
    : THEME.primary;
  
  const getScoreColor = () => {
    if (score >= 75) return "#10b981";
    if (score >= 50) return "#f59e0b";
    return "#ef4444";
  };

  const scoreColor = getScoreColor();

  return (
    <View style={styles.container}>
      <View style={styles.glowContainer}>
        <View style={[styles.glow, { backgroundColor: `${scoreColor}33` }]} />
      </View>
      <LinearGradient
        colors={[scoreColor, THEME.primary]}
        style={styles.ring}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.innerCircle}>
          <Text style={styles.score}>{score}</Text>
          <Text style={styles.label}>Mood Score</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {score >= 75 ? "Excellent" : score >= 50 ? "Good" : "Needs Care"}
            </Text>
          </View>
        </View>
      </LinearGradient>
      {recentMood && (
        <View style={[styles.badge, { backgroundColor: moodColor }]}>
          <Text style={styles.badgeText}>{recentMood}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 32,
    position: "relative" as const,
  },
  glowContainer: {
    position: "absolute" as const,
    width: 280,
    height: 280,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.3,
  },
  ring: {
    width: 220,
    height: 220,
    borderRadius: 110,
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: THEME.primary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  innerCircle: {
    width: 204,
    height: 204,
    borderRadius: 102,
    backgroundColor: THEME.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.borderLight,
  },
  score: {
    fontSize: 64,
    fontWeight: "bold" as const,
    color: THEME.text,
  },
  label: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginTop: 4,
    fontWeight: "500" as const,
  },
  statusBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: `${THEME.primary}22`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${THEME.primary}44`,
  },
  statusText: {
    fontSize: 11,
    color: THEME.primaryLight,
    fontWeight: "600" as const,
  },
  badge: {
    marginTop: -24,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: THEME.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  badgeText: {
    color: "#ffffff",
    fontWeight: "bold" as const,
    fontSize: 15,
  },
});
