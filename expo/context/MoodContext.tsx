import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { EmotionType } from "@/constants/theme";

export type MoodEntry = {
  id: string;
  type: "text" | "voice" | "photo";
  title?: string;
  content: string;
  mood: EmotionType;
  moodColor: string;
  confidence: number;
  timestamp: number;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  transcript?: string;
  keywords?: string[];
  tags?: string[];
  pinned?: boolean;
};

const STORAGE_KEY = "moodprint_entries";

export const [MoodProvider, useMood] = createContextHook(() => {
  const queryClient = useQueryClient();

  const [entries, setEntries] = useState<MoodEntry[]>([]);

  const { data: queriedEntries, isLoading } = useQuery({
    queryKey: ["entries"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as MoodEntry[]) : [];
    },
  });

  useEffect(() => {
    if (queriedEntries) {
      setEntries(queriedEntries);
    }
  }, [queriedEntries]);

  // Save entries to AsyncStorage
  const saveMutation = useMutation({
    mutationFn: async (newEntries: MoodEntry[]) => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
      return newEntries;
    },
    onSuccess: (newEntries) => {
      queryClient.setQueryData(["entries"], newEntries);
    },
  });

  const addEntry = (entry: Omit<MoodEntry, "id" | "timestamp">) => {
    const newEntry: MoodEntry = {
      ...entry,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
    };
    const updatedEntries = [newEntry, ...entries];
    saveMutation.mutate(updatedEntries);
  };

  const updateEntry = (id: string, updates: Partial<MoodEntry>) => {
    const updatedEntries = entries.map((e) => 
      e.id === id ? { ...e, ...updates } : e
    );
    saveMutation.mutate(updatedEntries);
  };

  const deleteEntry = (id: string) => {
    const updatedEntries = entries.filter((e) => e.id !== id);
    saveMutation.mutate(updatedEntries);
  };

  const deleteMultipleEntries = (ids: string[]) => {
    const updatedEntries = entries.filter((e) => !ids.includes(e.id));
    saveMutation.mutate(updatedEntries);
  };

  const togglePinEntry = (id: string) => {
    const updatedEntries = entries.map((e) => 
      e.id === id ? { ...e, pinned: !e.pinned } : e
    );
    saveMutation.mutate(updatedEntries);
  };

  const clearEntries = () => {
    saveMutation.mutate([]);
  };

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.timestamp - a.timestamp;
    });
  }, [entries]);

  const todayEntries = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return sortedEntries.filter((e) => e.timestamp >= startOfDay.getTime());
  }, [sortedEntries]);

  const recentMood = useMemo(() => {
    if (sortedEntries.length === 0) return null;
    return sortedEntries[0].mood;
  }, [sortedEntries]);

  const moodScore = useMemo(() => {
    if (todayEntries.length === 0) return 0;
    let total = 0;
    todayEntries.forEach((e) => {
      switch (e.mood) {
        case "Happy":
        case "Excited":
          total += 90;
          break;
        case "Calm":
          total += 75;
          break;
        case "Stressed":
          total += 30;
          break;
        case "Negative":
          total += 10;
          break;
      }
    });
    return Math.round(total / todayEntries.length);
  }, [todayEntries]);

  const getEntriesInRange = useMemo(
    () => (startDate: Date, endDate: Date) => {
      return sortedEntries.filter(
        (e) =>
          e.timestamp >= startDate.getTime() &&
          e.timestamp <= endDate.getTime()
      );
    },
    [sortedEntries]
  );

  return {
    entries: sortedEntries,
    isLoading,
    addEntry,
    updateEntry,
    deleteEntry,
    deleteMultipleEntries,
    togglePinEntry,
    clearEntries,
    todayEntries,
    recentMood,
    moodScore,
    getEntriesInRange,
  };
});
