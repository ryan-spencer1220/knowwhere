import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Texture } from "@/components/ui/kit";
import { LEGAL_EFFECTIVE_DATE, type LegalDoc } from "@/constants/legal";
import { useTheme, useThemedStyles, type Palette } from "@/lib/theme";

export function LegalScreen({ doc }: { doc: LegalDoc }) {
  const router = useRouter();
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.root}>
      <Texture />
      <SafeAreaView edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={Star.ink} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {doc.title}
          </Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.effective}>Effective {LEGAL_EFFECTIVE_DATE}</Text>
        <Text style={styles.intro}>{doc.intro}</Text>
        {doc.sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.heading}>{section.heading}</Text>
            {section.body.map((para, i) => (
              <Text key={i} style={styles.body}>
                {para}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const makeStyles = (Star: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: Star.base },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    pressed: { opacity: 0.6 },
    headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "900", color: Star.ink, letterSpacing: -0.3 },
    scroll: { padding: 20, paddingBottom: 40, gap: 14 },
    effective: { fontSize: 12, fontWeight: "700", color: Star.textMuted, letterSpacing: 0.4, textTransform: "uppercase" },
    intro: { fontSize: 15, fontWeight: "500", color: Star.text, lineHeight: 22 },
    section: { gap: 6 },
    heading: { fontSize: 17, fontWeight: "900", color: Star.ink, letterSpacing: -0.3, marginTop: 4 },
    body: { fontSize: 14, fontWeight: "500", color: Star.text, lineHeight: 21 },
  });
