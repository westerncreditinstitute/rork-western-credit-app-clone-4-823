import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import {
  Play,
  FileText,
  ChevronRight,
  Lock,
  CheckCircle,
  PenLine,
  Trash2,
  Send,
  Clock,
  BookOpen,
  Upload,
  MessageCircle,
  Scale,
  Cloud,
  Target,
  Award,
  AlertCircle,
  Code,
  ExternalLink,
  X,
  Maximize2,
  ShieldAlert,
} from "lucide-react-native";
import * as ScreenCapture from "expo-screen-capture";
import Colors from "@/constants/colors";
import { courses } from "@/mocks/data";
import { trpc } from "@/lib/trpc";
import BunnyVideoPlayer from "@/components/BunnyVideoPlayer";

interface VideoItem {
  id: string;
  title: string;
  bunnyVideoId?: string;
  bunnyLibraryId?: string;
  duration?: string;
  description?: string;
  order: number;
}

interface VideoNote {
  id: string;
  content: string;
  timestamp: number;
  videoTitle?: string;
  createdAt: string;
}

const MOCK_USER_ID = "user_demo_123";

const useDocumentScreenProtection = (isActive: boolean) => {
  useEffect(() => {
    if (Platform.OS === "web" || !isActive) return;

    const enableProtection = async () => {
      try {
        await ScreenCapture.preventScreenCaptureAsync("embed-document-protection");
        console.log("[SectionDetail] Screen capture protection ENABLED for embedded document");
        
        if (Platform.OS === "ios") {
          await ScreenCapture.enableAppSwitcherProtectionAsync(1.0);
          console.log("[SectionDetail] iOS app switcher blur protection ENABLED");
        }
      } catch (err) {
        console.log("[SectionDetail] Error enabling screen capture protection:", err);
      }
    };

    enableProtection();

    return () => {
      ScreenCapture.allowScreenCaptureAsync("embed-document-protection").catch(() => {});
      if (Platform.OS === "ios") {
        ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => {});
      }
      console.log("[SectionDetail] Screen capture protection DISABLED");
    };
  }, [isActive]);

  useEffect(() => {
    if (Platform.OS === "web" || !isActive) return;

    const subscription = ScreenCapture.addScreenshotListener(() => {
      console.log("[SectionDetail] Screenshot detected! Content is protected.");
      Alert.alert(
        "Screenshot Blocked",
        "This content is protected. Screenshots and screen recordings are not allowed.",
        [{ text: "OK" }]
      );
    });

    return () => {
      subscription.remove();
    };
  }, [isActive]);
};

