import { generateObject } from "@rork-ai/toolkit-sdk";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Mic, Save, StopCircle } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import { z } from "zod";

import { THEME, EmotionType, EMOTION_COLORS } from "@/constants/theme";
import { useMood } from "@/context/MoodContext";

// Define the schema for AI response
const MoodAnalysisSchema = z.object({
  emotion: z.enum(["Happy", "Calm", "Stressed", "Negative", "Excited"]),
  confidence: z.number(),
  reason: z.string(),
  suggestion: z.string(),
});

export default function NewEntryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const type = (params.type as "text" | "voice" | "photo") || "text";
  const { addEntry } = useMood();

  const [content, setContent] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<z.infer<typeof MoodAnalysisSchema> | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | undefined>(undefined);

  // Request location on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      }
    })();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImageUri(result.assets[0].uri);
      analyzeImage(result.assets[0].base64);
    }
  };

  // Handle Photo Picking
  useEffect(() => {
    if (type === "photo" && !imageUri) {
      pickImage();
    }
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  const analyzeImage = async (base64: string) => {
    setLoading(true);
    try {
      const result = await generateObject({
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze the mood of this image. What emotion does it evoke or represent?" },
              { type: "image", image: base64 },
            ],
          },
        ],
        schema: MoodAnalysisSchema,
      });
      // @ts-ignore
      setAnalysis(result);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to analyze image.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Voice Recording
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === "granted") {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording } = await Audio.Recording.createAsync({
           android: {
            extension: '.m4a',
            outputFormat: Audio.AndroidOutputFormat.MPEG_4,
            audioEncoder: Audio.AndroidAudioEncoder.AAC,
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
          },
          ios: {
            extension: '.wav',
            outputFormat: Audio.IOSOutputFormat.LINEARPCM,
            audioQuality: Audio.IOSAudioQuality.HIGH,
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {
            mimeType: 'audio/webm',
            bitsPerSecond: 128000,
          },
        });
        setRecording(recording);
        setIsRecording(true);
      }
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    
    if (uri) {
      // Send to STT
      transcribeAudio(uri);
    }
    setRecording(null);
  };

  const transcribeAudio = async (uri: string) => {
    setLoading(true);
    try {
      const formData = new FormData();
      // @ts-ignore
      formData.append("audio", {
        uri,
        name: "recording.m4a", // or .wav for iOS, but API handles it
        type: "audio/m4a",
      } as any);

      const response = await fetch("https://toolkit.rork.com/stt/transcribe/", {
        method: "POST",
        body: formData,
        headers: {
            // Let browser/engine set Content-Type for FormData
        },
      });

      const data = await response.json();
      if (data.text) {
        setContent(data.text);
        analyzeText(data.text);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to transcribe audio.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Text Analysis
  const analyzeText = async (text: string) => {
    setLoading(true);
    try {
      const result = await generateObject({
        messages: [
          {
            role: "user",
            content: `Analyze the mood of this text: "${text}".`,
          },
        ],
        schema: MoodAnalysisSchema,
      });
      // @ts-ignore
      setAnalysis(result);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to analyze text.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!analysis) return;

    addEntry({
      type,
      content: type === "photo" && imageUri ? imageUri : content,
      mood: analysis.emotion as EmotionType,
      moodColor: EMOTION_COLORS[analysis.emotion as EmotionType],
      confidence: analysis.confidence,
      location,
      transcript: type === "voice" ? content : undefined,
    });

    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft color={THEME.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>New {type === "photo" ? "Photo" : type === "voice" ? "Voice" : "Note"} Entry</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* PHOTO UI */}
          {type === "photo" && (
            <View style={styles.section}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
              ) : (
                <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                  <Text style={styles.photoButtonText}>Select Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* VOICE UI */}
          {type === "voice" && (
            <View style={styles.section}>
              <View style={styles.micContainer}>
                <TouchableOpacity
                  style={[styles.micButton, isRecording && styles.recordingMic]}
                  onPress={isRecording ? stopRecording : startRecording}
                >
                  {isRecording ? (
                    <StopCircle color="#fff" size={48} />
                  ) : (
                    <Mic color="#fff" size={48} />
                  )}
                </TouchableOpacity>
                <Text style={styles.recordingText}>
                  {isRecording ? "Recording... Tap to stop" : "Tap to record"}
                </Text>
              </View>
              {content ? (
                <View style={styles.transcriptBox}>
                  <Text style={styles.label}>Transcript:</Text>
                  <Text style={styles.text}>{content}</Text>
                </View>
              ) : null}
            </View>
          )}

          {/* TEXT UI */}
          {type === "text" && (
            <View style={styles.section}>
              <TextInput
                style={styles.input}
                multiline
                placeholder="How are you feeling today?"
                value={content}
                onChangeText={setContent}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={styles.analyzeButton}
                onPress={() => analyzeText(content)}
                disabled={!content.trim() || loading}
              >
                <Text style={styles.analyzeButtonText}>Analyze Mood</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* LOADING */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={THEME.primary} />
              <Text style={styles.loadingText}>Analyzing mood...</Text>
            </View>
          )}

          {/* RESULT */}
          {analysis && !loading && (
            <View style={styles.resultContainer}>
              <View
                style={[
                  styles.moodTag,
                  { backgroundColor: EMOTION_COLORS[analysis.emotion as EmotionType] },
                ]}
              >
                <Text style={styles.moodText}>{analysis.emotion}</Text>
              </View>
              <Text style={styles.reasonText}>{analysis.reason}</Text>
              <Text style={styles.suggestionText}>💡 {analysis.suggestion}</Text>
              
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Save color="#fff" size={20} />
                <Text style={styles.saveButtonText}>Save Entry</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: THEME.text,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 16,
    height: 150,
    fontSize: 16,
    color: THEME.text,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  analyzeButton: {
    backgroundColor: THEME.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  analyzeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  previewImage: {
    width: "100%",
    height: 300,
    borderRadius: 12,
    resizeMode: "cover",
  },
  photoButton: {
    backgroundColor: THEME.card,
    padding: 40,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: THEME.border,
    borderStyle: "dashed",
  },
  photoButtonText: {
    color: THEME.textSecondary,
    fontSize: 16,
  },
  micContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  recordingMic: {
    backgroundColor: "#ef4444",
  },
  recordingText: {
    fontSize: 16,
    color: THEME.textSecondary,
  },
  transcriptBox: {
    backgroundColor: THEME.card,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME.textSecondary,
    marginBottom: 8,
  },
  text: {
    fontSize: 16,
    color: THEME.text,
    lineHeight: 24,
  },
  loadingContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  loadingText: {
    marginTop: 12,
    color: THEME.textSecondary,
  },
  resultContainer: {
    backgroundColor: THEME.card,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  moodTag: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  moodText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  reasonText: {
    fontSize: 16,
    color: THEME.text,
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 24,
  },
  suggestionText: {
    fontSize: 14,
    color: THEME.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 20,
  },
  saveButton: {
    flexDirection: "row",
    backgroundColor: THEME.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: "center",
    gap: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
