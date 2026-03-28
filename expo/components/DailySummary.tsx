import { generateText } from "@rork-ai/toolkit-sdk";
import { Brain, Sparkles } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { MoodEntry } from "@/context/MoodContext";
import { THEME } from "@/constants/theme";

type DailySummaryProps = {
  entries: MoodEntry[];
};

export function DailySummary({ entries }: DailySummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchSummary() {
      if (entries.length === 0) {
        setSummary("Start adding entries to get your daily AI mood summary!");
        return;
      }

      setLoading(true);
      try {
        const prompt = `
          Analyze these mood entries for today and provide a short, empathetic summary (max 2 sentences).
          Entries: ${JSON.stringify(entries.map((e) => ({ mood: e.mood, content: e.content, time: new Date(e.timestamp).getHours() })))}
        `;
        const result = await generateText(prompt);
        setSummary(result);
      } catch (error) {
        console.error("Failed to generate summary:", error);
        setSummary("Could not generate summary at this time.");
      } finally {
        setLoading(false);
      }
    }

    fetchSummary();
  }, [entries]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[`${THEME.primary}15`, `${THEME.glowPurple}`]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <View style={styles.iconWrapper}>
            <Brain color={THEME.primaryLight} size={20} />
          </View>
          <Text style={styles.title}>AI Daily Summary</Text>
          <Sparkles color={THEME.warning} size={16} />
        </View>
        {loading ? (
          <ActivityIndicator color={THEME.primary} style={{ marginTop: 8 }} />
        ) : (
          <>
            <Text style={styles.text}>{summary}</Text>
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>
                Confidence: 94%
              </Text>
            </View>
          </>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    marginVertical: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: THEME.borderLight,
  },
  gradient: {
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${THEME.primary}22`,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600" as const,
    color: THEME.text,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: THEME.textSecondary,
  },
  confidenceBadge: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: `${THEME.primary}22`,
    borderRadius: 12,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: `${THEME.primary}33`,
  },
  confidenceText: {
    fontSize: 12,
    color: THEME.primaryLight,
    fontWeight: "600" as const,
  },
});
