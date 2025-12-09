import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, {
  Circle,
  Marker,
  PROVIDER_DEFAULT,
  Region,
} from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import {
  MapPin,
  Filter,
  X,
  Plus,
  FileText,
  Mic,
  Image as ImageIcon,
  Layers,
  Target,
} from "lucide-react-native";
import { router } from "expo-router";

import { EMOTION_COLORS, EmotionType, THEME } from "@/constants/theme";
import { MoodEntry, useMood } from "@/context/MoodContext";

type LocationCluster = {
  id: string;
  center: { latitude: number; longitude: number };
  entries: MoodEntry[];
  dominantEmotion: EmotionType;
  avgMoodScore: number;
};

type FilterState = {
  emotions: EmotionType[];
  dateRange: "all" | "today" | "week" | "month";
};

const BOTTOM_SHEET_MIN_HEIGHT = 0;
const BOTTOM_SHEET_MID_HEIGHT = 200;
const BOTTOM_SHEET_MAX_HEIGHT = Dimensions.get("window").height * 0.7;

export default function MapScreen() {
  const { entries } = useMood();
  const mapRef = useRef<MapView>(null);
  const [selectedCluster, setSelectedCluster] = useState<LocationCluster | null>(
    null
  );
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    emotions: [],
    dateRange: "all",
  });
  const [currentLocation, setCurrentLocation] =
    useState<Location.LocationObject | null>(null);
  const [locationPermission, setLocationPermission] = useState<
    "loading" | "granted" | "denied" | "undetermined"
  >("loading");
  const bottomSheetY = useRef(
    new Animated.Value(BOTTOM_SHEET_MIN_HEIGHT)
  ).current;
  const [bottomSheetState, setBottomSheetState] = useState<
    "closed" | "mid" | "open"
  >("closed");

  useEffect(() => {
    (async () => {
      try {
        const { status: existingStatus } =
          await Location.getForegroundPermissionsAsync();
        
        if (existingStatus === "granted") {
          setLocationPermission("granted");
          const location = await Location.getCurrentPositionAsync({});
          setCurrentLocation(location);
        } else {
          setLocationPermission("undetermined");
        }
      } catch (error) {
        console.error("Error checking location permissions:", error);
        setLocationPermission("undetermined");
      }
    })();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === "granted") {
        setLocationPermission("granted");
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation(location);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          );
        }
      } else {
        setLocationPermission("denied");
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Error
          );
        }
      }
    } catch (error) {
      console.error("Error requesting location permission:", error);
      setLocationPermission("denied");
    }
  };

  const locationEntries = useMemo(() => {
    let filtered = entries.filter(
      (e) => e.location && e.location.latitude && e.location.longitude
    );

    if (filters.emotions.length > 0) {
      filtered = filtered.filter((e) => filters.emotions.includes(e.mood));
    }

    if (filters.dateRange !== "all") {
      const now = Date.now();
      const ranges = {
        today: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
      };
      const cutoff = now - ranges[filters.dateRange];
      filtered = filtered.filter((e) => e.timestamp >= cutoff);
    }

    return filtered;
  }, [entries, filters]);

  const clusters = useMemo(() => {
    const clusterMap = new Map<string, MoodEntry[]>();
    const CLUSTER_DISTANCE = 0.01;

    locationEntries.forEach((entry) => {
      const lat = entry.location!.latitude;
      const lng = entry.location!.longitude;
      const key = `${Math.floor(lat / CLUSTER_DISTANCE)}_${Math.floor(
        lng / CLUSTER_DISTANCE
      )}`;

      if (!clusterMap.has(key)) {
        clusterMap.set(key, []);
      }
      clusterMap.get(key)!.push(entry);
    });

    const result: LocationCluster[] = [];
    clusterMap.forEach((clusterEntries, key) => {
      const emotionCounts = new Map<EmotionType, number>();
      let totalScore = 0;
      let avgLat = 0;
      let avgLng = 0;

      clusterEntries.forEach((e) => {
        emotionCounts.set(e.mood, (emotionCounts.get(e.mood) || 0) + 1);
        const score =
          e.mood === "Happy" || e.mood === "Excited"
            ? 90
            : e.mood === "Calm"
            ? 75
            : e.mood === "Stressed"
            ? 30
            : 10;
        totalScore += score;
        avgLat += e.location!.latitude;
        avgLng += e.location!.longitude;
      });

      avgLat /= clusterEntries.length;
      avgLng /= clusterEntries.length;

      let dominantEmotion: EmotionType = "Calm";
      let maxCount = 0;
      emotionCounts.forEach((count, emotion) => {
        if (count > maxCount) {
          maxCount = count;
          dominantEmotion = emotion;
        }
      });

      result.push({
        id: key,
        center: { latitude: avgLat, longitude: avgLng },
        entries: clusterEntries,
        dominantEmotion,
        avgMoodScore: Math.round(totalScore / clusterEntries.length),
      });
    });

    return result;
  }, [locationEntries]);

  const initialRegion: Region = useMemo(() => {
    if (currentLocation) {
      return {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    if (locationEntries.length > 0) {
      return {
        latitude: locationEntries[0].location!.latitude,
        longitude: locationEntries[0].location!.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    return {
      latitude: 37.78825,
      longitude: -122.4324,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    };
  }, [currentLocation, locationEntries]);

  const handleClusterPress = (cluster: LocationCluster) => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setSelectedCluster(cluster);
    animateBottomSheet("mid");
  };

  const animateBottomSheet = (state: "closed" | "mid" | "open") => {
    const toValue =
      state === "closed"
        ? BOTTOM_SHEET_MIN_HEIGHT
        : state === "mid"
        ? BOTTOM_SHEET_MID_HEIGHT
        : BOTTOM_SHEET_MAX_HEIGHT;

    Animated.spring(bottomSheetY, {
      toValue,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
    setBottomSheetState(state);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const newY = Math.max(
          BOTTOM_SHEET_MIN_HEIGHT,
          Math.min(
            BOTTOM_SHEET_MAX_HEIGHT,
            (bottomSheetState === "closed"
              ? BOTTOM_SHEET_MIN_HEIGHT
              : bottomSheetState === "mid"
              ? BOTTOM_SHEET_MID_HEIGHT
              : BOTTOM_SHEET_MAX_HEIGHT) - gestureState.dy
          )
        );
        bottomSheetY.setValue(newY);
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentY =
          bottomSheetState === "closed"
            ? BOTTOM_SHEET_MIN_HEIGHT
            : bottomSheetState === "mid"
            ? BOTTOM_SHEET_MID_HEIGHT
            : BOTTOM_SHEET_MAX_HEIGHT;
        const newY = currentY - gestureState.dy;

        if (gestureState.dy > 50) {
          if (bottomSheetState === "open") animateBottomSheet("mid");
          else if (bottomSheetState === "mid") animateBottomSheet("closed");
        } else if (gestureState.dy < -50) {
          if (bottomSheetState === "closed") animateBottomSheet("mid");
          else if (bottomSheetState === "mid") animateBottomSheet("open");
        } else {
          if (newY < BOTTOM_SHEET_MID_HEIGHT / 2) {
            animateBottomSheet("closed");
          } else if (newY < (BOTTOM_SHEET_MID_HEIGHT + BOTTOM_SHEET_MAX_HEIGHT) / 2) {
            animateBottomSheet("mid");
          } else {
            animateBottomSheet("open");
          }
        }
      },
    })
  ).current;

  const recenterMap = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  };

  const toggleFilter = (emotion: EmotionType) => {
    setFilters((prev) => {
      const emotions = prev.emotions.includes(emotion)
        ? prev.emotions.filter((e) => e !== emotion)
        : [...prev.emotions, emotion];
      return { ...prev, emotions };
    });
  };

  if (Platform.OS === "web") {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.center}>
            <MapPin size={48} color={THEME.textSecondary} />
            <Text style={styles.message}>
              Map view is optimized for mobile devices
            </Text>
            <Text style={styles.subMessage}>
              {locationEntries.length} locations tracked
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (locationPermission === "loading") {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.center}>
            <MapPin size={48} color={THEME.textSecondary} />
            <Text style={styles.message}>Loading map...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (locationPermission === "undetermined" || locationPermission === "denied") {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.emptyState}>
            <View style={styles.permissionIcon}>
              <MapPin size={64} color={THEME.primary} />
            </View>
            <Text style={styles.emptyTitle}>
              {locationPermission === "undetermined"
                ? "Enable Location Services"
                : "Location Access Denied"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {locationPermission === "undetermined"
                ? "Allow MoodPrint to access your location to see your emotional journey on the map and track where your moods occur."
                : "Please enable location permissions in Settings to view your emotional map and track memories by location."}
            </Text>
            {locationPermission === "undetermined" ? (
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={requestLocationPermission}
              >
                <Target size={20} color="#fff" />
                <Text style={styles.permissionButtonText}>Enable Location</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={() => {
                  if (Platform.OS === "ios") {
                    Location.requestForegroundPermissionsAsync();
                  }
                }}
              >
                <Text style={styles.permissionButtonText}>Open Settings</Text>
              </TouchableOpacity>
            )}
            {locationEntries.length > 0 && (
              <Text style={styles.permissionNote}>
                You have {locationEntries.length} location-tagged entries
              </Text>
            )}
          </View>
        </SafeAreaView>
      </View>
    );
  }



  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        provider={PROVIDER_DEFAULT}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {showHeatmap &&
          clusters.map((cluster) => (
            <Circle
              key={`heat-${cluster.id}`}
              center={cluster.center}
              radius={200}
              fillColor={EMOTION_COLORS[cluster.dominantEmotion] + "40"}
              strokeColor={EMOTION_COLORS[cluster.dominantEmotion] + "80"}
              strokeWidth={2}
            />
          ))}

        {clusters.map((cluster) => (
          <Marker
            key={cluster.id}
            coordinate={cluster.center}
            onPress={() => handleClusterPress(cluster)}
          >
            <View
              style={[
                styles.markerContainer,
                {
                  borderColor: EMOTION_COLORS[cluster.dominantEmotion],
                },
              ]}
            >
              <View
                style={[
                  styles.markerInner,
                  {
                    backgroundColor: EMOTION_COLORS[cluster.dominantEmotion],
                  },
                ]}
              >
                <Plus size={18} color="#fff" strokeWidth={3} />
              </View>
              {cluster.entries.length > 1 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{cluster.entries.length}</Text>
                </View>
              )}
            </View>
          </Marker>
        ))}
      </MapView>

      {locationEntries.length === 0 && (
        <View style={styles.overlayMessage}>
          <View style={styles.messageCard}>
            <MapPin size={32} color={THEME.textSecondary} />
            <Text style={styles.overlayTitle}>Your Emotional Map is Empty</Text>
            <Text style={styles.overlaySubtitle}>
              Capture a mood at your favorite spot to start building your
              emotional heatmap
            </Text>
            <TouchableOpacity
              style={styles.overlayButton}
              onPress={() => router.push("/new-entry")}
            >
              <Plus size={18} color="#fff" />
              <Text style={styles.overlayButtonText}>Add First Entry</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.topControls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setShowFilter(true)}
        >
          <Filter size={20} color={THEME.text} />
          {filters.emotions.length > 0 && <View style={styles.filterBadge} />}
        </TouchableOpacity>
      </View>

      <View style={styles.bottomControls}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            showHeatmap && styles.controlButtonActive,
          ]}
          onPress={() => {
            if (Platform.OS !== "web") Haptics.selectionAsync();
            setShowHeatmap(!showHeatmap);
          }}
        >
          <Layers
            size={20}
            color={showHeatmap ? THEME.primary : THEME.text}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={recenterMap}>
          <Target size={20} color={THEME.text} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/new-entry")}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>

      {selectedCluster && bottomSheetState !== "closed" && (
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              height: bottomSheetY,
            },
          ]}
        >
          <View {...panResponder.panHandlers} style={styles.bottomSheetHandle}>
            <View style={styles.handle} />
          </View>

          <ScrollView
            style={styles.bottomSheetContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.bottomSheetHeader}>
              <View style={styles.locationInfo}>
                <View
                  style={[
                    styles.emotionDot,
                    {
                      backgroundColor:
                        EMOTION_COLORS[selectedCluster.dominantEmotion],
                    },
                  ]}
                />
                <View>
                  <Text style={styles.locationTitle}>
                    {selectedCluster.entries[0].location?.address ||
                      "Unnamed Location"}
                  </Text>
                  <Text style={styles.locationSubtitle}>
                    {selectedCluster.entries.length} entries •{" "}
                    {selectedCluster.dominantEmotion} • Score{" "}
                    {selectedCluster.avgMoodScore}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.selectionAsync();
                  animateBottomSheet("closed");
                  setSelectedCluster(null);
                }}
              >
                <X size={24} color={THEME.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.entriesList}>
              {selectedCluster.entries.map((entry) => (
                <View key={entry.id} style={styles.entryCard}>
                  <View
                    style={[
                      styles.entryColorBar,
                      { backgroundColor: entry.moodColor },
                    ]}
                  />
                  <View style={styles.entryContent}>
                    <View style={styles.entryHeader}>
                      {entry.type === "text" ? (
                        <FileText size={16} color={THEME.textSecondary} />
                      ) : entry.type === "voice" ? (
                        <Mic size={16} color={THEME.textSecondary} />
                      ) : (
                        <ImageIcon size={16} color={THEME.textSecondary} />
                      )}
                      <Text style={styles.entryMood}>{entry.mood}</Text>
                      <Text style={styles.entryTime}>
                        {new Date(entry.timestamp).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.entryText} numberOfLines={2}>
                      {entry.type === "voice"
                        ? entry.transcript || "Voice note"
                        : entry.type === "photo"
                        ? "Photo entry"
                        : entry.content}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </Animated.View>
      )}

      <Modal
        visible={showFilter}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilter(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.filterModalContainer}>
            <View style={styles.filterModal}>
              <View style={styles.filterHeader}>
                <Text style={styles.filterTitle}>Filter Your Emotions</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowFilter(false)}
                >
                  <X size={24} color={THEME.text} />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.filterScrollView}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>SELECT EMOTIONS</Text>
                  <Text style={styles.filterSectionDescription}>
                    Choose emotions to filter your map entries
                  </Text>
                  <View style={styles.emotionChips}>
                    {Object.entries(EMOTION_COLORS).map(([emotion, color]) => {
                      const isSelected = filters.emotions.includes(
                        emotion as EmotionType
                      );
                      return (
                        <TouchableOpacity
                          key={emotion}
                          style={[
                            styles.emotionChip,
                            isSelected && styles.emotionChipSelected,
                            isSelected && { backgroundColor: color + "30" },
                            isSelected && { borderColor: color },
                          ]}
                          onPress={() => toggleFilter(emotion as EmotionType)}
                        >
                          <View
                            style={[styles.emotionChipDot, { backgroundColor: color }]}
                          />
                          <Text
                            style={[
                              styles.emotionChipText,
                              isSelected && styles.emotionChipTextSelected,
                              isSelected && { color: color },
                            ]}
                          >
                            {emotion}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>TIME PERIOD</Text>
                  <Text style={styles.filterSectionDescription}>
                    Filter entries by date range
                  </Text>
                  <View style={styles.dateRanges}>
                    {[
                      { label: "All Time", value: "all" },
                      { label: "Today", value: "today" },
                      { label: "Last 7 Days", value: "week" },
                      { label: "Last 30 Days", value: "month" },
                    ].map((range) => (
                      <TouchableOpacity
                        key={range.value}
                        style={[
                          styles.dateRangeButton,
                          filters.dateRange === range.value &&
                            styles.dateRangeButtonActive,
                        ]}
                        onPress={() =>
                          setFilters((prev) => ({
                            ...prev,
                            dateRange: range.value as FilterState["dateRange"],
                          }))
                        }
                      >
                        <Text
                          style={[
                            styles.dateRangeText,
                            filters.dateRange === range.value &&
                              styles.dateRangeTextActive,
                          ]}
                        >
                          {range.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>

              <View style={styles.filterActions}>
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={() =>
                    setFilters({ emotions: [], dateRange: "all" })
                  }
                >
                  <Text style={styles.resetButtonText}>Reset All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={() => setShowFilter(false)}
                >
                  <Text style={styles.applyButtonText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  message: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: THEME.text,
    marginTop: 16,
    textAlign: "center",
  },
  subMessage: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: THEME.text,
    marginTop: 24,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    color: THEME.textSecondary,
    marginTop: 12,
    textAlign: "center",
    lineHeight: 24,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600" as const,
  },
  permissionIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: THEME.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  permissionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.primary,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 28,
    gap: 10,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700" as const,
  },
  permissionNote: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 20,
    textAlign: "center",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  markerContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  markerInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  markerText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700" as const,
  },
  badgeContainer: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ff4444",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700" as const,
  },
  topControls: {
    position: "absolute",
    top: 60,
    right: 16,
    gap: 12,
  },
  bottomControls: {
    position: "absolute",
    bottom: 100,
    right: 16,
    gap: 12,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  controlButtonActive: {
    backgroundColor: THEME.primary + "20",
  },
  filterBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.primary,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 16,
  },
  bottomSheetHandle: {
    paddingVertical: 12,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.border,
  },
  bottomSheetContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  bottomSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  locationInfo: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  emotionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: THEME.text,
  },
  locationSubtitle: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 4,
  },
  entriesList: {
    gap: 12,
    paddingBottom: 24,
  },
  entryCard: {
    flexDirection: "row",
    backgroundColor: THEME.background,
    borderRadius: 12,
    overflow: "hidden",
  },
  entryColorBar: {
    width: 4,
  },
  entryContent: {
    flex: 1,
    padding: 12,
  },
  entryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  entryMood: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: THEME.text,
  },
  entryTime: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginLeft: "auto",
  },
  entryText: {
    fontSize: 14,
    color: THEME.textSecondary,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
  },
  filterModalContainer: {
    flex: 1,
  },
  filterModal: {
    flex: 1,
    backgroundColor: THEME.background,
    paddingHorizontal: 20,
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  filterTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: THEME.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.card,
    justifyContent: "center",
    alignItems: "center",
  },
  filterScrollView: {
    flex: 1,
  },
  filterSection: {
    marginTop: 28,
  },
  filterSectionTitle: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: THEME.textSecondary,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  filterSectionDescription: {
    fontSize: 14,
    color: THEME.textTertiary,
    marginBottom: 16,
    lineHeight: 20,
  },
  emotionChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  emotionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: THEME.border,
    backgroundColor: THEME.card,
    gap: 8,
  },
  emotionChipSelected: {
    borderWidth: 2,
  },
  emotionChipDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  emotionChipText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: THEME.textSecondary,
  },
  emotionChipTextSelected: {
    fontWeight: "700" as const,
  },
  dateRanges: {
    gap: 10,
  },
  dateRangeButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: THEME.border,
    backgroundColor: THEME.card,
  },
  dateRangeButtonActive: {
    borderColor: THEME.primary,
    backgroundColor: THEME.primary + "15",
  },
  dateRangeText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: THEME.textSecondary,
  },
  dateRangeTextActive: {
    color: THEME.primary,
    fontWeight: "700" as const,
  },
  filterActions: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 20,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: THEME.border,
    backgroundColor: THEME.card,
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: THEME.text,
  },
  applyButton: {
    flex: 1.5,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: THEME.primary,
    alignItems: "center",
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#fff",
  },
  overlayMessage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    pointerEvents: "box-none",
  },
  messageCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxWidth: 320,
    pointerEvents: "auto",
  },
  overlayTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: THEME.text,
    marginTop: 16,
    textAlign: "center",
  },
  overlaySubtitle: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  overlayButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  overlayButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600" as const,
  },
});
