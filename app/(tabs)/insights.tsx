import { generateText } from "@rork-ai/toolkit-sdk";
import {
  Activity,
  BarChart3,
  BrainCircuit,
  Clock,
  TrendingUp,
  Zap,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EMOTION_COLORS, EmotionType, THEME } from "@/constants/theme";
import { useMood } from "@/context/MoodContext";

type DateRangeType = "7d" | "30d" | "90d" | "all";

export default function InsightsScreen() {
  const { entries, getEntriesInRange } = useMood();
  const [dateRange, setDateRange] = useState<DateRangeType>("7d");
  const [prediction, setPrediction] = useState<string | null>(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const filteredEntries = useMemo(() => {
    const now = new Date();
    const startDate = new Date();

    switch (dateRange) {
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(now.getDate() - 90);
        break;
      case "all":
        return entries;
    }

    return getEntriesInRange(startDate, now);
  }, [entries, dateRange, getEntriesInRange]);

  const stats = useMemo(() => {
    const counts: Record<EmotionType, number> = {
      Happy: 0,
      Calm: 0,
      Stressed: 0,
      Negative: 0,
      Excited: 0,
    };
    let totalScore = 0;
    let totalConfidence = 0;

    filteredEntries.forEach((e) => {
      counts[e.mood]++;
      totalConfidence += e.confidence;
      switch (e.mood) {
        case "Happy":
        case "Excited":
          totalScore += 90;
          break;
        case "Calm":
          totalScore += 75;
          break;
        case "Stressed":
          totalScore += 30;
          break;
        case "Negative":
          totalScore += 10;
          break;
      }
    });

    const avgScore =
      filteredEntries.length > 0
        ? Math.round(totalScore / filteredEntries.length)
        : 0;
    const avgConfidence =
      filteredEntries.length > 0
        ? Math.round((totalConfidence / filteredEntries.length) * 100)
        : 0;

    const dominantEmotion =
      (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as EmotionType) || "Calm";

    const moodScores = filteredEntries.map((e) => {
      switch (e.mood) {
        case "Happy":
        case "Excited":
          return 90;
        case "Calm":
          return 75;
        case "Stressed":
          return 30;
        case "Negative":
          return 10;
        default:
          return 50;
      }
    });

    const volatility =
      moodScores.length > 1
        ? Math.round(
            Math.sqrt(
              moodScores.reduce((sum, score) => {
                const diff = score - avgScore;
                return sum + diff * diff;
              }, 0) / moodScores.length
            )
          )
        : 0;

    return {
      counts,
      avgScore,
      avgConfidence,
      dominantEmotion,
      volatility,
      totalEntries: filteredEntries.length,
    };
  }, [filteredEntries]);

  const hourlyData = useMemo(() => {
    const hourCounts: Record<number, { total: number; count: number }> = {};

    filteredEntries.forEach((e) => {
      const hour = new Date(e.timestamp).getHours();
      if (!hourCounts[hour]) {
        hourCounts[hour] = { total: 0, count: 0 };
      }

      let score = 50;
      switch (e.mood) {
        case "Happy":
        case "Excited":
          score = 90;
          break;
        case "Calm":
          score = 75;
          break;
        case "Stressed":
          score = 30;
          break;
        case "Negative":
          score = 10;
          break;
      }

      hourCounts[hour].total += score;
      hourCounts[hour].count++;
    });

    const bestHour = Object.entries(hourCounts)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        avg: data.total / data.count,
      }))
      .sort((a, b) => b.avg - a.avg)[0];

    const worstHour = Object.entries(hourCounts)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        avg: data.total / data.count,
      }))
      .sort((a, b) => a.avg - b.avg)[0];

    return { bestHour, worstHour };
  }, [filteredEntries]);

  const topKeywords = useMemo(() => {
    const keywordCounts: Record<string, number> = {};

    filteredEntries.forEach((e) => {
      e.keywords?.forEach((kw) => {
        keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
      });
    });

    return Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [filteredEntries]);

  useEffect(() => {
    async function generateInsights() {
      if (filteredEntries.length < 3) return;

      setLoadingPrediction(true);
      setLoadingSummary(true);

      try {
        const history = filteredEntries
          .map((e) => ({
            mood: e.mood,
            hour: new Date(e.timestamp).getHours(),
            day: new Date(e.timestamp).getDay(),
            keywords: e.keywords?.slice(0, 3) || [],
          }))
          .slice(0, 30);

        const now = new Date();
        const currentHour = now.getHours();
        const currentDay = now.getDay();

        const predictionPrompt = `Based on this mood history, predict the user's likely mood for the next 24 hours. Current time: ${currentHour}:00 on day ${currentDay}.
History (most recent first): ${JSON.stringify(history.slice(0, 15))}

Provide a 1-2 sentence prediction with specific time and reasoning. Use probabilistic language ("likely", "might", "tend to").`;

        const summaryPrompt = `Analyze this ${dateRange} mood data and provide a 2-3 sentence insightful summary highlighting patterns, trends, or notable observations.
Data: ${JSON.stringify({ stats, history: history.slice(0, 10), hourlyData })}

Be specific, encouraging, and actionable. Mention the dominant emotion and any interesting patterns.`;

        const [predResult, summaryResult] = await Promise.all([
          generateText(predictionPrompt),
          generateText(summaryPrompt),
        ]);

        setPrediction(predResult);
        setAiSummary(summaryResult);
      } catch (e) {
        console.error("Failed to generate insights:", e);
      } finally {
        setLoadingPrediction(false);
        setLoadingSummary(false);
      }
    }

    generateInsights();
  }, [filteredEntries, dateRange, stats, hourlyData]);

  const maxCount = Math.max(...Object.values(stats.counts), 1);

  const renderDateRangeSelector = () => (
    <View style={styles.dateRangeSelector}>
      {(["7d", "30d", "90d", "all"] as DateRangeType[]).map((range) => (
        <TouchableOpacity
          key={range}
          style={[
            styles.dateRangeButton,
            dateRange === range && styles.dateRangeButtonActive,
          ]}
          onPress={() => setDateRange(range)}
        >
          <Text
            style={[
              styles.dateRangeText,
              dateRange === range && styles.dateRangeTextActive,
            ]}
          >
            {range === "7d" && "7 days"}
            {range === "30d" && "30 days"}
            {range === "90d" && "90 days"}
            {range === "all" && "All time"}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (filteredEntries.length === 0) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.emptyContainer}>
            <BarChart3 size={64} color={THEME.textSecondary} />
            <Text style={styles.emptyTitle}>No Data Yet</Text>
            <Text style={styles.emptyText}>
              {dateRange === "all"
                ? "Capture your first mood entry to unlock insights."
                : `No entries found in the last ${dateRange}. Try a different range.`}
            </Text>
            {renderDateRangeSelector()}
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Insights</Text>
            <Text style={styles.subtitle}>{stats.totalEntries} entries</Text>
          </View>

          {renderDateRangeSelector()}

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Zap size={20} color={THEME.primary} />
              <Text style={styles.cardTitle}>AI Summary</Text>
            </View>
            {loadingSummary ? (
              <ActivityIndicator color={THEME.primary} style={{ marginTop: 8 }} />
            ) : (
              <Text style={styles.summaryText}>
                {aiSummary ||
                  "Your emotional patterns are being analyzed. Add more entries for deeper insights."}
              </Text>
            )}
          </View>

          <View style={styles.kpiRow}>
            <View style={[styles.kpiCard, { flex: 1 }]}>
              <TrendingUp size={18} color={EMOTION_COLORS[stats.dominantEmotion]} />
              <Text style={styles.kpiValue}>{stats.avgScore}</Text>
              <Text style={styles.kpiLabel}>Avg Score</Text>
            </View>

            <View style={[styles.kpiCard, { flex: 1 }]}>
              <View
                style={[
                  styles.emotionDot,
                  { backgroundColor: EMOTION_COLORS[stats.dominantEmotion] },
                ]}
              />
              <Text style={styles.kpiValue}>{stats.dominantEmotion}</Text>
              <Text style={styles.kpiLabel}>Dominant</Text>
            </View>

            <View style={[styles.kpiCard, { flex: 1 }]}>
              <Activity size={18} color={THEME.primary} />
              <Text style={styles.kpiValue}>{stats.volatility}</Text>
              <Text style={styles.kpiLabel}>Volatility</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Emotional Distribution</Text>
            <View style={styles.chart}>
              {(Object.keys(stats.counts) as EmotionType[]).map((emotion) => (
                <View key={emotion} style={styles.barContainer}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${(stats.counts[emotion] / maxCount) * 100}%`,
                          backgroundColor: EMOTION_COLORS[emotion],
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel} numberOfLines={1}>
                    {emotion}
                  </Text>
                  <Text style={styles.barValue}>{stats.counts[emotion]}</Text>
                </View>
              ))}
            </View>
          </View>

          {(hourlyData.bestHour || hourlyData.worstHour) && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Clock size={20} color={THEME.primary} />
                <Text style={styles.cardTitle}>Time Patterns</Text>
              </View>
              <View style={styles.timePatternRow}>
                {hourlyData.bestHour && (
                  <View style={styles.timePattern}>
                    <Text style={styles.timePatternLabel}>Best Hour</Text>
                    <Text style={styles.timePatternValue}>
                      {hourlyData.bestHour.hour}:00
                    </Text>
                    <Text style={styles.timePatternScore}>
                      ~{Math.round(hourlyData.bestHour.avg)} avg
                    </Text>
                  </View>
                )}
                {hourlyData.worstHour && (
                  <View style={styles.timePattern}>
                    <Text style={styles.timePatternLabel}>Lowest Hour</Text>
                    <Text style={styles.timePatternValue}>
                      {hourlyData.worstHour.hour}:00
                    </Text>
                    <Text style={styles.timePatternScore}>
                      ~{Math.round(hourlyData.worstHour.avg)} avg
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {topKeywords.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Top Keywords</Text>
              <View style={styles.keywordList}>
                {topKeywords.map(([keyword, count], idx) => (
                  <View key={keyword} style={styles.keywordItem}>
                    <View style={styles.keywordRank}>
                      <Text style={styles.keywordRankText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.keywordName}>{keyword}</Text>
                    <Text style={styles.keywordCount}>×{count}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <BrainCircuit size={20} color={THEME.primary} />
              <Text style={styles.cardTitle}>24-Hour Prediction</Text>
            </View>
            {loadingPrediction ? (
              <ActivityIndicator color={THEME.primary} style={{ marginTop: 8 }} />
            ) : (
              <>
                <Text style={styles.predictionText}>
                  {prediction ||
                    "Analyzing your patterns to predict your mood trends..."}
                </Text>
                <View style={styles.confidenceBadge}>
                  <Text style={styles.confidenceText}>
                    Confidence: {stats.avgConfidence}% • Based on {stats.totalEntries}{" "}
                    {stats.totalEntries === 1 ? "entry" : "entries"}
                  </Text>
                </View>
              </>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Insights improve with more data. Keep capturing your moods!
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold" as const,
    color: THEME.text,
  },
  subtitle: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginTop: 4,
  },
  dateRangeSelector: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  dateRangeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: THEME.card,
    alignItems: "center",
  },
  dateRangeButtonActive: {
    backgroundColor: THEME.primary,
  },
  dateRangeText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: THEME.textSecondary,
  },
  dateRangeTextActive: {
    color: "#FFFFFF",
  },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: THEME.text,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
    color: THEME.text,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: "bold" as const,
    color: THEME.text,
    marginTop: 8,
  },
  kpiLabel: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 4,
  },
  emotionDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  chart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 200,
    paddingBottom: 20,
  },
  barContainer: {
    alignItems: "center",
    flex: 1,
  },
  barTrack: {
    height: 150,
    justifyContent: "flex-end",
    width: "100%",
    alignItems: "center",
  },
  bar: {
    width: 14,
    borderRadius: 7,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    color: THEME.textSecondary,
    marginTop: 8,
  },
  barValue: {
    fontSize: 11,
    fontWeight: "bold" as const,
    color: THEME.text,
    marginTop: 2,
  },
  timePatternRow: {
    flexDirection: "row",
    gap: 16,
  },
  timePattern: {
    flex: 1,
    backgroundColor: THEME.background,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  timePatternLabel: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginBottom: 8,
  },
  timePatternValue: {
    fontSize: 24,
    fontWeight: "bold" as const,
    color: THEME.text,
  },
  timePatternScore: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 4,
  },
  keywordList: {
    gap: 12,
  },
  keywordItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  keywordRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  keywordRankText: {
    fontSize: 12,
    fontWeight: "bold" as const,
    color: "#FFFFFF",
  },
  keywordName: {
    flex: 1,
    fontSize: 15,
    color: THEME.text,
    fontWeight: "500" as const,
  },
  keywordCount: {
    fontSize: 14,
    color: THEME.textSecondary,
    fontWeight: "600" as const,
  },
  predictionText: {
    fontSize: 15,
    lineHeight: 22,
    color: THEME.text,
  },
  confidenceBadge: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: THEME.background,
    borderRadius: 8,
  },
  confidenceText: {
    fontSize: 12,
    color: THEME.textSecondary,
  },
  footer: {
    marginTop: 8,
    marginBottom: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 13,
    color: THEME.textSecondary,
    textAlign: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold" as const,
    color: THEME.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: THEME.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
});
