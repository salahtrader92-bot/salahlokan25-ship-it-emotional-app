import { useRouter } from "expo-router";
import { Plus, CheckSquare, Download, Share2, Trash2, X } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EntryCard } from "@/components/EntryCard";
import { EntryDetailModal } from "@/components/EntryDetailModal";
import { SearchBar } from "@/components/SearchBar";
import { EMOTION_COLORS, EmotionType, THEME } from "@/constants/theme";
import { useMood, MoodEntry } from "@/context/MoodContext";

const ALL_EMOTIONS: EmotionType[] = ["Happy", "Calm", "Stressed", "Negative", "Excited"];

type SortType = "newest" | "oldest" | "score-high" | "score-low";

export default function JournalScreen() {
  const router = useRouter();
  const { entries, deleteMultipleEntries } = useMood();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMood, setSelectedMood] = useState<EmotionType | null>(null);
  const [sortBy, setSortBy] = useState<SortType>("newest");
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [selectedEntry, setSelectedEntry] = useState<MoodEntry | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const filteredAndSortedEntries = useMemo(() => {
    let filtered = entries;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((entry) => {
        const searchText = `${entry.content} ${entry.transcript || ""} ${entry.title || ""} ${entry.location?.address || ""}`.toLowerCase();
        return searchText.includes(query);
      });
    }

    if (selectedMood) {
      filtered = filtered.filter((entry) => entry.mood === selectedMood);
    }

    const sorted = [...filtered];
    switch (sortBy) {
      case "oldest":
        sorted.reverse();
        break;
      case "score-high":
        sorted.sort((a, b) => b.confidence - a.confidence);
        break;
      case "score-low":
        sorted.sort((a, b) => a.confidence - b.confidence);
        break;
      case "newest":
      default:
        break;
    }

    return sorted;
  }, [entries, searchQuery, selectedMood, sortBy]);

  const handleEntryPress = (entry: MoodEntry) => {
    if (multiSelectMode) {
      toggleEntrySelection(entry.id);
    } else {
      setSelectedEntry(entry);
      setDetailModalVisible(true);
    }
  };

  const handleEntryLongPress = (entry: MoodEntry) => {
    if (!multiSelectMode) {
      setMultiSelectMode(true);
      setSelectedEntries(new Set([entry.id]));
    }
  };

  const toggleEntrySelection = (id: string) => {
    const newSet = new Set(selectedEntries);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedEntries(newSet);
    if (newSet.size === 0) {
      setMultiSelectMode(false);
    }
  };

  const handleBatchDelete = () => {
    Alert.alert(
      "Delete Entries",
      `Are you sure you want to delete ${selectedEntries.size} ${selectedEntries.size === 1 ? "entry" : "entries"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteMultipleEntries(Array.from(selectedEntries));
            setSelectedEntries(new Set());
            setMultiSelectMode(false);
          },
        },
      ]
    );
  };

  const handleBatchExport = () => {
    Alert.alert("Export", `Exporting ${selectedEntries.size} entries (coming soon)`);
  };

  const handleBatchShare = () => {
    Alert.alert("Share", `Sharing ${selectedEntries.size} entries (coming soon)`);
  };

  const cancelMultiSelect = () => {
    setMultiSelectMode(false);
    setSelectedEntries(new Set());
  };

  const moodCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach((entry) => {
      counts[entry.mood] = (counts[entry.mood] || 0) + 1;
    });
    return counts;
  }, [entries]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        {multiSelectMode ? (
          <View style={styles.multiSelectHeader}>
            <TouchableOpacity onPress={cancelMultiSelect}>
              <X color={THEME.text} size={24} />
            </TouchableOpacity>
            <Text style={styles.multiSelectTitle}>
              {selectedEntries.size} selected
            </Text>
            <View style={styles.multiSelectActions}>
              <TouchableOpacity
                style={styles.multiSelectButton}
                onPress={handleBatchShare}
              >
                <Share2 size={20} color={THEME.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.multiSelectButton}
                onPress={handleBatchExport}
              >
                <Download size={20} color={THEME.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.multiSelectButton}
                onPress={handleBatchDelete}
              >
                <Trash2 size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.title}>Journal</Text>
                <Text style={styles.subtitle}>{entries.length} entries</Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => setMultiSelectMode(true)}
                >
                  <CheckSquare size={22} color={THEME.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => router.push("/new-entry?type=text")}
                >
                  <Plus color="#fff" size={20} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.searchContainer}>
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search text, places, or keywords..."
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScrollView}
              contentContainerStyle={styles.filterContainer}
            >
              <TouchableOpacity
                style={[styles.filterChip, !selectedMood && styles.activeFilter]}
                onPress={() => setSelectedMood(null)}
              >
                <Text style={[styles.filterText, !selectedMood && styles.activeFilterText]}>
                  All
                </Text>
                {!selectedMood && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{entries.length}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {ALL_EMOTIONS.map((mood) => (
                <TouchableOpacity
                  key={mood}
                  style={[
                    styles.filterChip,
                    selectedMood === mood && styles.activeFilter,
                    selectedMood === mood && { backgroundColor: EMOTION_COLORS[mood] },
                  ]}
                  onPress={() => setSelectedMood(selectedMood === mood ? null : mood)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      selectedMood === mood && styles.activeFilterText,
                    ]}
                  >
                    {mood}
                  </Text>
                  {moodCounts[mood] ? (
                    <View style={[styles.countBadge, selectedMood === mood && styles.activeCountBadge]}>
                      <Text style={[styles.countText, selectedMood === mood && styles.activeCountText]}>
                        {moodCounts[mood]}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sortContainer}
            >
              <Text style={styles.sortLabel}>Sort:</Text>
              {[
                { key: "newest", label: "Newest" },
                { key: "oldest", label: "Oldest" },
                { key: "score-high", label: "Confidence ↓" },
                { key: "score-low", label: "Confidence ↑" },
              ].map((sort) => (
                <TouchableOpacity
                  key={sort.key}
                  style={[
                    styles.sortChip,
                    sortBy === sort.key && styles.activeSortChip,
                  ]}
                  onPress={() => setSortBy(sort.key as SortType)}
                >
                  <Text
                    style={[
                      styles.sortText,
                      sortBy === sort.key && styles.activeSortText,
                    ]}
                  >
                    {sort.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <FlatList
          data={filteredAndSortedEntries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EntryCard
              entry={item}
              onPress={handleEntryPress}
              onLongPress={handleEntryLongPress}
              isSelected={selectedEntries.has(item.id)}
              multiSelectMode={multiSelectMode}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {searchQuery || selectedMood
                  ? "No entries found"
                  : "No memories yet"}
              </Text>
              <Text style={styles.emptyText}>
                {searchQuery || selectedMood
                  ? "Try adjusting your filters or search"
                  : "Add your first note, photo, or voice recording to begin your emotional map"}
              </Text>
              {!searchQuery && !selectedMood && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => router.push("/new-entry?type=text")}
                >
                  <Plus color="#fff" size={20} />
                  <Text style={styles.emptyButtonText}>Create Entry</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      </SafeAreaView>

      <EntryDetailModal
        visible={detailModalVisible}
        entry={selectedEntry}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedEntry(null);
        }}
      />
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
  header: {
    paddingTop: 8,
    backgroundColor: THEME.background,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: THEME.text,
  },
  subtitle: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  iconButton: {
    padding: 8,
  },
  addButton: {
    backgroundColor: THEME.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  filterScrollView: {
    maxHeight: 60,
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    gap: 6,
  },
  activeFilter: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  filterText: {
    color: THEME.text,
    fontWeight: "600",
    fontSize: 14,
  },
  activeFilterText: {
    color: "#fff",
  },
  countBadge: {
    backgroundColor: THEME.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
  },
  activeCountBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  countText: {
    color: THEME.text,
    fontSize: 11,
    fontWeight: "600",
  },
  activeCountText: {
    color: "#fff",
  },
  sortContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sortLabel: {
    fontSize: 13,
    color: THEME.textSecondary,
    fontWeight: "600",
    marginRight: 4,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  activeSortChip: {
    backgroundColor: THEME.text,
    borderColor: THEME.text,
  },
  sortText: {
    fontSize: 12,
    color: THEME.textSecondary,
    fontWeight: "500",
  },
  activeSortText: {
    color: "#fff",
  },
  list: {
    padding: 20,
    paddingTop: 8,
  },
  emptyState: {
    paddingVertical: 60,
    paddingHorizontal: 40,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: THEME.text,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    color: THEME.textSecondary,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: "row",
    backgroundColor: THEME.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center",
    gap: 8,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  multiSelectHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 8,
    backgroundColor: THEME.card,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  multiSelectTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: THEME.text,
    flex: 1,
    marginLeft: 16,
  },
  multiSelectActions: {
    flexDirection: "row",
    gap: 16,
  },
  multiSelectButton: {
    padding: 4,
  },
});
