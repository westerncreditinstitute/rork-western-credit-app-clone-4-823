import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
  Alert,
} from "react-native";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Lock, ArrowLeft, Shield, AlertTriangle, ShieldAlert } from "lucide-react-native";
import * as ScreenCapture from "expo-screen-capture";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

const convertToEmbedUrl = (url: string): string => {
  // Handle Prezi view URLs - use embed format for better compatibility
  if (url.includes("prezi.com/view/")) {
    const preziIdMatch = url.match(/prezi\.com\/view\/([a-zA-Z0-9_-]+)/);
    if (preziIdMatch && preziIdMatch[1]) {
      // Use embed format which works better for shared presentations
      return `https://prezi.com/p/embed/${preziIdMatch[1]}/`;
    }
  }
  // Handle Prezi /p/ URLs
  if (url.includes("prezi.com/p/") && !url.includes("/embed/")) {
    const preziIdMatch = url.match(/prezi\.com\/p\/([a-zA-Z0-9_-]+)/);
    if (preziIdMatch && preziIdMatch[1]) {
      return `https://prezi.com/p/embed/${preziIdMatch[1]}/`;
    }
  }
  // Handle Prezi /v/ URLs
  if (url.includes("prezi.com/v/") && !url.includes("/embed/")) {
    const preziIdMatch = url.match(/prezi\.com\/v\/([a-zA-Z0-9_-]+)/);
    if (preziIdMatch && preziIdMatch[1]) {
      return `https://prezi.com/p/embed/${preziIdMatch[1]}/`;
    }
  }
  // Handle Google Docs
  if (url.includes("docs.google.com") && !url.includes("/embed")) {
    return url.replace("/edit", "/preview").replace("/view", "/preview");
  }
  // Handle Canva
  if (url.includes("canva.com") && url.includes("/design/")) {
    return url.replace("/design/", "/embed/");
  }
  return url;
};

const isPreziUrl = (url: string): boolean => {
  return url.includes("prezi.com");
};

