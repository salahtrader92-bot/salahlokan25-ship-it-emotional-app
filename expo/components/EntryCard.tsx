import { format } from "date-fns";
import { Image, MapPin, Mic, Pin, CheckCircle, Circle } from "lucide-react-native";
import React from "react";
import { Image as RNImage, StyleSheet, Text, View, TouchableOpacity } from "react-native";

import { THEME } from "@/constants/theme";
import { MoodEntry } from "@/context/MoodContext";

type EntryCardProps = {
  entry: MoodEntry;
  onPress?: (entry: MoodEntry) => void;
  onLongPress?: (entry: MoodEntry) => void;
  isSelected?: boolean;
  multiSelectMode?: boolean;
};

export function EntryCard({ 
  entry, 
  onPress,
  onLongPress,
  isSelected = false,
  multiSelectMode = false
}: EntryCardProps) {
  const handlePress = () => {
    onPress?.(entry);
  };

  const handleLongPress = () => {
    onLongPress?.(entry);
  };
  return (
    <TouchableOpacity 
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      style={[styles.card, isSelected && styles.selectedCard]}
    >
      <View style={[styles.colorBar, { backgroundColor: entry.moodColor }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {entry.pinned && (
              <Pin size={14} color={THEME.primary} style={styles.pinIcon} />
            )}
            <Text style={[styles.mood, { color: entry.moodColor }]}>
              {entry.mood}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.date}>
              {format(new Date(entry.timestamp), "MMM d, h:mm a")}
            </Text>
            {multiSelectMode && (
              <View style={styles.selectIcon}>
                {isSelected ? (
                  <CheckCircle size={22} color={THEME.primary} fill={THEME.primary} />
                ) : (
                  <Circle size={22} color={THEME.border} />
                )}
              </View>
            )}
          </View>
        </View>

        <View style={styles.body}>
          {entry.type === "text" && (
            <Text style={styles.text} numberOfLines={3}>
              {entry.content}
            </Text>
          )}

          {entry.type === "voice" && (
            <View style={styles.voiceContainer}>
              <View style={styles.voiceIcon}>
                <Mic color="#fff" size={20} />
              </View>
              <View>
                <Text style={styles.voiceLabel}>Voice Note</Text>
                {entry.transcript && (
                  <Text style={styles.transcript} numberOfLines={2}>
                    {entry.transcript}
                  </Text>
                )}
              </View>
            </View>
          )}

          {entry.type === "photo" && (
            <View>
              <RNImage source={{ uri: entry.content }} style={styles.image} />
              <View style={styles.imageOverlay}>
                <Image color="#fff" size={16} />
                <Text style={styles.imageLabel}>Photo Memory</Text>
              </View>
            </View>
          )}
        </View>

        {(entry.location || entry.keywords) && (
          <View style={styles.footer}>
            {entry.location && (
              <View style={styles.locationTag}>
                <MapPin size={12} color={THEME.textSecondary} />
                <Text style={styles.location}>
                  {entry.location.address || "Unknown Location"}
                </Text>
              </View>
            )}
            {entry.keywords && entry.keywords.length > 0 && (
              <View style={styles.keywordsPreview}>
                <Text style={styles.keywordText} numberOfLines={1}>
                  {entry.keywords.slice(0, 3).join(" • ")}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: THEME.card,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  colorBar: {
    width: 6,
    height: "100%",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  mood: {
    fontWeight: "bold",
    fontSize: 16,
  },
  date: {
    fontSize: 12,
    color: THEME.textSecondary,
  },
  body: {
    marginBottom: 12,
  },
  text: {
    fontSize: 15,
    color: THEME.text,
    lineHeight: 22,
  },
  voiceContainer: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    padding: 12,
    borderRadius: 12,
  },
  voiceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  voiceLabel: {
    fontWeight: "600",
    color: THEME.text,
  },
  transcript: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  image: {
    width: "100%",
    height: 150,
    borderRadius: 12,
    backgroundColor: "#e5e7eb",
  },
  imageOverlay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  imageLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  locationTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  location: {
    fontSize: 12,
    color: THEME.textSecondary,
  },
  keywordsPreview: {
    flexShrink: 1,
  },
  keywordText: {
    fontSize: 11,
    color: THEME.textSecondary,
    fontStyle: "italic",
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: THEME.primary,
    shadowOpacity: 0.15,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pinIcon: {
    marginBottom: 2,
  },
  selectIcon: {
    marginLeft: 4,
  },
});
