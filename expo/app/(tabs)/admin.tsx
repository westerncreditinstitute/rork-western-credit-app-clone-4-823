import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import Colors from "@/constants/colors";
import { courses } from "@/mocks/data";
import {
  ManagementMode,
  VideoForm,
  DocumentForm,
  AvatarForm,
  FeaturedVideoForm,
  ADMIN_SESSION_KEY,
  REQUIRE_LOGIN_EACH_VISIT,
  initialVideoForm,
  initialDocumentForm,
  initialAvatarForm,
  initialFeaturedVideoForm,
} from "@/types/admin";

import AdminLoginScreen from "@/components/admin/AdminLoginScreen";
import AdminNavigation from "@/components/admin/AdminNavigation";
import VideoManager from "@/components/admin/VideoManager";
import DocumentManager from "@/components/admin/DocumentManager";
import AvatarManager from "@/components/admin/AvatarManager";
import PromoManager from "@/components/admin/PromoManager";
import BulkImportModal from "@/components/admin/BulkImportModal";
import WorkflowSteps from "@/components/admin/WorkflowSteps";
import CourseSelector from "@/components/admin/CourseSelector";
import SectionSelector from "@/components/admin/SectionSelector";
import AddContentSection from "@/components/admin/AddContentSection";

const hashCredential = async (value: string): Promise<string> => {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    value
  );
  return digest;
};

export default function AdminScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  const [mode, setMode] = useState<ManagementMode>("videos");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("3");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("1");
  const [sandboxMode, setSandboxMode] = useState<boolean>(true);
  const [currentStep, setCurrentStep] = useState<number>(1);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  
  const [videoForm, setVideoForm] = useState<VideoForm>(initialVideoForm);
  const [docForm, setDocForm] = useState<DocumentForm>(initialDocumentForm);
  const [avatarForm, setAvatarForm] = useState<AvatarForm>(initialAvatarForm);
  const [featuredVideoForm, setFeaturedVideoForm] = useState<FeaturedVideoForm>(initialFeaturedVideoForm);
  const [editingFeaturedId, setEditingFeaturedId] = useState<string | null>(null);
  const [showAddFeatured, setShowAddFeatured] = useState(false);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const sections = selectedCourse?.sections || [];

  useEffect(() => {
    if (REQUIRE_LOGIN_EACH_VISIT) {
      clearAdminSession();
    } else {
      checkAuthStatus();
    }
  }, []);

  const clearAdminSession = async () => {
    try {
      await SecureStore.deleteItemAsync(ADMIN_SESSION_KEY);
      setIsAuthenticated(false);
    } catch (error) {
      console.log("Error clearing admin session:", error);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const sessionToken = await SecureStore.getItemAsync(ADMIN_SESSION_KEY);
      if (sessionToken) {
        const expectedToken = await hashCredential("admin_authenticated_session");
        setIsAuthenticated(sessionToken === expectedToken);
      }
    } catch (error) {
      console.log("Error checking auth status:", error);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout from the admin panel?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await SecureStore.deleteItemAsync(ADMIN_SESSION_KEY);
            setIsAuthenticated(false);
          },
        },
      ]
    );
  };

  const handleModeChange = useCallback((newMode: ManagementMode) => {
    setMode(newMode);
    setEditingId(null);
    setShowAddForm(false);
    setShowBulkImport(false);
  }, []);

  const handleSelectCourse = useCallback((courseId: string, firstSectionId: string) => {
    setSelectedCourseId(courseId);
    setSelectedSectionId(firstSectionId);
    setCurrentStep(2);
  }, []);

  const handleSelectSection = useCallback((sectionId: string) => {
    setSelectedSectionId(sectionId);
    setCurrentStep(3);
  }, []);

  const handleAddManually = useCallback(() => {
    setShowAddForm(true);
    setCurrentStep(3);
  }, []);

  const handleImportFromCDN = useCallback(() => {
    setShowBulkImport(true);
    setCurrentStep(3);
  }, []);

  const renderContent = () => {
    switch (mode) {
      case "videos":
        return (
          <>
            {showBulkImport ? (
              <BulkImportModal
                selectedCourseId={selectedCourseId}
                selectedSectionId={selectedSectionId}
                selectedCourseName={selectedCourse?.title || "Unknown Course"}
                selectedSectionName={sections.find(s => s.id === selectedSectionId)?.title || "Unknown Section"}
                onClose={() => {
                  setShowBulkImport(false);
                }}
                onChangeDestination={() => {
                  setShowBulkImport(false);
                  setCurrentStep(1);
                }}
              />
            ) : (
              <VideoManager
                selectedCourseId={selectedCourseId}
                selectedSectionId={selectedSectionId}
                editingId={editingId}
                showAddForm={showAddForm}
                form={videoForm}
                onFormChange={setVideoForm}
                onEditingIdChange={setEditingId}
                onShowAddFormChange={setShowAddForm}
                onShowBulkImport={() => {
                  setShowBulkImport(true);
                  setCurrentStep(3);
                }}
              />
            )}
          </>
        );
      case "documents":
        return (
          <DocumentManager
            selectedCourseId={selectedCourseId}
            selectedSectionId={selectedSectionId}
            editingId={editingId}
            showAddForm={showAddForm}
            form={docForm}
            onFormChange={setDocForm}
            onEditingIdChange={setEditingId}
            onShowAddFormChange={setShowAddForm}
          />
        );
      case "avatars":
        return (
          <AvatarManager
            selectedCourseId={selectedCourseId}
            selectedSectionId={selectedSectionId}
            editingId={editingId}
            showAddForm={showAddForm}
            form={avatarForm}
            onFormChange={setAvatarForm}
            onEditingIdChange={setEditingId}
            onShowAddFormChange={setShowAddForm}
          />
        );
      case "promo":
        return (
          <PromoManager
            editingId={editingFeaturedId}
            showAddForm={showAddFeatured}
            form={featuredVideoForm}
            onFormChange={setFeaturedVideoForm}
            onEditingIdChange={setEditingFeaturedId}
            onShowAddFormChange={setShowAddFeatured}
          />
        );
      default:
        return null;
    }
  };

  if (isCheckingAuth) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.authLoadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.authLoadingText}>Verifying access...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return <AdminLoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <AdminNavigation
        mode={mode}
        onModeChange={handleModeChange}
        sandboxMode={sandboxMode}
        onSandboxModeChange={setSandboxMode}
        onLogout={handleLogout}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {mode !== "promo" && (
          <>
            <WorkflowSteps currentStep={currentStep} />
            <CourseSelector
              courses={courses}
              selectedCourseId={selectedCourseId}
              onSelectCourse={handleSelectCourse}
            />
            <SectionSelector
              sections={sections}
              selectedSectionId={selectedSectionId}
              selectedCourseName={selectedCourse?.title || 'Select Course'}
              onSelectSection={handleSelectSection}
            />
            {!editingId && !showAddForm && !showBulkImport && (
              <AddContentSection
                mode={mode}
                onAddManually={handleAddManually}
                onImportFromCDN={handleImportFromCDN}
              />
            )}
          </>
        )}
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  authLoadingContainer: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  authLoadingText: {
    fontSize: 16,
    color: Colors.textLight,
    marginTop: 16,
  },
});