export default function ProtectedDocumentScreen() {
  const { url, title } = useLocalSearchParams<{ url: string; title: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isScreenCaptureProtected, setIsScreenCaptureProtected] = useState(false);
  
  const embedUrl = useMemo(() => convertToEmbedUrl(url || ""), [url]);

  // Prevent screen capture on native platforms
  useEffect(() => {
    if (Platform.OS === "web" || !isAuthenticated) return;

    let subscription: { remove: () => void } | null = null;

    const setupScreenProtection = async () => {
      try {
        // Prevent screen capture
        await ScreenCapture.preventScreenCaptureAsync();
        console.log("[ProtectedDocument] Screen capture prevention ENABLED");

        // Add screenshot listener
        subscription = ScreenCapture.addScreenshotListener(() => {
          console.log("[ProtectedDocument] Screenshot detected! Content is protected.");
          Alert.alert(
            "Screenshot Blocked",
            "This content is protected. Screenshots and screen recordings are not allowed.",
            [{ text: "OK" }]
          );
        });
      } catch (err) {
        console.log("[ProtectedDocument] Screen capture protection error:", err);
      }
    };

    setupScreenProtection();

    return () => {
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
      if (subscription) {
        subscription.remove();
      }
    };
  }, [isAuthenticated]);

  // Enable iOS app switcher blur protection on mount
  useEffect(() => {
    if (Platform.OS !== "ios" || !isAuthenticated) return;

    const enableAppSwitcherProtection = async () => {
      try {
        await ScreenCapture.enableAppSwitcherProtectionAsync(1.0);
        setIsScreenCaptureProtected(true);
        console.log("[ProtectedDocument] iOS app switcher blur protection ENABLED");
      } catch (err) {
        console.log("[ProtectedDocument] App switcher protection not available:", err);
      }
    };

    enableAppSwitcherProtection();

    return () => {
      ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => {});
    };
  }, [isAuthenticated]);

  // Additional protection check - verify protection is active
  useEffect(() => {
    if (Platform.OS === "web" || !isAuthenticated) return;

    const checkProtection = async () => {
      try {
        const isAvailable = await ScreenCapture.isAvailableAsync();
        if (isAvailable) {
          setIsScreenCaptureProtected(true);
          console.log("[ProtectedDocument] Screen capture protection is ACTIVE");
        }
      } catch (err) {
        console.log("[ProtectedDocument] Error checking screen capture availability:", err);
      }
    };

    checkProtection();
  }, [isAuthenticated]);

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleLogin = useCallback(() => {
    router.push("/register" as any);
  }, [router]);

  const injectedJavaScript = `
    (function() {
      // Disable text selection
      document.body.style.webkitUserSelect = 'none';
      document.body.style.userSelect = 'none';
      document.body.style.webkitTouchCallout = 'none';
      
      // Disable right-click context menu
      document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
      });
      
      // Disable copy events
      document.addEventListener('copy', function(e) {
        e.preventDefault();
        return false;
      });
      
      // Disable cut events
      document.addEventListener('cut', function(e) {
        e.preventDefault();
        return false;
      });
      
      // Disable drag events
      document.addEventListener('dragstart', function(e) {
        e.preventDefault();
        return false;
      });
      
      // Prevent keyboard shortcuts for copy
      document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C' || e.key === 'a' || e.key === 'A')) {
          e.preventDefault();
          return false;
        }
      });
      
      true;
    })();
  `;

  if (authLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Verifying access...</Text>
        </View>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleGoBack}
              activeOpacity={0.7}
            >
              <ArrowLeft color={Colors.text} size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Protected Document
            </Text>
            <View style={styles.headerRight} />
          </View>
        </SafeAreaView>

        <View style={styles.authRequiredContainer}>
          <View style={styles.authIconContainer}>
            <Lock color={Colors.primary} size={48} />
          </View>
          <Text style={styles.authRequiredTitle}>Login Required</Text>
          <Text style={styles.authRequiredSubtitle}>
            You must be logged in to view this protected document.
          </Text>
          <View style={styles.securityNote}>
            <Shield color={Colors.secondary} size={18} />
            <Text style={styles.securityNoteText}>
              This content is protected and only available to enrolled students.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>Login / Register</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleGoBack}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!url) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleGoBack}
              activeOpacity={0.7}
            >
              <ArrowLeft color={Colors.text} size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Document
            </Text>
            <View style={styles.headerRight} />
          </View>
        </SafeAreaView>
        <View style={styles.errorContainer}>
          <AlertTriangle color={Colors.error} size={48} />
          <Text style={styles.errorTitle}>Document Not Found</Text>
          <Text style={styles.errorText}>
            The document URL is missing or invalid.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleGoBack}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isPrezi = isPreziUrl(url || "");

  const WebContent = Platform.OS === "web" ? (
    <View style={styles.webViewContainer}>
      <iframe
        src={embedUrl}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
        } as React.CSSProperties}
        allowFullScreen
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        allow="autoplay; fullscreen"
      />
    </View>
  ) : (
    <WebView
      source={{ uri: embedUrl }}
      style={styles.webView}
      onLoadStart={() => setIsLoading(true)}
      onLoadEnd={() => setIsLoading(false)}
      onError={() => {
        setIsLoading(false);
        setHasError(true);
      }}
      onHttpError={(syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        console.log("HTTP Error:", nativeEvent.statusCode, nativeEvent.description);
        if (nativeEvent.statusCode === 403 || nativeEvent.statusCode === 401) {
          setHasError(true);
        }
      }}
      injectedJavaScript={injectedJavaScript}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      allowsFullscreenVideo={true}
      allowsInlineMediaPlayback={true}
      mediaPlaybackRequiresUserAction={false}
      scalesPageToFit={true}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={true}
      bounces={false}
      allowsLinkPreview={false}
      dataDetectorTypes="none"
      textInteractionEnabled={false}
      mixedContentMode="compatibility"
      thirdPartyCookiesEnabled={true}
      sharedCookiesEnabled={true}
      userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
    />
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />
      
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleGoBack}
            activeOpacity={0.7}
          >
            <ArrowLeft color={Colors.text} size={24} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title || "Document"}
            </Text>
            <View style={styles.protectedBadge}>
              <Lock color={Colors.surface} size={10} />
              <Text style={styles.protectedBadgeText}>Protected</Text>
            </View>
          </View>
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>

      <View style={styles.contentContainer}>
        {Platform.OS !== "web" && isScreenCaptureProtected && (
          <View style={styles.protectionBadge}>
            <ShieldAlert color={Colors.surface} size={12} />
            <Text style={styles.protectionBadgeText}>Protected</Text>
          </View>
        )}
        {isLoading && Platform.OS !== "web" && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading document...</Text>
          </View>
        )}

        {hasError ? (
          <View style={styles.errorContainer}>
            <AlertTriangle color={Colors.error} size={48} />
            <Text style={styles.errorTitle}>Failed to Load</Text>
            <Text style={styles.errorText}>
              {isPrezi 
                ? "Unable to load the Prezi presentation. This may be due to the presentation's privacy settings on Prezi.com. Please ensure the presentation is set to 'Public' or 'Anyone with the link' in Prezi's sharing settings."
                : "Unable to load the document. Please try again later."}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setHasError(false);
                setIsLoading(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleGoBack}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          WebContent
        )}
      </View>

      <SafeAreaView style={styles.footerSafeArea} edges={["bottom"]}>
        <View style={styles.footer}>
          <View style={styles.footerContent}>
            {Platform.OS !== "web" ? (
              <>
                <ShieldAlert color={Colors.secondary} size={14} />
                <Text style={styles.footerTextActive}>
                  Screen recording protection active
                </Text>
              </>
            ) : (
              <>
                <Shield color={Colors.secondary} size={14} />
                <Text style={styles.footerText}>
                  This document is protected. Copying and sharing are disabled.
                </Text>
              </>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    backgroundColor: Colors.surface,
  },
  footerSafeArea: {
    backgroundColor: Colors.surfaceAlt,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  headerRight: {
    width: 40,
  },
  protectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  protectedBadgeText: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: Colors.surface,
    textTransform: "uppercase",
  },
  contentContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  webView: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    zIndex: 10,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.text,
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.surface,
  },
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
  },
  authRequiredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  authIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  authRequiredTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 8,
  },
  authRequiredSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.secondary + "15",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  securityNoteText: {
    flex: 1,
    fontSize: 13,
    color: Colors.secondary,
    lineHeight: 18,
  },
  loginButton: {
    width: "100%",
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.surface,
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  footer: {
    backgroundColor: Colors.surfaceAlt,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  footerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  footerTextActive: {
    fontSize: 12,
    color: Colors.secondary,
    fontWeight: "600" as const,
  },
  protectionBadge: {
    position: "absolute" as const,
    top: 8,
    left: 8,
    zIndex: 10,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: Colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  protectionBadgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.surface,
    textTransform: "uppercase" as const,
  },
});
