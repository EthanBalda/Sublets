import { useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Props {
  photos: string[];
  height: number;
  showIndicator?: boolean;
  /** Show story-style progress bars at the top instead of the "1/N" pill. */
  showBars?: boolean;
  fallbackLabel?: string;
  width?: number;
}

export default function ListingPhotoCarousel({
  photos,
  height,
  showIndicator = true,
  showBars = false,
  fallbackLabel = "No photo",
  width,
}: Props) {
  const [index, setIndex] = useState(0);
  const [erroredIndices, setErroredIndices] = useState<Set<number>>(new Set());

  const w = width ?? SCREEN_WIDTH;
  const sorted = photos;
  const hasPhoto = sorted.length > 0 && !erroredIndices.has(index);

  function markError(i: number) {
    setErroredIndices((prev) => new Set(prev).add(i));
  }

  function prev() {
    setIndex((i) => Math.max(0, i - 1));
  }

  function next() {
    setIndex((i) => Math.min(sorted.length - 1, i + 1));
  }

  return (
    <View style={{ width: w, height }}>
      {hasPhoto ? (
        <Image
          source={{ uri: sorted[index] }}
          style={{ width: w, height }}
          contentFit="cover"
          onError={() => markError(index)}
        />
      ) : (
        <View style={[styles.placeholder, { width: w, height }]}>
          <Text style={styles.placeholderText}>{fallbackLabel}</Text>
        </View>
      )}

      {sorted.length > 1 && (
        <>
          {showBars ? (
            <View style={styles.bars} pointerEvents="none">
              {sorted.map((_, i) => (
                <View
                  key={i}
                  style={[styles.bar, i === index && styles.barActive]}
                />
              ))}
            </View>
          ) : showIndicator ? (
            <View style={styles.indicator} pointerEvents="none">
              <Text style={styles.indicatorText}>
                {index + 1} / {sorted.length}
              </Text>
            </View>
          ) : null}

          <Pressable
            style={[styles.zone, styles.zoneLeft]}
            onPress={prev}
            hitSlop={8}
          />
          <Pressable
            style={[styles.zone, styles.zoneRight]}
            onPress={next}
            hitSlop={8}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: "#e8ecef",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: { color: "#aaa", fontSize: 15 },
  zone: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "33%",
  },
  zoneLeft: { left: 0 },
  zoneRight: { right: 0 },
  indicator: {
    position: "absolute",
    bottom: 10,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  indicatorText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  // Story-style progress bars
  bars: {
    position: "absolute",
    top: 10,
    left: 12,
    right: 12,
    flexDirection: "row",
    gap: 4,
  },
  bar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  barActive: {
    backgroundColor: "rgba(255,255,255,0.95)",
  },
});
