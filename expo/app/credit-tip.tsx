import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Share2, Bookmark, Calendar, Tag, ChevronRight, Lightbulb } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { getTipById, getRecentTips, TipCategory } from "@/mocks/creditTips";
import { trpc } from "@/lib/trpc";
import { Card, Badge } from "@/components/ui";

export default function CreditTipScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();

  const blogPostsQuery = trpc.blog.getPosts.useQuery({ limit: 20 });

  const localTip = id ? getTipById(id) : null;
  const relatedTips = getRecentTips(3).filter((t) => t.id !== id);

  const tip = useMemo(() => {
    if (blogPostsQuery.data && id) {
      const blogPost = blogPostsQuery.data.find((p) => p.id === id);
      if (blogPost) {
        return {
          id: blogPost.id,
          title: blogPost.title,
          content: blogPost.content || blogPost.summary,
          category: blogPost.category as TipCategory,
          publishDate: blogPost.publishDate,
          isActive: true,
          createdAt: blogPost.publishDate,
          url: blogPost.url,
        };
      }
    }
    return localTip;
  }, [blogPostsQuery.data, localTip, id]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "repair": return colors.error;
      case "building": return colors.success;
      case "management": return colors.info;
      case "legal": return colors.warning;
      case "business": return colors.secondary;
      case "identity": return "#E67E22";
      default: return colors.primary;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (tip) {
      try {
        await Share.share({
          message: `${tip.title}\n\n${tip.content.substring(0, 200)}...\n\nRead more credit tips at Western Credit Institute`,
          title: tip.title,
        });
      } catch (error) {
        console.log("Error sharing:", error);
      }
    }
  };

  const handleBookmark = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const styles = createStyles(colors);

  if (!tip) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: "Credit Tip",
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft color={colors.text} size={24} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.emptyContainer}>
          <Lightbulb color={colors.textLight} size={48} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Tip Not Found</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            This credit tip could not be found.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft color={colors.text} size={24} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleBookmark} style={styles.headerButton}>
                <Bookmark color={colors.text} size={22} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
                <Share2 color={colors.text} size={22} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.metaRow}>
            <Badge 
              text={tip.category.toUpperCase()} 
              variant="default"
              style={{ backgroundColor: getCategoryColor(tip.category) + '20' }}
              textStyle={{ color: getCategoryColor(tip.category) }}
            />
            <View style={styles.dateRow}>
              <Calendar color={colors.textLight} size={14} />
              <Text style={[styles.dateText, { color: colors.textLight }]}>
                {formatDate(tip.publishDate)}
              </Text>
            </View>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{tip.title}</Text>
        </View>

        <Card variant="default" padding="lg" style={styles.contentCard}>
          <Text style={[styles.contentText, { color: colors.text }]}>{tip.content}</Text>
        </Card>

        <View style={styles.tagsSection}>
          <View style={styles.tagRow}>
            <Tag color={colors.textLight} size={16} />
            <Text style={[styles.tagsLabel, { color: colors.textSecondary }]}>Related Topics:</Text>
          </View>
          <View style={styles.tags}>
            <TouchableOpacity style={[styles.tag, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.tagText, { color: colors.text }]}>Credit Score</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tag, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.tagText, { color: colors.text }]}>{tip.category}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tag, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.tagText, { color: colors.text }]}>Financial Tips</Text>
            </TouchableOpacity>
          </View>
        </View>

        {relatedTips.length > 0 && (
          <View style={styles.relatedSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>More Credit Tips</Text>
            {relatedTips.map((relatedTip) => (
              <TouchableOpacity
                key={relatedTip.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/credit-tip?id=${relatedTip.id}` as any);
                }}
              >
                <Card variant="default" padding="md" style={styles.relatedCard}>
                  <View style={styles.relatedRow}>
                    <View style={[styles.relatedDot, { backgroundColor: getCategoryColor(relatedTip.category) }]} />
                    <View style={styles.relatedContent}>
                      <Text style={[styles.relatedTitle, { color: colors.text }]} numberOfLines={2}>
                        {relatedTip.title}
                      </Text>
                      <Text style={[styles.relatedCategory, { color: colors.textLight }]}>
                        {relatedTip.category}
                      </Text>
                    </View>
                    <ChevronRight color={colors.textLight} size={18} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
    },
    headerActions: {
      flexDirection: "row",
      gap: 8,
    },
    headerButton: {
      padding: 4,
    },
    header: {
      padding: 20,
      paddingTop: 8,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    dateRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    dateText: {
      fontSize: 13,
    },
    title: {
      fontSize: 26,
      fontWeight: "800" as const,
      lineHeight: 34,
      letterSpacing: -0.5,
    },
    contentCard: {
      marginHorizontal: 20,
      marginBottom: 20,
    },
    contentText: {
      fontSize: 16,
      lineHeight: 26,
    },
    tagsSection: {
      paddingHorizontal: 20,
      marginBottom: 24,
    },
    tagRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
    },
    tagsLabel: {
      fontSize: 14,
      fontWeight: "500" as const,
    },
    tags: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    tag: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
    },
    tagText: {
      fontSize: 13,
      fontWeight: "500" as const,
    },
    relatedSection: {
      paddingHorizontal: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700" as const,
      marginBottom: 16,
    },
    relatedCard: {
      marginBottom: 10,
    },
    relatedRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    relatedDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 12,
    },
    relatedContent: {
      flex: 1,
    },
    relatedTitle: {
      fontSize: 15,
      fontWeight: "600" as const,
      marginBottom: 2,
    },
    relatedCategory: {
      fontSize: 12,
      textTransform: "capitalize" as const,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 40,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "600" as const,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      textAlign: "center" as const,
    },
  });
