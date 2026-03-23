import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Sparkles } from "lucide-react-native";
import WebView from "react-native-webview";

import Colors from "@/constants/colors";
import { LIVEAVATAR_EMBED_URL } from "@/constants/liveavatar-embed";

export default function InteractiveCoachScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft color={Colors.surface} size={24} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Sparkles color={Colors.accent} size={20} />
            <Text style={styles.headerText}>AI Credit Repair Coach</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.avatarContainer}>
          {Platform.OS === 'web' ? (
            <iframe
              src={LIVEAVATAR_EMBED_URL}
              style={{
                flex: 1,
                width: '100%',
                height: '100%',
                border: 'none',
                backgroundColor: '#000',
              }}
              allow="camera; microphone; autoplay; fullscreen"
              allowFullScreen
            />
          ) : (
            <WebView
              source={{ uri: LIVEAVATAR_EMBED_URL }}
              style={styles.webview}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              allowsFullscreenVideo={true}
              originWhitelist={["*"]}
              mediaCapturePermissionGrantType="grant"
              allowsProtectedMedia={true}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.log("WebView error: ", nativeEvent);
              }}
              onHttpError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.log("WebView HTTP error: ", nativeEvent.statusCode);
              }}
            />
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerText: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.surface,
  },
  avatarContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: "#000",
  },
});
