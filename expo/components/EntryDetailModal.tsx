import { format } from "date-fns";
import { X, MapPin, Edit3, Share2, Trash2, Pin, PinOff } from "lucide-react-native";
import React, { useState, useEffect } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image as RNImage,
  TextInput,
  Alert,
} from "react-native";
import { Audio } from "expo-av";

import { THEME } from "@/constants/theme";
import { MoodEntry, useMood } from "@/context/MoodContext";

type EntryDetailModalProps = {
  visible: boolean;
  entry: MoodEntry | null;
  onClose: () => void;
};

export function EntryDetailModal({ visible, entry, onClose }: EntryDetailModalProps) {
  const { updateEntry, deleteEntry, togglePinEntry } = useMood();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [editedTitle, setEditedTitle] = useState("");
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (sound) {
      return () => {
        sound.unloadAsync();
      };
    }
  }, [sound]);

  if (!entry) return null;

  const handleEdit = () => {
    setEditedContent(entry.content);
    setEditedTitle(entry.title || "");
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    updateEntry(entry.id, {
      content: editedContent,
      title: editedTitle || undefined,
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Entry",
      "Are you sure you want to delete this entry?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteEntry(entry.id);
            onClose();
          },
        },
      ]
    );
  };

  const handleShare = () => {
    Alert.alert("Share", "Share functionality coming soon!");
  };

  const handlePin = () => {
    togglePinEntry(entry.id);
  };

  const playSound = async () => {
    try {
      if (isPlaying && sound) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else if (sound) {
        await sound.playAsync();
        setIsPlaying(true);
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: entry.content },
          { shouldPlay: true }
        );
        setSound(newSound);
        setIsPlaying(true);

        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
          }
        });
      }
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <X color={THEME.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Entry Details</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>
          <View style={[styles.moodBadge, { backgroundColor: entry.moodColor }]}>
            <Text style={styles.moodText}>{entry.mood}</Text>
            <Text style={styles.confidenceText}>
              {Math.round(entry.confidence * 100)}% confidence
            </Text>
          </View>

          <Text style={styles.timestamp}>
            {format(new Date(entry.timestamp), "EEEE, MMMM d, yyyy 'at' h:mm a")}
          </Text>

          {entry.pinned && (
            <View style={styles.pinnedBadge}>
              <Pin size={14} color={THEME.primary} />
              <Text style={styles.pinnedText}>Pinned</Text>
            </View>
          )}

          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.titleInput}
                placeholder="Title (optional)"
                value={editedTitle}
                onChangeText={setEditedTitle}
                placeholderTextColor={THEME.textSecondary}
              />
              {entry.type === "text" && (
                <TextInput
                  style={styles.contentInput}
                  multiline
                  placeholder="Content"
                  value={editedContent}
                  onChangeText={setEditedContent}
                  textAlignVertical="top"
                  placeholderTextColor={THEME.textSecondary}
                />
              )}
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setIsEditing(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveEdit}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {entry.title && (
                <Text style={styles.title}>{entry.title}</Text>
              )}

              {entry.type === "text" && (
                <Text style={styles.textContent}>{entry.content}</Text>
              )}

              {entry.type === "photo" && (
                <RNImage
                  source={{ uri: entry.content }}
                  style={styles.photoContent}
                  resizeMode="cover"
                />
              )}

              {entry.type === "voice" && (
                <View style={styles.voiceContent}>
                  <TouchableOpacity
                    style={styles.playButton}
                    onPress={playSound}
                  >
                    <Text style={styles.playButtonText}>
                      {isPlaying ? "⏸ Pause" : "▶ Play"}
                    </Text>
                  </TouchableOpacity>
                  {entry.transcript && (
                    <View style={styles.transcriptContainer}>
                      <Text style={styles.transcriptLabel}>Transcript:</Text>
                      <Text style={styles.transcriptText}>{entry.transcript}</Text>
                    </View>
                  )}
                </View>
              )}
            </>
          )}

          {entry.location && (
            <View style={styles.locationContainer}>
              <MapPin size={16} color={THEME.textSecondary} />
              <Text style={styles.locationText}>
                {entry.location.address || `${entry.location.latitude.toFixed(4)}, ${entry.location.longitude.toFixed(4)}`}
              </Text>
            </View>
          )}

          {entry.keywords && entry.keywords.length > 0 && (
            <View style={styles.keywordsContainer}>
              <Text style={styles.sectionLabel}>Keywords:</Text>
              <View style={styles.keywordsList}>
                {entry.keywords.map((keyword, index) => (
                  <View key={index} style={styles.keywordChip}>
                    <Text style={styles.keywordText}>{keyword}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.aiExplanation}>
            <Text style={styles.aiTitle}>AI Analysis</Text>
            <Text style={styles.aiText}>
              This entry was classified as {entry.mood} based on emotional cues detected in the content.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={handlePin}>
            {entry.pinned ? (
              <PinOff size={20} color={THEME.text} />
            ) : (
              <Pin size={20} color={THEME.text} />
            )}
            <Text style={styles.actionText}>{entry.pinned ? "Unpin" : "Pin"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
            <Edit3 size={20} color={THEME.text} />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Share2 size={20} color={THEME.text} />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
            <Trash2 size={20} color="#ef4444" />
            <Text style={[styles.actionText, { color: "#ef4444" }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    backgroundColor: THEME.card,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: THEME.text,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  moodBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  moodText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 2,
  },
  confidenceText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
  },
  timestamp: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginBottom: 16,
  },
  pinnedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 16,
  },
  pinnedText: {
    fontSize: 12,
    color: THEME.primary,
    fontWeight: "600",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: THEME.text,
    marginBottom: 12,
  },
  textContent: {
    fontSize: 16,
    color: THEME.text,
    lineHeight: 26,
    marginBottom: 20,
  },
  photoContent: {
    width: "100%",
    height: 300,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: "#e5e7eb",
  },
  voiceContent: {
    marginBottom: 20,
  },
  playButton: {
    backgroundColor: THEME.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  playButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  transcriptContainer: {
    backgroundColor: THEME.card,
    padding: 16,
    borderRadius: 12,
  },
  transcriptLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.textSecondary,
    marginBottom: 8,
  },
  transcriptText: {
    fontSize: 15,
    color: THEME.text,
    lineHeight: 24,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: THEME.card,
    borderRadius: 12,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 14,
    color: THEME.text,
    flex: 1,
  },
  keywordsContainer: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.textSecondary,
    marginBottom: 8,
  },
  keywordsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  keywordChip: {
    backgroundColor: THEME.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  keywordText: {
    fontSize: 13,
    color: THEME.text,
  },
  aiExplanation: {
    backgroundColor: "#f0f9ff",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#0ea5e9",
    marginBottom: 20,
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0369a1",
    marginBottom: 6,
  },
  aiText: {
    fontSize: 14,
    color: "#075985",
    lineHeight: 20,
  },
  editContainer: {
    marginBottom: 20,
  },
  titleInput: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: "600",
    color: THEME.text,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 12,
  },
  contentInput: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 16,
    height: 200,
    fontSize: 16,
    color: THEME.text,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 12,
  },
  editActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: THEME.text,
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: THEME.primary,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  actions: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: 32,
    backgroundColor: THEME.card,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    color: THEME.text,
    fontWeight: "500",
  },
});
