import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react-native";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import Colors from "@/constants/colors";
import { ADMIN_SESSION_KEY } from "@/types/admin";

interface AdminLoginScreenProps {
  onLoginSuccess: () => void;
}

const hashCredential = async (value: string): Promise<string> => {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    value
  );
  return digest;
};

const validateCredentials = async (email: string, passcode: string): Promise<boolean> => {
  const validEmail = "admin@westerncreditinstitute.com";
  const validPasscode = "@Credit2012";
  return email.toLowerCase().trim() === validEmail.toLowerCase() && passcode === validPasscode;
};

export default function AdminLoginScreen({ onLoginSuccess }: AdminLoginScreenProps) {
  const [loginEmail, setLoginEmail] = useState<string>("");
  const [loginPasscode, setLoginPasscode] = useState<string>("");
  const [showPasscode, setShowPasscode] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>("");
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const handleLogin = async () => {
    setLoginError("");
    setIsLoggingIn(true);

    try {
      const isValid = await validateCredentials(loginEmail, loginPasscode);
      
      if (isValid) {
        const sessionToken = await hashCredential("admin_authenticated_session");
        await SecureStore.setItemAsync(ADMIN_SESSION_KEY, sessionToken);
        onLoginSuccess();
        setLoginEmail("");
        setLoginPasscode("");
      } else {
        setLoginError("Invalid email or passcode. Please try again.");
      }
    } catch (error) {
      console.log("Login error:", error);
      setLoginError("An error occurred. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.loginContainer}
      >
        <View style={styles.loginContent}>
          <View style={styles.loginHeader}>
            <View style={styles.lockIconContainer}>
              <Shield color={Colors.white} size={40} />
            </View>
            <Text style={styles.loginTitle}>Admin Access</Text>
            <Text style={styles.loginSubtitle}>Enter your credentials to access the Content Manager</Text>
          </View>

          <View style={styles.loginForm}>
            {loginError ? (
              <View style={styles.errorBanner}>
                <AlertCircle color={Colors.error} size={18} />
                <Text style={styles.errorBannerText}>{loginError}</Text>
              </View>
            ) : null}

            <View style={styles.loginInputGroup}>
              <Text style={styles.loginLabel}>Email Address</Text>
              <View style={styles.loginInputWrapper}>
                <Mail color={Colors.textLight} size={20} style={styles.loginInputIcon} />
                <TextInput
                  style={styles.loginInput}
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  placeholder="admin@example.com"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                />
              </View>
            </View>

            <View style={styles.loginInputGroup}>
              <Text style={styles.loginLabel}>Passcode</Text>
              <View style={styles.loginInputWrapper}>
                <Lock color={Colors.textLight} size={20} style={styles.loginInputIcon} />
                <TextInput
                  style={styles.loginInput}
                  value={loginPasscode}
                  onChangeText={setLoginPasscode}
                  placeholder="Enter passcode"
                  placeholderTextColor={Colors.textLight}
                  secureTextEntry={!showPasscode}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.showPasscodeButton}
                  onPress={() => setShowPasscode(!showPasscode)}
                >
                  {showPasscode ? (
                    <EyeOff color={Colors.textLight} size={20} />
                  ) : (
                    <Eye color={Colors.textLight} size={20} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.loginButton,
                (!loginEmail || !loginPasscode || isLoggingIn) && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={!loginEmail || !loginPasscode || isLoggingIn}
            >
              {isLoggingIn ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Lock color={Colors.white} size={20} />
                  <Text style={styles.loginButtonText}>Access Admin Panel</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.securityNote}>
            <Lock color={Colors.textLight} size={14} />
            <Text style={styles.securityNoteText}>
              This area is restricted to authorized administrators only.
              All access attempts are logged.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loginContainer: {
    flex: 1,
    justifyContent: "center" as const,
  },
  loginContent: {
    paddingHorizontal: 24,
  },
  loginHeader: {
    alignItems: "center" as const,
    marginBottom: 40,
  },
  lockIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 15,
    color: Colors.textLight,
    textAlign: "center" as const,
    lineHeight: 22,
  },
  loginForm: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  errorBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.error + "15",
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    color: Colors.error,
    fontWeight: "500" as const,
  },
  loginInputGroup: {
    marginBottom: 20,
  },
  loginLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 10,
  },
  loginInputWrapper: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loginInputIcon: {
    marginLeft: 16,
  },
  loginInput: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    fontSize: 16,
    color: Colors.text,
  },
  showPasscodeButton: {
    padding: 16,
  },
  loginButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 14,
    marginTop: 8,
    gap: 10,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: "600" as const,
  },
  securityNote: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    justifyContent: "center" as const,
    marginTop: 24,
    paddingHorizontal: 20,
    gap: 8,
  },
  securityNoteText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textLight,
    lineHeight: 18,
    textAlign: "center" as const,
  },
});