const convertToEmbedUrl = (url: string): string => {
  // Handle Prezi view URLs
  if (url.includes("prezi.com/view/")) {
    const preziIdMatch = url.match(/prezi\.com\/view\/([a-zA-Z0-9_-]+)/);
    if (preziIdMatch && preziIdMatch[1]) {
      return `https://prezi.com/v/${preziIdMatch[1]}/`;
    }
  }
  // Handle Prezi /p/ URLs
  if (url.includes("prezi.com/p/") && !url.includes("/embed/")) {
    const preziIdMatch = url.match(/prezi\.com\/p\/([a-zA-Z0-9_-]+)/);
    if (preziIdMatch && preziIdMatch[1]) {
      return `https://prezi.com/v/${preziIdMatch[1]}/`;
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

const EmbedDocumentWeb = ({ embedCode }: { embedCode: string }) => {
  const extractSrc = (code: string): string => {
    if (code.includes("<iframe")) {
      const srcMatch = code.match(/src=["']([^"']+)["']/);
      const extractedUrl = srcMatch ? srcMatch[1] : code;
      return convertToEmbedUrl(extractedUrl);
    }
    return convertToEmbedUrl(code);
  };

  const iframeSrc = extractSrc(embedCode);

  if (Platform.OS !== "web") {
    return null;
  }

  return (
    <View style={{ height: 500, width: "100%" }}>
      <iframe
        src={iframeSrc}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
        } as React.CSSProperties}
        allowFullScreen
        loading="lazy"
      />
    </View>
  );
};

const AI_CREDIT_REPAIR_AGENT_SECTION_ID = "11";
const ACE1_COURSE_ID = "3";
const ACE_COURSE_IDS = ["3", "4", "5", "9"];
const CERTIFICATION_THRESHOLD = 80;

export default function SectionDetailScreen() {
  const { courseId, sectionId } = useLocalSearchParams<{
    courseId: string;
    sectionId: string;
  }>();
  const router = useRouter();
  const [activeVideoIndex, setActiveVideoIndex] = useState<number | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [activeEmbedDocument, setActiveEmbedDocument] = useState<string | null>(null);

  const course = courses.find((c) => c.id === courseId);
  const section = course?.sections?.find((s) => s.id === sectionId);

  const videosQuery = trpc.videos.getAll.useQuery(
    { courseId, sectionId },
    { enabled: !!courseId && !!sectionId }
  );

  const documentsQuery = trpc.documents.getAll.useQuery(
    { courseId, sectionId },
    { enabled: !!courseId && !!sectionId }
  );

  const progressQuery = trpc.videoProgress.getAllProgress.useQuery(
    { userId: MOCK_USER_ID, courseId, sectionId },
    { enabled: !!courseId && !!sectionId }
  );

  const activeVideo = activeVideoIndex !== null ? videosQuery.data?.[activeVideoIndex] : null;

  const notesQuery = trpc.videoNotes.getAll.useQuery(
    { userId: MOCK_USER_ID, videoId: activeVideo?.id || "" },
    { enabled: !!activeVideo?.id }
  );

  const createNoteMutation = trpc.videoNotes.create.useMutation({
    onSuccess: () => {
      notesQuery.refetch();
      setNoteInput("");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const updateNoteMutation = trpc.videoNotes.update.useMutation({
    onSuccess: () => {
      notesQuery.refetch();
      setEditingNoteId(null);
      setNoteInput("");
    },
  });

  const deleteNoteMutation = trpc.videoNotes.delete.useMutation({
    onSuccess: () => {
      notesQuery.refetch();
    },
  });

  const isEnrolled = course?.enrolled ?? false;
  const isAICreditRepairAgentSection = courseId === ACE1_COURSE_ID && sectionId === AI_CREDIT_REPAIR_AGENT_SECTION_ID;
  const isACECourse = ACE_COURSE_IDS.includes(courseId || "");

  // Enable screen capture protection when viewing embedded documents
  useDocumentScreenProtection(activeEmbedDocument !== null && isEnrolled);

  const getVideoProgress = useCallback((videoId: string) => {
    const progress = progressQuery.data?.find((p: { videoId: string }) => p.videoId === videoId);
    return progress || null;
  }, [progressQuery.data]);

  const getCertificationStatus = useCallback((videoId: string) => {
    const progress = getVideoProgress(videoId);
    const progressPercent = progress?.progressPercent || 0;
    return {
      isEligible: progressPercent >= CERTIFICATION_THRESHOLD,
      progressPercent,
      remaining: Math.max(0, CERTIFICATION_THRESHOLD - progressPercent),
    };
  }, [getVideoProgress]);

  const certificationEligibleCount = videosQuery.data?.filter((v: VideoItem) => {
    const status = getCertificationStatus(v.id);
    return status.isEligible;
  }).length || 0;

  const completedCount = videosQuery.data?.filter((v: VideoItem) => {
    const progress = getVideoProgress(v.id);
    return progress?.completed;
  }).length || 0;

  const totalVideos = videosQuery.data?.length || 0;

  if (!course || !section) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Section" }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Section not found</Text>
        </View>
      </View>
    );
  }

  const videos: VideoItem[] = videosQuery.data || [];
  const documents = documentsQuery.data || [];

  const handleVideoSelect = (index: number) => {
    if (!isEnrolled) {
      router.push(`/course-detail?id=${courseId}` as any);
      return;
    }
    setActiveVideoIndex(index);
    setShowNotes(false);
  };

  const handleUnlock = () => {
    router.push(`/course-detail?id=${courseId}` as any);
  };

  const handleAddNote = () => {
    if (!noteInput.trim() || !activeVideo) return;

    if (editingNoteId) {
      updateNoteMutation.mutate({
        id: editingNoteId,
        content: noteInput.trim(),
      });
    } else {
      createNoteMutation.mutate({
        userId: MOCK_USER_ID,
        videoId: activeVideo.id,
        courseId: courseId || "",
        sectionId: sectionId || "",
        content: noteInput.trim(),
        timestamp: 0,
        videoTitle: activeVideo.title,
      });
    }
  };

  const handleEditNote = (note: VideoNote) => {
    setEditingNoteId(note.id);
    setNoteInput(note.content);
  };

  const handleDeleteNote = (noteId: string) => {
    Alert.alert("Delete Note", "Are you sure you want to delete this note?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteNoteMutation.mutate({ id: noteId }),
      },
    ]);
  };

  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen
        options={{
          title: section.title,
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.progressInfo}>
            <View style={styles.progressStats}>
              <View style={styles.statItem}>
                <CheckCircle color={Colors.secondary} size={16} />
                <Text style={styles.statText}>
                  {completedCount} of {totalVideos} videos completed
                </Text>
              </View>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${totalVideos > 0 ? (completedCount / totalVideos) * 100 : 0}%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {isACECourse && totalVideos > 0 && (
          <View style={styles.certificationBanner}>
            <View style={styles.certificationBannerHeader}>
              <View style={styles.certificationIconContainer}>
                <Target color={Colors.surface} size={18} />
              </View>
              <View style={styles.certificationBannerContent}>
                <Text style={styles.certificationBannerTitle}>CSO Exam Requirement</Text>
                <Text style={styles.certificationBannerSubtitle}>
                  Watch at least {CERTIFICATION_THRESHOLD}% of each video for certification eligibility
                </Text>
              </View>
            </View>
            <View style={styles.certificationProgress}>
              <View style={styles.certificationProgressBar}>
                <View
                  style={[
                    styles.certificationProgressFill,
                    { width: `${totalVideos > 0 ? (certificationEligibleCount / totalVideos) * 100 : 0}%` },
                  ]}
                />
              </View>
              <View style={styles.certificationStats}>
                <Award color={certificationEligibleCount === totalVideos ? Colors.secondary : Colors.warning} size={14} />
                <Text style={[
                  styles.certificationStatsText,
                  certificationEligibleCount === totalVideos && styles.certificationStatsTextComplete
                ]}>
                  {certificationEligibleCount}/{totalVideos} videos meet {CERTIFICATION_THRESHOLD}% requirement
                </Text>
              </View>
            </View>
          </View>
        )}

        {isAICreditRepairAgentSection && (
          <View style={styles.aiToolsSection}>
            <Text style={styles.aiToolsTitle}>AI Tools</Text>
            
            <TouchableOpacity
              style={styles.aiToolCard}
              activeOpacity={0.8}
              onPress={() => router.push("/ai-dispute-assistant" as any)}
            >
              <View style={styles.aiToolHeader}>
                <View style={[styles.aiToolIconContainer, { backgroundColor: Colors.secondary }]}>
                  <Upload color={Colors.surface} size={22} />
                </View>
                <View style={styles.aiToolHeaderText}>
                  <View style={styles.aiToolTitleRow}>
                    <Text style={styles.aiToolTitle}>AI Dispute Assistant</Text>
                    <View style={styles.aiToolBadge}>
                      <Text style={styles.aiToolBadgeText}>Step 1</Text>
                    </View>
                  </View>
                  <Text style={styles.aiToolSubtitle}>
                    Find and dispute negative accounts on your credit report
                  </Text>
                </View>
              </View>
              <View style={styles.aiToolFeatures}>
                <View style={styles.aiToolFeatureItem}>
                  <Upload color={Colors.primary} size={16} />
                  <Text style={styles.aiToolFeatureText}>Upload Reports</Text>
                </View>
                <View style={styles.aiToolFeatureItem}>
                  <FileText color={Colors.secondary} size={16} />
                  <Text style={styles.aiToolFeatureText}>Generate Letters</Text>
                </View>
                <View style={styles.aiToolFeatureItem}>
                  <CheckCircle color={Colors.primary} size={16} />
                  <Text style={styles.aiToolFeatureText}>Track Progress</Text>
                </View>
              </View>
              <View style={[styles.aiToolAction, { backgroundColor: Colors.secondary }]}>
                <Text style={styles.aiToolActionText}>Open AI Dispute Assistant</Text>
                <Play color={Colors.surface} size={14} fill={Colors.surface} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.aiToolCard}
              activeOpacity={0.8}
              onPress={() => router.push("/interactive-coach" as any)}
            >
              <View style={styles.aiToolHeader}>
                <View style={[styles.aiToolIconContainer, { backgroundColor: Colors.primary }]}>
                  <MessageCircle color={Colors.surface} size={22} />
                </View>
                <View style={styles.aiToolHeaderText}>
                  <View style={styles.aiToolTitleRow}>
                    <Text style={styles.aiToolTitle}>AI Credit Repair Coach</Text>
                    <View style={[styles.aiToolBadge, { backgroundColor: Colors.secondary }]}>
                      <Text style={styles.aiToolBadgeText}>Step 2</Text>
                    </View>
                  </View>
                  <Text style={styles.aiToolSubtitle}>
                    Get personalized guidance through the credit repair process
                  </Text>
                </View>
              </View>
              <View style={styles.aiToolFeatures}>
                <View style={styles.aiToolFeatureItem}>
                  <CheckCircle color={Colors.secondary} size={16} />
                  <Text style={styles.aiToolFeatureText}>24/7 Available</Text>
                </View>
                <View style={styles.aiToolFeatureItem}>
                  <CheckCircle color={Colors.secondary} size={16} />
                  <Text style={styles.aiToolFeatureText}>Personalized</Text>
                </View>
                <View style={styles.aiToolFeatureItem}>
                  <CheckCircle color={Colors.secondary} size={16} />
                  <Text style={styles.aiToolFeatureText}>Step-by-Step</Text>
                </View>
              </View>
              <View style={[styles.aiToolAction, { backgroundColor: Colors.primary }]}>
                <Text style={styles.aiToolActionText}>Open AI Coach</Text>
                <Play color={Colors.surface} size={14} fill={Colors.surface} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.aiToolCard}
              activeOpacity={0.8}
              onPress={() => router.push("/lawsuit-assistant" as any)}
            >
              <View style={styles.aiToolHeader}>
                <View style={[styles.aiToolIconContainer, { backgroundColor: Colors.primary }]}>
                  <Scale color={Colors.surface} size={22} />
                </View>
                <View style={styles.aiToolHeaderText}>
                  <View style={styles.aiToolTitleRow}>
                    <Text style={styles.aiToolTitle}>Lawsuit Assistant</Text>
                    <View style={styles.aiToolBadge}>
                      <Text style={styles.aiToolBadgeText}>Step 3</Text>
                    </View>
                  </View>
                  <Text style={styles.aiToolSubtitle}>
                    Prepare lawsuits for credit reporting violations
                  </Text>
                </View>
              </View>
              <View style={styles.aiToolFeatures}>
                <View style={styles.aiToolFeatureItem}>
                  <Scale color={Colors.primary} size={16} />
                  <Text style={styles.aiToolFeatureText}>FCRA Violations</Text>
                </View>
                <View style={styles.aiToolFeatureItem}>
                  <FileText color={Colors.secondary} size={16} />
                  <Text style={styles.aiToolFeatureText}>Filing Guide</Text>
                </View>
                <View style={styles.aiToolFeatureItem}>
                  <CheckCircle color={Colors.primary} size={16} />
                  <Text style={styles.aiToolFeatureText}>Step-by-Step</Text>
                </View>
              </View>
              <View style={[styles.aiToolAction, { backgroundColor: Colors.primary }]}>
                <Text style={styles.aiToolActionText}>Open Lawsuit Assistant</Text>
                <Play color={Colors.surface} size={14} fill={Colors.surface} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.aiToolCard}
              activeOpacity={0.8}
              onPress={() => router.push("/dispute-tracker" as any)}
            >
              <View style={styles.aiToolHeader}>
                <View style={[styles.aiToolIconContainer, { backgroundColor: "#6366F1" }]}>
                  <Cloud color={Colors.surface} size={22} />
                </View>
                <View style={styles.aiToolHeaderText}>
                  <View style={styles.aiToolTitleRow}>
                    <Text style={styles.aiToolTitle}>Cloud Disputes Tracker</Text>
                    <View style={[styles.aiToolBadge, { backgroundColor: "#6366F1" }]}>
                      <Text style={styles.aiToolBadgeText}>Step 4</Text>
                    </View>
                  </View>
                  <Text style={styles.aiToolSubtitle}>
                    Track all your disputes in one place with cloud sync
                  </Text>
                </View>
              </View>
              <View style={styles.aiToolFeatures}>
                <View style={styles.aiToolFeatureItem}>
                  <Cloud color={"#6366F1"} size={16} />
                  <Text style={styles.aiToolFeatureText}>Cloud Sync</Text>
                </View>
                <View style={styles.aiToolFeatureItem}>
                  <FileText color={Colors.secondary} size={16} />
                  <Text style={styles.aiToolFeatureText}>All Disputes</Text>
                </View>
                <View style={styles.aiToolFeatureItem}>
                  <CheckCircle color={Colors.primary} size={16} />
                  <Text style={styles.aiToolFeatureText}>Track Status</Text>
                </View>
              </View>
              <View style={[styles.aiToolAction, { backgroundColor: "#6366F1" }]}>
                <Text style={styles.aiToolActionText}>Open Disputes Tracker</Text>
                <Play color={Colors.surface} size={14} fill={Colors.surface} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {activeVideoIndex !== null && videos[activeVideoIndex] && (
          <View style={styles.activeVideoContainer}>
            {videos[activeVideoIndex].bunnyVideoId &&
            videos[activeVideoIndex].bunnyLibraryId ? (
              <BunnyVideoPlayer
                videoId={videos[activeVideoIndex].bunnyVideoId!}
                libraryId={videos[activeVideoIndex].bunnyLibraryId!}
                title={videos[activeVideoIndex].title}
                isLocked={!isEnrolled}
                onUnlockPress={handleUnlock}
                autoPlay
                userId={MOCK_USER_ID}
                courseId={courseId}
                sectionId={sectionId}
                dbVideoId={videos[activeVideoIndex].id}
                onProgressUpdate={() => {
                  progressQuery.refetch();
                }}
              />
            ) : (
              <View style={styles.noVideoContainer}>
                <Play color={Colors.textLight} size={32} />
                <Text style={styles.noVideoText}>Video not configured</Text>
              </View>
            )}
            <View style={styles.activeVideoInfo}>
              <Text style={styles.activeVideoTitle}>
                {videos[activeVideoIndex].title}
              </Text>
              {videos[activeVideoIndex].description && (
                <Text style={styles.activeVideoDescription}>
                  {videos[activeVideoIndex].description}
                </Text>
              )}
              
              <TouchableOpacity
                style={styles.notesToggle}
                onPress={() => setShowNotes(!showNotes)}
              >
                <PenLine color={Colors.primary} size={18} />
                <Text style={styles.notesToggleText}>
                  {showNotes ? "Hide Notes" : "Take Notes"}
                </Text>
                <View style={styles.notesBadge}>
                  <Text style={styles.notesBadgeText}>
                    {notesQuery.data?.length || 0}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {showNotes && (
              <View style={styles.notesSection}>
                <View style={styles.notesHeader}>
                  <BookOpen color={Colors.text} size={18} />
                  <Text style={styles.notesHeaderText}>Your Notes</Text>
                </View>

                <View style={styles.noteInputContainer}>
                  <TextInput
                    style={styles.noteInput}
                    value={noteInput}
                    onChangeText={setNoteInput}
                    placeholder="Add a note about this video..."
                    placeholderTextColor={Colors.textLight}
                    multiline
                    numberOfLines={3}
                  />
                  <TouchableOpacity
                    style={[
                      styles.noteSubmitButton,
                      !noteInput.trim() && styles.noteSubmitButtonDisabled,
                    ]}
                    onPress={handleAddNote}
                    disabled={!noteInput.trim() || createNoteMutation.isPending}
                  >
                    {createNoteMutation.isPending || updateNoteMutation.isPending ? (
                      <ActivityIndicator size="small" color={Colors.surface} />
                    ) : (
                      <Send color={Colors.surface} size={18} />
                    )}
                  </TouchableOpacity>
                </View>

                {editingNoteId && (
                  <TouchableOpacity
                    style={styles.cancelEditButton}
                    onPress={() => {
                      setEditingNoteId(null);
                      setNoteInput("");
                    }}
                  >
                    <Text style={styles.cancelEditText}>Cancel Edit</Text>
                  </TouchableOpacity>
                )}

                {notesQuery.isLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={Colors.primary}
                    style={styles.notesLoading}
                  />
                ) : notesQuery.data && notesQuery.data.length > 0 ? (
                  <View style={styles.notesList}>
                    {notesQuery.data.map((note: VideoNote) => (
                      <View key={note.id} style={styles.noteItem}>
                        <View style={styles.noteContent}>
                          {note.timestamp > 0 && (
                            <View style={styles.noteTimestamp}>
                              <Clock color={Colors.primary} size={12} />
                              <Text style={styles.noteTimestampText}>
                                {formatTimestamp(note.timestamp)}
                              </Text>
                            </View>
                          )}
                          <Text style={styles.noteText}>{note.content}</Text>
                          <Text style={styles.noteDate}>
                            {new Date(note.createdAt).toLocaleDateString()}
                          </Text>
                        </View>
                        <View style={styles.noteActions}>
                          <TouchableOpacity
                            style={styles.noteActionButton}
                            onPress={() => handleEditNote(note)}
                          >
                            <PenLine color={Colors.primary} size={16} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.noteActionButton}
                            onPress={() => handleDeleteNote(note.id)}
                          >
                            <Trash2 color={Colors.error} size={16} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noNotesText}>
                    No notes yet. Start taking notes!
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {videosQuery.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading videos...</Text>
          </View>
        ) : videos.length > 0 ? (
          <View style={styles.videosSection}>
            <Text style={styles.sectionLabel}>Video Lessons</Text>
            {videos.map((video, index) => {
              const videoProgress = getVideoProgress(video.id);
              const isCompleted = videoProgress?.completed;
              const progressPercent = videoProgress?.progressPercent || 0;
              const certStatus = getCertificationStatus(video.id);

              return (
                <TouchableOpacity
                  key={video.id}
                  style={[
                    styles.videoItem,
                    activeVideoIndex === index && styles.videoItemActive,
                    isCompleted && styles.videoItemCompleted,
                  ]}
                  onPress={() => handleVideoSelect(index)}
                  activeOpacity={0.7}
                >
                  <View style={styles.videoItemLeft}>
                    {!isEnrolled ? (
                      <View style={styles.lockedIcon}>
                        <Lock color={Colors.textLight} size={16} />
                      </View>
                    ) : isCompleted ? (
                      <View style={styles.completedIcon}>
                        <CheckCircle color={Colors.surface} size={18} />
                      </View>
                    ) : activeVideoIndex === index ? (
                      <View style={styles.playingIcon}>
                        <Play color={Colors.surface} size={14} fill={Colors.surface} />
                      </View>
                    ) : (
                      <View style={styles.videoNumber}>
                        <Text style={styles.videoNumberText}>{index + 1}</Text>
                      </View>
                    )}
                    <View style={styles.videoInfo}>
                      <View style={styles.videoTitleRow}>
                        <Text
                          style={[
                            styles.videoTitle,
                            activeVideoIndex === index && styles.videoTitleActive,
                            isCompleted && styles.videoTitleCompleted,
                          ]}
                          numberOfLines={2}
                        >
                          {video.title}
                        </Text>
                        {isACECourse && certStatus.isEligible && (
                          <View style={styles.certBadge}>
                            <Award color={Colors.secondary} size={12} />
                          </View>
                        )}
                      </View>
                      <View style={styles.videoMeta}>
                        {video.duration && (
                          <Text style={styles.videoDuration}>{video.duration}</Text>
                        )}
                        {progressPercent > 0 && !isCompleted && (
                          <Text style={[
                            styles.videoProgress,
                            isACECourse && !certStatus.isEligible && styles.videoProgressWarning
                          ]}>
                            {progressPercent}% watched
                            {isACECourse && !certStatus.isEligible && ` (need ${certStatus.remaining}% more)`}
                          </Text>
                        )}
                        {isACECourse && progressPercent === 0 && (
                          <Text style={styles.videoProgressWarning}>
                            Need {CERTIFICATION_THRESHOLD}% for certification
                          </Text>
                        )}
                      </View>
                      {isACECourse && progressPercent > 0 && !isCompleted && !certStatus.isEligible && (
                        <View style={styles.miniProgressContainer}>
                          <View style={[styles.miniProgress, { width: `${progressPercent}%` }]} />
                          <View style={[styles.miniProgressTarget, { left: `${CERTIFICATION_THRESHOLD}%` }]} />
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.videoItemRight}>
                    {isACECourse && !certStatus.isEligible && progressPercent > 0 && (
                      <AlertCircle color={Colors.warning} size={16} style={{ marginRight: 8 }} />
                    )}
                    <ChevronRight color={Colors.textLight} size={20} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptySection}>
            <Play color={Colors.textLight} size={32} />
            <Text style={styles.emptyText}>No videos in this section yet</Text>
          </View>
        )}

        {documentsQuery.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        ) : documents.length > 0 ? (
          <View style={styles.documentsSection}>
            <Text style={styles.sectionLabel}>Resources & Documents</Text>
            {documents.map((doc: { id: string; title: string; type: string; description?: string; url?: string; embedCode?: string }) => (
              <View key={doc.id}>
                <TouchableOpacity
                  style={[
                    styles.documentItem,
                    activeEmbedDocument === doc.id && doc.type === "embed" && styles.documentItemActive,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (!isEnrolled) {
                      router.push(`/course-detail?id=${courseId}` as any);
                      return;
                    }
                    if (doc.type === "link" && doc.url) {
                      router.push(`/protected-document?url=${encodeURIComponent(doc.url)}&title=${encodeURIComponent(doc.title)}` as any);
                    } else if (doc.type === "embed" && doc.embedCode) {
                      setActiveEmbedDocument(activeEmbedDocument === doc.id ? null : doc.id);
                    } else if (doc.url) {
                      router.push(`/protected-document?url=${encodeURIComponent(doc.url)}&title=${encodeURIComponent(doc.title)}` as any);
                    }
                  }}
                >
                  <View style={[
                    styles.documentIcon,
                    doc.type === "link" && styles.documentIconLink,
                    doc.type === "embed" && styles.documentIconEmbed,
                  ]}>
                    {doc.type === "link" ? (
                      <ExternalLink color={Colors.primary} size={20} />
                    ) : doc.type === "embed" ? (
                      <Code color={Colors.secondary} size={20} />
                    ) : (
                      <FileText color={Colors.primary} size={20} />
                    )}
                  </View>
                  <View style={styles.documentInfo}>
                    <View style={styles.documentTitleRow}>
                      <Text style={styles.documentTitle}>{doc.title}</Text>
                      {doc.type === "link" && (
                        <View style={styles.linkBadge}>
                          <Text style={styles.linkBadgeText}>LINK</Text>
                        </View>
                      )}
                      {doc.type === "embed" && (
                        <View style={styles.embedBadge}>
                          <Text style={styles.embedBadgeText}>EMBED</Text>
                        </View>
                      )}
                    </View>
                    {doc.description && (
                      <Text style={styles.documentDescription} numberOfLines={1}>
                        {doc.description}
                      </Text>
                    )}
                  </View>
                  {!isEnrolled ? (
                    <Lock color={Colors.textLight} size={18} />
                  ) : doc.type === "embed" ? (
                    activeEmbedDocument === doc.id ? (
                      <X color={Colors.primary} size={20} />
                    ) : (
                      <Maximize2 color={Colors.primary} size={20} />
                    )
                  ) : (
                    <ExternalLink color={Colors.primary} size={20} />
                  )}
                </TouchableOpacity>
                
                {activeEmbedDocument === doc.id && doc.type === "embed" && doc.embedCode && isEnrolled && (
                  <View style={styles.embedContainer}>
                    {Platform.OS !== "web" && (
                      <View style={styles.embedProtectionBadge}>
                        <ShieldAlert color={Colors.surface} size={12} />
                        <Text style={styles.embedProtectionBadgeText}>Protected</Text>
                      </View>
                    )}
                    {Platform.OS === "web" ? (
                      <EmbedDocumentWeb embedCode={doc.embedCode} />
                    ) : (
                      <WebView
                        source={{
                          html: (() => {
                            const embedUrl = convertToEmbedUrl(doc.embedCode.includes("<iframe") 
                              ? (doc.embedCode.match(/src=["']([^"']+)["']/)?.[1] || doc.embedCode)
                              : doc.embedCode);
                            if (doc.embedCode.includes("<iframe")) {
                              const updatedEmbed = doc.embedCode.replace(/src=["'][^"']+["']/, `src="${embedUrl}"`);
                              return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{margin:0;padding:0;display:flex;justify-content:center;align-items:center;height:100vh;background:#f5f5f5;}iframe{width:100%;height:100%;border:none;}</style></head><body>${updatedEmbed}</body></html>`;
                            }
                            return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{margin:0;padding:0;}iframe{width:100%;height:100vh;border:none;}</style></head><body><iframe src="${embedUrl}" width="100%" height="100%" frameborder="0" allowfullscreen></iframe></body></html>`;
                          })()
                        }}
                        style={styles.embedWebView}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        allowsFullscreenVideo={true}
                        scalesPageToFit={true}
                      />
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>

      {!isEnrolled && (
        <View style={styles.enrollFooter}>
          <View style={styles.enrollInfo}>
            <Lock color={Colors.primary} size={20} />
            <Text style={styles.enrollText}>
              Enroll in this course to access all content
            </Text>
          </View>
          <TouchableOpacity
            style={styles.enrollButton}
            onPress={handleUnlock}
            activeOpacity={0.8}
          >
            <Text style={styles.enrollButtonText}>View Course</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  sectionHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 12,
  },
  progressInfo: {
    gap: 8,
  },
  progressStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.secondary,
    borderRadius: 3,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  activeVideoContainer: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  activeVideoInfo: {
    padding: 16,
  },
  activeVideoTitle: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 4,
  },
  activeVideoDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  noVideoContainer: {
    height: 200,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  noVideoText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  notesToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary + "10",
    borderRadius: 10,
    marginTop: 8,
  },
  notesToggleText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.primary,
    flex: 1,
  },
  notesBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  notesBadgeText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.surface,
  },
  notesSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 16,
  },
  notesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  notesHeaderText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  noteInputContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  noteInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    minHeight: 60,
    textAlignVertical: "top",
  },
  noteSubmitButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-end",
  },
  noteSubmitButtonDisabled: {
    backgroundColor: Colors.textLight,
  },
  cancelEditButton: {
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  cancelEditText: {
    fontSize: 13,
    color: Colors.error,
    fontWeight: "500" as const,
  },
  notesLoading: {
    marginVertical: 20,
  },
  notesList: {
    gap: 10,
  },
  noteItem: {
    flexDirection: "row",
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noteContent: {
    flex: 1,
  },
  noteTimestamp: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  noteTimestampText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "500" as const,
  },
  noteText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  noteDate: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 6,
  },
  noteActions: {
    flexDirection: "row",
    gap: 8,
    marginLeft: 10,
  },
  noteActionButton: {
    padding: 6,
  },
  noNotesText: {
    fontSize: 13,
    color: Colors.textLight,
    textAlign: "center",
    paddingVertical: 20,
  },
  videosSection: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 12,
  },
  videoItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  videoItemActive: {
    backgroundColor: Colors.primary + "15",
    borderWidth: 1,
    borderColor: Colors.primary + "30",
  },
  videoItemCompleted: {
    backgroundColor: Colors.secondary + "10",
    borderWidth: 1,
    borderColor: Colors.secondary + "30",
  },
  videoItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  videoNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
  },
  videoNumberText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  playingIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  completedIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  lockedIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: "500" as const,
    color: Colors.text,
    marginBottom: 2,
  },
  videoTitleActive: {
    color: Colors.primary,
    fontWeight: "600" as const,
  },
  videoTitleCompleted: {
    color: Colors.secondary,
  },
  videoMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  videoDuration: {
    fontSize: 12,
    color: Colors.textLight,
  },
  videoProgress: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "500" as const,
  },
  videoProgressWarning: {
    color: Colors.warning,
  },
  videoTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    flex: 1,
  },
  certBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.secondary + "20",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  videoItemRight: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  miniProgressContainer: {
    height: 3,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 2,
    marginTop: 6,
    position: "relative" as const,
    overflow: "visible" as const,
  },
  miniProgress: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  miniProgressTarget: {
    position: "absolute" as const,
    top: -2,
    width: 2,
    height: 7,
    backgroundColor: Colors.secondary,
    borderRadius: 1,
  },
  certificationBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: Colors.primary + "10",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.primary + "25",
  },
  certificationBannerHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    marginBottom: 12,
  },
  certificationIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  certificationBannerContent: {
    flex: 1,
  },
  certificationBannerTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 2,
  },
  certificationBannerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  certificationProgress: {
    gap: 8,
  },
  certificationProgressBar: {
    height: 6,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 3,
    overflow: "hidden" as const,
  },
  certificationProgressFill: {
    height: "100%",
    backgroundColor: Colors.secondary,
    borderRadius: 3,
  },
  certificationStats: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  certificationStatsText: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: "500" as const,
  },
  certificationStatsTextComplete: {
    color: Colors.secondary,
  },
  emptySection: {
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  documentsSection: {
    padding: 16,
    paddingTop: 0,
  },
  documentItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 15,
    fontWeight: "500" as const,
    color: Colors.text,
    marginBottom: 2,
  },
  documentDescription: {
    fontSize: 12,
    color: Colors.textLight,
  },
  documentTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  documentItemActive: {
    backgroundColor: Colors.primary + "10",
    borderColor: Colors.primary + "30",
    borderWidth: 1,
  },
  documentIconEmbed: {
    backgroundColor: Colors.secondary + "15",
  },
  documentIconLink: {
    backgroundColor: Colors.primary + "15",
  },
  linkBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  linkBadgeText: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: Colors.surface,
    letterSpacing: 0.5,
  },
  embedBadge: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  embedBadgeText: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: Colors.surface,
    letterSpacing: 0.5,
  },
  embedContainer: {
    backgroundColor: Colors.surface,
    marginHorizontal: 0,
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  embedWebView: {
    height: 500,
    width: "100%" as const,
  },
  embedWebContainer: {
    height: 500,
    width: "100%" as const,
  },
  embedProtectionBadge: {
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
  embedProtectionBadgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.surface,
    textTransform: "uppercase" as const,
  },
  enrollFooter: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 12,
  },
  enrollInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  enrollText: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  enrollButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  enrollButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.surface,
  },
  aiToolsSection: {
    padding: 16,
    gap: 16,
  },
  aiToolsTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 4,
  },
  aiToolCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  aiToolHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    gap: 12,
  },
  aiToolIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  aiToolHeaderText: {
    flex: 1,
  },
  aiToolTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  aiToolTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  aiToolBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  aiToolBadgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.surface,
    textTransform: "uppercase",
  },
  aiToolSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  aiToolFeatures: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  aiToolFeatureItem: {
    alignItems: "center",
    gap: 4,
  },
  aiToolFeatureText: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
  },
  aiToolAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  aiToolActionText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.surface,
  },
});
