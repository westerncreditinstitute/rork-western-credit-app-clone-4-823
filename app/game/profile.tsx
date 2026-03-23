import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  Platform,
  Image,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  User,
  Home,
  Car,
  Shirt,
  Crown,
  Eye,
  EyeOff,
  ChevronRight,
  Palette,
  Scissors,
  Glasses,
  Star,
  Target,
  Briefcase,
  CreditCard,
  PiggyBank,
  GraduationCap,
  Edit3,
  Camera,
  Settings,
  Bell,
  Heart,
  ToggleLeft,
  ToggleRight,
  Check,
  X,
  Users,
  UserPlus,
  UserCheck,
  UserX,
  MessageCircle,
  Send,
  ImagePlus,
  Video,
  MoreHorizontal,
  MapPin,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { useEducation } from '@/contexts/EducationContext';
import { useSocialFeed } from '@/contexts/SocialFeedContext';
import { getCreditTier, formatCurrency } from '@/utils/creditEngine';
import { SKIN_TONES, HAIR_COLORS, EYE_COLORS, HAIR_STYLES, GLASSES_OPTIONS, FACIAL_HAIR_OPTIONS } from '@/mocks/gameData';
import { SocialPost, PostMedia } from '@/types/socialFeed';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import HousingDetailsModal from '@/components/home/HousingDetailsModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ProfileTab = 'feed' | 'friends' | 'about';

const getDegreeDisplayName = (degreeType: string): string => {
  const names: Record<string, string> = {
    'certificate': 'Certificate',
    'associate': "Associate's",
    'bachelor': "Bachelor's",
    'master': "Master's",
    'doctorate': 'Doctorate',
  };
  return names[degreeType] || degreeType;
};

const formatTimeAgo = (timestamp: number): string => {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    gameState,
    updateAvatar,
    togglePublicProfile,
    setProfilePhoto,
    toggleUseCustomPhoto,
    updateAlert,
    updatePlayerName,
  } = useGame();
  const { educationState, allSchools } = useEducation();
  const {
    friends,
    friendSuggestions,
    pendingRequests,
    posts,
    myPosts,
    removeFriend,
    acceptFriendRequest,
    declineFriendRequest,
    sendFriendRequest,
    createPost,
    toggleLikePost,
    addComment,
  } = useSocialFeed();

  const [activeTab, setActiveTab] = useState<ProfileTab>('feed');
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(gameState.playerName);
  const [newPostText, setNewPostText] = useState('');
  const [newPostMedia, setNewPostMedia] = useState<PostMedia[]>([]);
  const [commentText, setCommentText] = useState('');
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [feedPage, setFeedPage] = useState(1);
  const [showHousingModal, setShowHousingModal] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim, fadeAnim]);

  useEffect(() => {
    const tabIndex = activeTab === 'feed' ? 0 : activeTab === 'friends' ? 1 : 2;
    Animated.spring(tabIndicatorAnim, {
      toValue: tabIndex * (SCREEN_WIDTH - 32) / 3,
      tension: 80,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, [activeTab, tabIndicatorAnim]);

  const creditTier = getCreditTier(gameState.creditScores.composite);
  const ITEMS_PER_PAGE = 5;

  const paginatedPosts = useMemo(() => {
    return posts.slice(0, feedPage * ITEMS_PER_PAGE);
  }, [posts, feedPage]);

  const getLifestyleIcon = () => {
    switch (gameState.lifestyle.fashionStyle) {
      case 'elite': return Crown;
      case 'luxury': return Star;
      case 'business': return Briefcase;
      case 'casual': return Shirt;
      default: return User;
    }
  };

  const getLifestyleColor = () => {
    switch (gameState.lifestyle.fashionStyle) {
      case 'elite': return '#FFD700';
      case 'luxury': return '#9333EA';
      case 'business': return '#3B82F6';
      case 'casual': return '#10B981';
      default: return '#6B7280';
    }
  };

  const LifestyleIcon = getLifestyleIcon();

  const handleAvatarUpdate = (key: string, value: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    updateAvatar({ [key]: value });
  };

  const pickImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setProfilePhoto(result.assets[0].uri);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  const pickPostMedia = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 4,
    });
    if (!result.canceled && result.assets.length > 0) {
      const media: PostMedia[] = result.assets.map((asset, idx) => ({
        id: `media_${Date.now()}_${idx}`,
        type: (asset.type === 'video' ? 'video' : 'image') as PostMedia['type'],
        uri: asset.uri,
        width: asset.width ?? undefined,
        height: asset.height ?? undefined,
      }));
      setNewPostMedia(prev => [...prev, ...media].slice(0, 4));
    }
  };

  const handleCreatePost = () => {
    if (!newPostText.trim() && newPostMedia.length === 0) return;
    const avatarUri = gameState.useCustomPhoto && gameState.profilePhotoUrl
      ? gameState.profilePhotoUrl
      : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';
    createPost(newPostText.trim(), newPostMedia, gameState.playerName, avatarUri);
    setNewPostText('');
    setNewPostMedia([]);
    setShowCreatePost(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleComment = useCallback((postId: string) => {
    if (!commentText.trim()) return;
    const avatarUri = gameState.useCustomPhoto && gameState.profilePhotoUrl
      ? gameState.profilePhotoUrl
      : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';
    addComment(postId, commentText.trim(), gameState.playerName, avatarUri);
    setCommentText('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [commentText, gameState.useCustomPhoto, gameState.profilePhotoUrl, gameState.playerName, addComment]);

  const renderProfileImage = () => {
    if (gameState.useCustomPhoto && gameState.profilePhotoUrl) {
      return <Image source={{ uri: gameState.profilePhotoUrl }} style={styles.profilePhoto} />;
    }
    return renderAvatarPreview();
  };

  const renderAvatarPreview = () => {
    const avatar = gameState.avatar;
    return (
      <View style={[styles.avatarContainer, { backgroundColor: avatar.skinTone + '40' }]}>
        <View style={[styles.avatarHead, { backgroundColor: avatar.skinTone }]}>
          <View style={[styles.avatarHair, { backgroundColor: avatar.hairColor }]} />
          <View style={styles.avatarFace}>
            <View style={[styles.avatarEye, { backgroundColor: avatar.eyeColor }]} />
            <View style={[styles.avatarEye, { backgroundColor: avatar.eyeColor }]} />
          </View>
          {avatar.glasses !== 'none' && (
            <View style={styles.avatarGlasses}>
              <View style={[styles.glassesLens, { borderColor: '#1F2937' }]} />
              <View style={[styles.glassesLens, { borderColor: '#1F2937' }]} />
            </View>
          )}
          {avatar.facialHair && avatar.facialHair !== 'none' && (
            <View style={[styles.avatarBeard, { backgroundColor: avatar.hairColor + '80' }]} />
          )}
        </View>
        {avatar.outfit.top && (
          <View style={[styles.avatarOutfit, { backgroundColor: avatar.outfit.top.color }]} />
        )}
      </View>
    );
  };

  const renderColorOption = (color: string, isSelected: boolean, onPress: () => void) => (
    <TouchableOpacity
      key={color}
      style={[styles.colorOption, { backgroundColor: color }, isSelected && styles.colorOptionSelected]}
      onPress={onPress}
    />
  );

  const renderTextOption = (value: string, label: string, isSelected: boolean, onPress: () => void) => (
    <TouchableOpacity
      key={value}
      style={[styles.textOption, { backgroundColor: isSelected ? colors.primary : colors.surface }]}
      onPress={onPress}
    >
      <Text style={[styles.textOptionLabel, { color: isSelected ? '#FFF' : colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderPost = useCallback((post: SocialPost) => {
    const isExpanded = expandedPostId === post.id;
    return (
      <View key={post.id} style={[styles.postCard, { backgroundColor: colors.surface }]}>
        <View style={styles.postHeader}>
          <Image source={{ uri: post.authorAvatar }} style={styles.postAvatar} />
          <View style={styles.postAuthorInfo}>
            <View style={styles.postAuthorRow}>
              <Text style={[styles.postAuthorName, { color: colors.text }]}>{post.authorName}</Text>
              {post.badge && <Text style={styles.postBadge}>{post.badge}</Text>}
            </View>
            <Text style={[styles.postTime, { color: colors.textSecondary }]}>
              {formatTimeAgo(post.createdAt)}
              {post.type !== 'status' && ` · ${post.type.charAt(0).toUpperCase() + post.type.slice(1)}`}
            </Text>
          </View>
          <TouchableOpacity style={styles.postMore}>
            <MoreHorizontal size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {post.text.length > 0 && (
          <Text style={[styles.postText, { color: colors.text }]}>{post.text}</Text>
        )}

        {post.media.length > 0 && (
          <View style={styles.postMediaContainer}>
            {post.media.length === 1 ? (
              <Image source={{ uri: post.media[0].uri }} style={styles.postMediaSingle} />
            ) : (
              <View style={styles.postMediaGrid}>
                {post.media.slice(0, 4).map((m, idx) => (
                  <View key={m.id} style={[styles.postMediaGridItem, post.media.length === 2 && { width: '49%' as any }]}>
                    <Image source={{ uri: m.uri }} style={styles.postMediaGridImage} />
                    {idx === 3 && post.media.length > 4 && (
                      <View style={styles.moreMediaOverlay}>
                        <Text style={styles.moreMediaText}>+{post.media.length - 4}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={[styles.postActions, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={styles.postAction}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleLikePost(post.id);
            }}
          >
            <Heart
              size={20}
              color={post.isLiked ? '#EF4444' : colors.textSecondary}
              fill={post.isLiked ? '#EF4444' : 'transparent'}
            />
            <Text style={[styles.postActionText, { color: post.isLiked ? '#EF4444' : colors.textSecondary }]}>
              {post.likes > 0 ? post.likes : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.postAction}
            onPress={() => setExpandedPostId(isExpanded ? null : post.id)}
          >
            <MessageCircle size={20} color={colors.textSecondary} />
            <Text style={[styles.postActionText, { color: colors.textSecondary }]}>
              {post.comments.length > 0 ? post.comments.length : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.postAction}>
            <Send size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {isExpanded && (
          <View style={[styles.commentsSection, { borderTopColor: colors.border }]}>
            {post.comments.map(c => (
              <View key={c.id} style={styles.commentItem}>
                <Image source={{ uri: c.authorAvatar }} style={styles.commentAvatar} />
                <View style={[styles.commentBubble, { backgroundColor: colors.background }]}>
                  <Text style={[styles.commentAuthor, { color: colors.text }]}>{c.authorName}</Text>
                  <Text style={[styles.commentText, { color: colors.text }]}>{c.text}</Text>
                  <Text style={[styles.commentTime, { color: colors.textSecondary }]}>
                    {formatTimeAgo(c.createdAt)} · {c.likes} likes
                  </Text>
                </View>
              </View>
            ))}
            <View style={styles.commentInputRow}>
              <TextInput
                style={[styles.commentInput, { backgroundColor: colors.background, color: colors.text }]}
                placeholder="Write a comment..."
                placeholderTextColor={colors.textSecondary}
                value={expandedPostId === post.id ? commentText : ''}
                onChangeText={setCommentText}
              />
              <TouchableOpacity
                style={[styles.commentSend, { backgroundColor: colors.primary }]}
                onPress={() => handleComment(post.id)}
              >
                <Send size={14} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }, [expandedPostId, commentText, colors, toggleLikePost, handleComment]);

  const renderFeedTab = () => (
    <View>
      <TouchableOpacity
        style={[styles.createPostBar, { backgroundColor: colors.surface }]}
        onPress={() => setShowCreatePost(true)}
      >
        <View style={styles.createPostLeft}>
          <View style={[styles.createPostAvatarWrap]}>
            {renderProfileImage()}
          </View>
          <Text style={[styles.createPostPlaceholder, { color: colors.textSecondary }]}>
            {"What's on your mind?"}
          </Text>
        </View>
        <View style={styles.createPostIcons}>
          <TouchableOpacity onPress={() => setShowCreatePost(true)}>
            <ImagePlus size={22} color="#10B981" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowCreatePost(true)}>
            <Video size={22} color="#3B82F6" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {paginatedPosts.map(renderPost)}

      {paginatedPosts.length < posts.length && (
        <TouchableOpacity
          style={[styles.loadMoreButton, { backgroundColor: colors.surface }]}
          onPress={() => setFeedPage(p => p + 1)}
        >
          <Text style={[styles.loadMoreText, { color: colors.primary }]}>Load More</Text>
        </TouchableOpacity>
      )}

      {paginatedPosts.length === 0 && (
        <View style={styles.emptyFeed}>
          <MessageCircle size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyFeedTitle, { color: colors.text }]}>No posts yet</Text>
          <Text style={[styles.emptyFeedSub, { color: colors.textSecondary }]}>
            Add friends or create your first post!
          </Text>
        </View>
      )}
    </View>
  );

  const renderFriendsTab = () => (
    <View>
      {pendingRequests.length > 0 && (
        <TouchableOpacity
          style={[styles.requestsBanner, { backgroundColor: '#EF444415' }]}
          onPress={() => setShowFriendRequests(true)}
        >
          <UserPlus size={20} color="#EF4444" />
          <Text style={[styles.requestsBannerText, { color: '#EF4444' }]}>
            {pendingRequests.length} friend request{pendingRequests.length > 1 ? 's' : ''}
          </Text>
          <ChevronRight size={18} color="#EF4444" />
        </TouchableOpacity>
      )}

      <Text style={[styles.friendsSectionTitle, { color: colors.text }]}>
        Friends ({friends.length})
      </Text>

      {friends.map(friend => (
        <TouchableOpacity
          key={friend.id}
          style={[styles.friendCard, { backgroundColor: colors.surface }]}
          activeOpacity={0.7}
          onPress={() => router.push(`/owner-profile?id=${friend.id}` as any)}
        >
          <View style={styles.friendAvatarWrap}>
            <Image source={{ uri: friend.avatar }} style={styles.friendAvatar} />
            {friend.isOnline && <View style={styles.onlineDot} />}
          </View>
          <View style={styles.friendInfo}>
            <Text style={[styles.friendName, { color: colors.text }]}>{friend.name}</Text>
            <View style={styles.friendMeta}>
              {friend.city && (
                <View style={styles.friendMetaItem}>
                  <MapPin size={11} color={colors.textSecondary} />
                  <Text style={[styles.friendMetaText, { color: colors.textSecondary }]}>{friend.city}</Text>
                </View>
              )}
              <View style={styles.friendMetaItem}>
                <Star size={11} color="#F59E0B" />
                <Text style={[styles.friendMetaText, { color: colors.textSecondary }]}>Lv.{friend.level}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.friendScoreBadge, { backgroundColor: creditTier.color + '15' }]}>
            <Text style={[styles.friendScore, { color: creditTier.color }]}>{friend.creditScore}</Text>
          </View>
          <TouchableOpacity
            style={styles.friendRemoveBtn}
            onPress={(e) => {
              e.stopPropagation();
              Alert.alert('Remove Friend', `Remove ${friend.name} from your friends?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => removeFriend(friend.id) },
              ]);
            }}
          >
            <MoreHorizontal size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}

      {friendSuggestions.length > 0 && (
        <>
          <Text style={[styles.friendsSectionTitle, { color: colors.text, marginTop: 24 }]}>
            People You May Know
          </Text>
          {friendSuggestions.map(suggestion => (
            <View key={suggestion.id} style={[styles.friendCard, { backgroundColor: colors.surface }]}>
              <Image source={{ uri: suggestion.avatar }} style={styles.friendAvatar} />
              <View style={styles.friendInfo}>
                <Text style={[styles.friendName, { color: colors.text }]}>{suggestion.name}</Text>
                <View style={styles.friendMeta}>
                  {suggestion.city && (
                    <View style={styles.friendMetaItem}>
                      <MapPin size={11} color={colors.textSecondary} />
                      <Text style={[styles.friendMetaText, { color: colors.textSecondary }]}>{suggestion.city}</Text>
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={[styles.addFriendBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  sendFriendRequest(suggestion.id);
                }}
              >
                <UserPlus size={14} color="#FFF" />
                <Text style={styles.addFriendBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      {friends.length === 0 && friendSuggestions.length === 0 && (
        <View style={styles.emptyFeed}>
          <Users size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyFeedTitle, { color: colors.text }]}>No friends yet</Text>
          <Text style={[styles.emptyFeedSub, { color: colors.textSecondary }]}>
            Check back for friend suggestions!
          </Text>
        </View>
      )}
    </View>
  );

  const renderAboutTab = () => (
    <View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Lifestyle</Text>
      <View style={[styles.lifestyleCard, { backgroundColor: colors.surface }]}>
        <View style={styles.lifestyleRow}>
          <View style={[styles.lifestyleIcon, { backgroundColor: '#3B82F620' }]}>
            <Home size={24} color="#3B82F6" />
          </View>
          <View style={styles.lifestyleInfo}>
            <Text style={[styles.lifestyleTitle, { color: colors.text }]}>{gameState.lifestyle.housingName}</Text>
            <Text style={[styles.lifestyleSubtitle, { color: colors.textSecondary }]}>
              {gameState.lifestyle.housingType === 'shared_rental' ? 'Shared Renter' :
               gameState.lifestyle.housingType === 'renting' ? 'Renting' :
               gameState.lifestyle.housingType === 'owns_condo' ? 'Owns Condo' :
               gameState.lifestyle.housingType === 'owns_house' ? 'Owns House' :
               gameState.lifestyle.housingType === 'owns_luxury' ? 'Owns Luxury Property' :
               gameState.lifestyle.housingType === 'homeless' ? 'No Housing' : 'Shared Renter'}
            </Text>
          </View>
          <Text style={[styles.lifestyleValue, { color: colors.text }]}>{formatCurrency(gameState.lifestyle.totalPropertyValue)}</Text>
        </View>
        <View style={[styles.lifestyleDivider, { backgroundColor: colors.border }]} />
        <View style={styles.lifestyleRow}>
          <View style={[styles.lifestyleIcon, { backgroundColor: '#10B98120' }]}>
            <Car size={24} color="#10B981" />
          </View>
          <View style={styles.lifestyleInfo}>
            <Text style={[styles.lifestyleTitle, { color: colors.text }]}>{gameState.lifestyle.vehicleName}</Text>
            <Text style={[styles.lifestyleSubtitle, { color: colors.textSecondary }]}>
              {gameState.lifestyle.vehicleType === 'none' ? 'No Vehicle' :
               gameState.lifestyle.vehicleType === 'financed' ? 'Financed' : 'Owned Outright'}
            </Text>
          </View>
          <Text style={[styles.lifestyleValue, { color: colors.text }]}>{formatCurrency(gameState.lifestyle.totalVehicleValue)}</Text>
        </View>
        <View style={[styles.lifestyleDivider, { backgroundColor: colors.border }]} />
        <View style={styles.lifestyleRow}>
          <View style={[styles.lifestyleIcon, { backgroundColor: '#9333EA20' }]}>
            <Shirt size={24} color="#9333EA" />
          </View>
          <View style={styles.lifestyleInfo}>
            <Text style={[styles.lifestyleTitle, { color: colors.text }]}>
              {gameState.lifestyle.fashionStyle.charAt(0).toUpperCase() + gameState.lifestyle.fashionStyle.slice(1)} Fashion
            </Text>
            <Text style={[styles.lifestyleSubtitle, { color: colors.textSecondary }]}>
              {gameState.ownedClothing.length} items owned
            </Text>
          </View>
          <Text style={[styles.lifestyleValue, { color: colors.text }]}>{formatCurrency(gameState.lifestyle.totalClothingValue)}</Text>
        </View>
        <View style={[styles.lifestyleDivider, { backgroundColor: colors.border }]} />
        <View style={styles.lifestyleRow}>
          <View style={[styles.lifestyleIcon, { backgroundColor: '#F59E0B20' }]}>
            <GraduationCap size={24} color="#F59E0B" />
          </View>
          <View style={styles.lifestyleInfo}>
            <Text style={[styles.lifestyleTitle, { color: colors.text }]}>
              {educationState.currentEnrollment
                ? `${allSchools.find(s => s.id === educationState.currentEnrollment?.schoolId)?.name || 'Enrolled'}`
                : educationState.completedDegrees.length > 0
                  ? `${getDegreeDisplayName(educationState.completedDegrees[educationState.completedDegrees.length - 1].degreeType)} Degree`
                  : 'No Education'}
            </Text>
            <Text style={[styles.lifestyleSubtitle, { color: colors.textSecondary }]}>
              {educationState.currentEnrollment
                ? `GPA: ${educationState.currentEnrollment.gpa.toFixed(2)} · Semester ${educationState.currentEnrollment.currentSemester}/${educationState.currentEnrollment.totalSemesters}`
                : educationState.completedDegrees.length > 0
                  ? `${educationState.completedDegrees.length} degree${educationState.completedDegrees.length > 1 ? 's' : ''} earned`
                  : 'Enroll to boost career'}
            </Text>
          </View>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Analytics</Text>
      <View style={styles.analyticsGrid}>
        <View style={[styles.analyticsCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.analyticsIcon, { backgroundColor: '#3B82F620' }]}>
            <CreditCard size={20} color="#3B82F6" />
          </View>
          <Text style={[styles.analyticsValue, { color: colors.text }]}>{gameState.creditAccounts.length}</Text>
          <Text style={[styles.analyticsLabel, { color: colors.textSecondary }]}>Credit Accounts</Text>
        </View>
        <View style={[styles.analyticsCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.analyticsIcon, { backgroundColor: '#10B98120' }]}>
            <PiggyBank size={20} color="#10B981" />
          </View>
          <Text style={[styles.analyticsValue, { color: colors.text }]}>{formatCurrency(gameState.savingsBalance + gameState.emergencyFund)}</Text>
          <Text style={[styles.analyticsLabel, { color: colors.textSecondary }]}>Total Savings</Text>
        </View>
        <View style={[styles.analyticsCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.analyticsIcon, { backgroundColor: '#F59E0B20' }]}>
            <Briefcase size={20} color="#F59E0B" />
          </View>
          <Text style={[styles.analyticsValue, { color: colors.text }]}>{formatCurrency(gameState.monthlyIncome)}</Text>
          <Text style={[styles.analyticsLabel, { color: colors.textSecondary }]}>Monthly Income</Text>
        </View>
        <View style={[styles.analyticsCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.analyticsIcon, { backgroundColor: '#EF444420' }]}>
            <Target size={20} color="#EF4444" />
          </View>
          <Text style={[styles.analyticsValue, { color: colors.text }]}>{gameState.consecutiveOnTimePayments}</Text>
          <Text style={[styles.analyticsLabel, { color: colors.textSecondary }]}>Payment Streak</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Home Management</Text>
      <View style={[styles.homeManagementCard, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={styles.homeManagementRow}
          onPress={() => {
            if (gameState.lifestyle.housingType === 'homeless') {
              Alert.alert('No Housing', 'You need to rent a home first.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Browse Rentals', onPress: () => router.push('/game/real-estate' as any) }
              ]);
            } else {
              setShowHousingModal(true);
            }
          }}
        >
          <View style={[styles.homeManagementIcon, { backgroundColor: '#3B82F620' }]}>
            <Home size={22} color="#3B82F6" />
          </View>
          <View style={styles.homeManagementInfo}>
            <Text style={[styles.homeManagementTitle, { color: colors.text }]}>Housing</Text>
            <Text style={[styles.homeManagementSubtitle, { color: colors.textSecondary }]}>
              {gameState.lifestyle.housingType === 'homeless' ? 'No current housing' :
               gameState.lifestyle.housingType === 'shared_rental' ?
                 (gameState.lifestyle.sharedRental ?
                   `${gameState.lifestyle.sharedRental.apartmentNumber} in ${gameState.lifestyle.cityName || 'City'}` :
                   'Shared Rental') :
               gameState.lifestyle.housingName || 'Renting'}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={[styles.homeManagementDivider, { backgroundColor: colors.border }]} />
        <TouchableOpacity
          style={styles.homeManagementRow}
          onPress={() => router.push('/game/home-browser' as any)}
        >
          <View style={[styles.homeManagementIcon, { backgroundColor: '#10B98120' }]}>
            <Eye size={22} color="#10B981" />
          </View>
          <View style={styles.homeManagementInfo}>
            <Text style={[styles.homeManagementTitle, { color: colors.text }]}>{"Browse Friends' Homes"}</Text>
            <Text style={[styles.homeManagementSubtitle, { color: colors.textSecondary }]}>
              {"Visit your friends' homes"}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Settings</Text>
      <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
        <TouchableOpacity style={styles.settingsRow} onPress={() => setShowSettingsModal(true)}>
          <View style={[styles.settingsIcon, { backgroundColor: '#3B82F620' }]}>
            <Settings size={20} color="#3B82F6" />
          </View>
          <Text style={[styles.settingsLabel, { color: colors.text }]}>Game Mode & Profile</Text>
          <ChevronRight size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={[styles.settingsDivider, { backgroundColor: colors.border }]} />
        <TouchableOpacity style={styles.settingsRow} onPress={() => setShowAlertsModal(true)}>
          <View style={[styles.settingsIcon, { backgroundColor: '#F59E0B20' }]}>
            <Bell size={20} color="#F59E0B" />
          </View>
          <Text style={[styles.settingsLabel, { color: colors.text }]}>Alerts & Reminders</Text>
          <ChevronRight size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={[styles.settingsDivider, { backgroundColor: colors.border }]} />
        <View style={styles.settingsRow}>
          <View style={[styles.settingsIcon, { backgroundColor: '#EF444420' }]}>
            <Heart size={20} color="#EF4444" />
          </View>
          <View style={styles.healthInfo}>
            <Text style={[styles.settingsLabel, { color: colors.text }]}>Health Status</Text>
            <Text style={[styles.healthValue, { color: gameState.healthStatus.level > 50 ? '#10B981' : '#EF4444' }]}>
              {gameState.healthStatus.level}%{gameState.healthStatus.isHospitalized && ' (Hospitalized)'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'My Profile' }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Animated.View style={[styles.profileCard, { backgroundColor: colors.surface, transform: [{ scale: scaleAnim }], opacity: fadeAnim }]}>
            <View style={styles.profileHeader}>
              <TouchableOpacity style={styles.avatarWrapper} onPress={() => setShowAvatarEditor(true)}>
                {renderProfileImage()}
                <View style={[styles.editBadge, { backgroundColor: colors.primary }]}>
                  <Edit3 size={12} color="#FFF" />
                </View>
              </TouchableOpacity>
              <View style={styles.profileInfo}>
                {isEditingName ? (
                  <View style={styles.nameEditContainer}>
                    <TextInput
                      style={[styles.nameInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.primary }]}
                      value={editedName}
                      onChangeText={setEditedName}
                      autoFocus
                      maxLength={20}
                      selectTextOnFocus
                    />
                    <TouchableOpacity
                      style={[styles.nameEditButton, { backgroundColor: '#10B981' }]}
                      onPress={() => {
                        if (editedName.trim()) updatePlayerName(editedName.trim());
                        setIsEditingName(false);
                      }}
                    >
                      <Check size={16} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.nameEditButton, { backgroundColor: '#EF4444' }]}
                      onPress={() => { setEditedName(gameState.playerName); setIsEditingName(false); }}
                    >
                      <X size={16} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.nameContainer}
                    onPress={() => { setEditedName(gameState.playerName); setIsEditingName(true); }}
                  >
                    <Text style={[styles.playerName, { color: colors.text }]}>{gameState.playerName}</Text>
                    <Edit3 size={14} color={colors.textSecondary} style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                )}
                <View style={[styles.lifestyleBadge, { backgroundColor: getLifestyleColor() + '20' }]}>
                  <LifestyleIcon size={14} color={getLifestyleColor()} />
                  <Text style={[styles.lifestyleText, { color: getLifestyleColor() }]}>
                    {gameState.lifestyle.fashionStyle.charAt(0).toUpperCase() + gameState.lifestyle.fashionStyle.slice(1)} Lifestyle
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.visibilityToggle, { backgroundColor: colors.background }]}
                onPress={togglePublicProfile}
              >
                {gameState.isPublicProfile ? <Eye size={20} color={colors.primary} /> : <EyeOff size={20} color={colors.textSecondary} />}
              </TouchableOpacity>
            </View>

            <View style={styles.profileStatsRow}>
              <View style={styles.profileStatItem}>
                <Text style={[styles.profileStatNumber, { color: colors.text }]}>{friends.length}</Text>
                <Text style={[styles.profileStatLabel, { color: colors.textSecondary }]}>Friends</Text>
              </View>
              <View style={[styles.profileStatDivider, { backgroundColor: colors.border }]} />
              <View style={styles.profileStatItem}>
                <Text style={[styles.profileStatNumber, { color: creditTier.color }]}>{gameState.creditScores.composite}</Text>
                <Text style={[styles.profileStatLabel, { color: colors.textSecondary }]}>Credit Score</Text>
              </View>
              <View style={[styles.profileStatDivider, { backgroundColor: colors.border }]} />
              <View style={styles.profileStatItem}>
                <Text style={[styles.profileStatNumber, { color: colors.text }]}>{myPosts.length + posts.filter(p => p.authorId === 'player').length}</Text>
                <Text style={[styles.profileStatLabel, { color: colors.textSecondary }]}>Posts</Text>
              </View>
              <View style={[styles.profileStatDivider, { backgroundColor: colors.border }]} />
              <View style={styles.profileStatItem}>
                <Text style={[styles.profileStatNumber, { color: colors.text }]}>{gameState.monthsPlayed}</Text>
                <Text style={[styles.profileStatLabel, { color: colors.textSecondary }]}>Months</Text>
              </View>
            </View>
          </Animated.View>

          <View style={[styles.tabBar, { backgroundColor: colors.surface }]}>
            <Animated.View
              style={[
                styles.tabIndicator,
                { backgroundColor: colors.primary, transform: [{ translateX: tabIndicatorAnim }] },
              ]}
            />
            {(['feed', 'friends', 'about'] as ProfileTab[]).map(tab => (
              <TouchableOpacity
                key={tab}
                style={styles.tabItem}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTab(tab);
                }}
              >
                <Text style={[styles.tabText, { color: activeTab === tab ? '#FFFFFF' : colors.textSecondary }]}>
                  {tab === 'feed' ? 'Feed' : tab === 'friends' ? `Friends` : 'About'}
                </Text>
                {tab === 'friends' && pendingRequests.length > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{pendingRequests.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'feed' && renderFeedTab()}
          {activeTab === 'friends' && renderFriendsTab()}
          {activeTab === 'about' && renderAboutTab()}

          <View style={styles.bottomPadding} />
        </ScrollView>

        <Modal visible={showCreatePost} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <View style={styles.createPostHeader}>
                <TouchableOpacity onPress={() => { setShowCreatePost(false); setNewPostText(''); setNewPostMedia([]); }}>
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Create Post</Text>
                <TouchableOpacity
                  style={[styles.postSubmitBtn, { backgroundColor: (newPostText.trim() || newPostMedia.length > 0) ? colors.primary : colors.border }]}
                  onPress={handleCreatePost}
                  disabled={!newPostText.trim() && newPostMedia.length === 0}
                >
                  <Text style={styles.postSubmitText}>Post</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={[styles.postInput, { color: colors.text }]}
                placeholder="Share your financial journey..."
                placeholderTextColor={colors.textSecondary}
                multiline
                value={newPostText}
                onChangeText={setNewPostText}
                autoFocus
              />

              {newPostMedia.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaPreviewRow}>
                  {newPostMedia.map((m, idx) => (
                    <View key={m.id} style={styles.mediaPreviewItem}>
                      <Image source={{ uri: m.uri }} style={styles.mediaPreviewImage} />
                      <TouchableOpacity
                        style={styles.mediaRemoveBtn}
                        onPress={() => setNewPostMedia(prev => prev.filter((_, i) => i !== idx))}
                      >
                        <X size={14} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}

              <View style={[styles.mediaActions, { borderTopColor: colors.border }]}>
                <TouchableOpacity style={styles.mediaActionBtn} onPress={pickPostMedia}>
                  <ImagePlus size={22} color="#10B981" />
                  <Text style={[styles.mediaActionText, { color: colors.text }]}>Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mediaActionBtn} onPress={pickPostMedia}>
                  <Video size={22} color="#3B82F6" />
                  <Text style={[styles.mediaActionText, { color: colors.text }]}>Video</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={showFriendRequests} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Friend Requests</Text>
              <ScrollView style={{ maxHeight: 400 }}>
                {pendingRequests.map(req => (
                  <View key={req.id} style={[styles.requestCard, { backgroundColor: colors.background }]}>
                    <Image source={{ uri: req.from.avatar }} style={styles.friendAvatar} />
                    <View style={styles.friendInfo}>
                      <Text style={[styles.friendName, { color: colors.text }]}>{req.from.name}</Text>
                      <Text style={[styles.friendMetaText, { color: colors.textSecondary }]}>
                        {formatTimeAgo(req.sentAt)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.acceptBtn, { backgroundColor: '#10B981' }]}
                      onPress={() => { acceptFriendRequest(req.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
                    >
                      <UserCheck size={14} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.declineBtn, { backgroundColor: '#EF444420' }]}
                      onPress={() => declineFriendRequest(req.id)}
                    >
                      <UserX size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
                {pendingRequests.length === 0 && (
                  <Text style={[styles.emptyFeedSub, { color: colors.textSecondary, textAlign: 'center', paddingVertical: 20 }]}>
                    No pending requests
                  </Text>
                )}
              </ScrollView>
              <TouchableOpacity
                style={[styles.modalCloseButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowFriendRequests(false)}
              >
                <Text style={styles.modalCloseButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={showAvatarEditor} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Profile Picture</Text>
              <View style={styles.avatarPreviewLarge}>{renderProfileImage()}</View>
              <View style={styles.photoOptions}>
                <TouchableOpacity
                  style={[styles.photoOptionButton, { backgroundColor: !gameState.useCustomPhoto ? colors.primary : colors.background }]}
                  onPress={() => toggleUseCustomPhoto(false)}
                >
                  <User size={20} color={!gameState.useCustomPhoto ? '#FFF' : colors.text} />
                  <Text style={[styles.photoOptionText, { color: !gameState.useCustomPhoto ? '#FFF' : colors.text }]}>Use Avatar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.photoOptionButton, { backgroundColor: gameState.useCustomPhoto ? colors.primary : colors.background }]}
                  onPress={pickImage}
                >
                  <Camera size={20} color={gameState.useCustomPhoto ? '#FFF' : colors.text} />
                  <Text style={[styles.photoOptionText, { color: gameState.useCustomPhoto ? '#FFF' : colors.text }]}>Upload Photo</Text>
                </TouchableOpacity>
              </View>
              {!gameState.useCustomPhoto && (
                <>
                  <Text style={[styles.customizeTitle, { color: colors.text }]}>Customize Avatar</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryTabs}>
                    {[
                      { key: 'skinTone', label: 'Skin', icon: Palette },
                      { key: 'hairColor', label: 'Hair Color', icon: Palette },
                      { key: 'hairStyle', label: 'Hair Style', icon: Scissors },
                      { key: 'eyeColor', label: 'Eyes', icon: Eye },
                      { key: 'glasses', label: 'Glasses', icon: Glasses },
                      { key: 'facialHair', label: 'Facial Hair', icon: User },
                    ].map(cat => (
                      <TouchableOpacity
                        key={cat.key}
                        style={[styles.categoryTab, { backgroundColor: editingCategory === cat.key ? colors.primary : colors.background }]}
                        onPress={() => setEditingCategory(cat.key)}
                      >
                        <cat.icon size={16} color={editingCategory === cat.key ? '#FFF' : colors.text} />
                        <Text style={[styles.categoryTabText, { color: editingCategory === cat.key ? '#FFF' : colors.text }]}>{cat.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <View style={styles.optionsContainer}>
                    {editingCategory === 'skinTone' && (
                      <View style={styles.colorGrid}>
                        {SKIN_TONES.map(color => renderColorOption(color, gameState.avatar.skinTone === color, () => handleAvatarUpdate('skinTone', color)))}
                      </View>
                    )}
                    {editingCategory === 'hairColor' && (
                      <View style={styles.colorGrid}>
                        {HAIR_COLORS.map(color => renderColorOption(color, gameState.avatar.hairColor === color, () => handleAvatarUpdate('hairColor', color)))}
                      </View>
                    )}
                    {editingCategory === 'eyeColor' && (
                      <View style={styles.colorGrid}>
                        {EYE_COLORS.map(color => renderColorOption(color, gameState.avatar.eyeColor === color, () => handleAvatarUpdate('eyeColor', color)))}
                      </View>
                    )}
                    {editingCategory === 'hairStyle' && (
                      <View style={styles.textGrid}>
                        {HAIR_STYLES.map(style => renderTextOption(style, style.charAt(0).toUpperCase() + style.slice(1), gameState.avatar.hairStyle === style, () => handleAvatarUpdate('hairStyle', style)))}
                      </View>
                    )}
                    {editingCategory === 'glasses' && (
                      <View style={styles.textGrid}>
                        {GLASSES_OPTIONS.map(opt => renderTextOption(opt, opt.charAt(0).toUpperCase() + opt.slice(1).replace('_', ' '), gameState.avatar.glasses === opt, () => handleAvatarUpdate('glasses', opt)))}
                      </View>
                    )}
                    {editingCategory === 'facialHair' && (
                      <View style={styles.textGrid}>
                        {FACIAL_HAIR_OPTIONS.map(opt => renderTextOption(opt, opt.charAt(0).toUpperCase() + opt.slice(1).replace('_', ' '), gameState.avatar.facialHair === opt, () => handleAvatarUpdate('facialHair', opt)))}
                      </View>
                    )}
                  </View>
                </>
              )}
              <TouchableOpacity
                style={[styles.modalCloseButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowAvatarEditor(false)}
              >
                <Text style={styles.modalCloseButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={showSettingsModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Game Settings</Text>
              <View style={styles.settingSection}>
                <Text style={[styles.settingSectionTitle, { color: colors.textSecondary }]}>Game Mode</Text>
                <View style={[styles.gameModeDisplay, { backgroundColor: colors.background }]}>
                  <Target size={20} color={colors.primary} />
                  <View style={styles.gameModeDisplayInfo}>
                    <Text style={[styles.gameModeText, { color: colors.text }]}>Simulation Mode</Text>
                    <Text style={[styles.gameModeDesc, { color: colors.textSecondary }]}>
                      Experience realistic financial scenarios with simulated data
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowSettingsModal(false)}
              >
                <Text style={styles.modalCloseButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={showAlertsModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Alerts & Reminders</Text>
              <ScrollView style={styles.alertsList}>
                {gameState.alerts.map(alert => (
                  <View key={alert.id} style={[styles.alertItem, { backgroundColor: colors.background }]}>
                    <View style={styles.alertInfo}>
                      <Bell size={18} color={alert.enabled ? colors.primary : colors.textSecondary} />
                      <View style={styles.alertTextContainer}>
                        <Text style={[styles.alertName, { color: colors.text }]}>{alert.name}</Text>
                        {alert.dayOfMonth && (
                          <Text style={[styles.alertDay, { color: colors.textSecondary }]}>Day {alert.dayOfMonth} of each month</Text>
                        )}
                        {alert.type === 'groceries_low' && (
                          <Text style={[styles.alertDay, { color: colors.textSecondary }]}>Warns before month end</Text>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => updateAlert(alert.id, { enabled: !alert.enabled })}>
                      {alert.enabled ? <ToggleRight size={32} color={colors.primary} /> : <ToggleLeft size={32} color={colors.textSecondary} />}
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[styles.modalCloseButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowAlertsModal(false)}
              >
                <Text style={styles.modalCloseButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <HousingDetailsModal
          visible={showHousingModal}
          onClose={() => setShowHousingModal(false)}
          onEditHome={() => {
            if (gameState.lifestyle.housingType === 'renting' || gameState.lifestyle.housingType === 'shared_rental') {
              router.push('/game/home-editor' as any);
            } else {
              router.push('/game/real-estate' as any);
            }
          }}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  profileCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatarWrapper: { position: 'relative' },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarHead: { width: 50, height: 50, borderRadius: 25, position: 'relative' },
  avatarHair: {
    position: 'absolute',
    top: -5,
    left: 5,
    right: 5,
    height: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  avatarFace: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 15 },
  avatarEye: { width: 8, height: 8, borderRadius: 4 },
  avatarGlasses: {
    position: 'absolute',
    top: 12,
    left: 5,
    right: 5,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  glassesLens: { width: 14, height: 10, borderRadius: 5, borderWidth: 2 },
  avatarBeard: {
    position: 'absolute',
    bottom: 5,
    left: 10,
    right: 10,
    height: 10,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  avatarOutfit: {
    position: 'absolute',
    bottom: 0,
    left: 15,
    right: 15,
    height: 20,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: { flex: 1, marginLeft: 16 },
  playerName: { fontSize: 22, fontWeight: '700' as const },
  nameContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  nameEditContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  nameInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600' as const,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 2,
  },
  nameEditButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lifestyleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  lifestyleText: { fontSize: 12, fontWeight: '600' as const },
  visibilityToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.1)',
  },
  profileStatItem: { alignItems: 'center', flex: 1 },
  profileStatNumber: { fontSize: 20, fontWeight: '800' as const },
  profileStatLabel: { fontSize: 11, marginTop: 2 },
  profileStatDivider: { width: 1, height: 36 },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: (SCREEN_WIDTH - 32 - 8) / 3,
    height: 40,
    borderRadius: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 4,
    zIndex: 1,
  },
  tabText: { fontSize: 14, fontWeight: '600' as const },
  tabBadge: {
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' as const },
  createPostBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
  },
  createPostLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  createPostAvatarWrap: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden' },
  createPostPlaceholder: { fontSize: 14, marginLeft: 12 },
  createPostIcons: { flexDirection: 'row', gap: 16 },
  postCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  postAvatar: { width: 40, height: 40, borderRadius: 20 },
  postAuthorInfo: { flex: 1, marginLeft: 10 },
  postAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  postAuthorName: { fontSize: 15, fontWeight: '700' as const },
  postBadge: { fontSize: 14 },
  postTime: { fontSize: 12, marginTop: 1 },
  postMore: { padding: 4 },
  postText: { fontSize: 15, lineHeight: 22, paddingHorizontal: 14, paddingBottom: 12 },
  postMediaContainer: { marginBottom: 2 },
  postMediaSingle: { width: '100%', height: 280 },
  postMediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  postMediaGridItem: { width: '49%' as any, height: 160, position: 'relative' },
  postMediaGridImage: { width: '100%', height: '100%' },
  moreMediaOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreMediaText: { color: '#FFF', fontSize: 22, fontWeight: '700' as const },
  postActions: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 24,
  },
  postAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  postActionText: { fontSize: 13, fontWeight: '600' as const },
  commentsSection: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1 },
  commentItem: { flexDirection: 'row', marginTop: 10, gap: 8 },
  commentAvatar: { width: 28, height: 28, borderRadius: 14 },
  commentBubble: { flex: 1, padding: 10, borderRadius: 14 },
  commentAuthor: { fontSize: 13, fontWeight: '600' as const },
  commentText: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  commentTime: { fontSize: 11, marginTop: 4 },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  commentInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, fontSize: 13 },
  commentSend: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  loadMoreButton: { padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  loadMoreText: { fontSize: 14, fontWeight: '600' as const },
  emptyFeed: { alignItems: 'center', paddingVertical: 48 },
  emptyFeedTitle: { fontSize: 18, fontWeight: '700' as const, marginTop: 12 },
  emptyFeedSub: { fontSize: 14, marginTop: 6 },
  requestsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    gap: 10,
  },
  requestsBannerText: { flex: 1, fontSize: 14, fontWeight: '600' as const },
  friendsSectionTitle: { fontSize: 16, fontWeight: '700' as const, marginBottom: 12 },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    gap: 10,
  },
  friendAvatarWrap: { position: 'relative' },
  friendAvatar: { width: 44, height: 44, borderRadius: 22 },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 15, fontWeight: '600' as const },
  friendMeta: { flexDirection: 'row', gap: 10, marginTop: 3 },
  friendMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  friendMetaText: { fontSize: 12 },
  friendScoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  friendScore: { fontSize: 14, fontWeight: '700' as const },
  friendRemoveBtn: { padding: 6 },
  addFriendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  addFriendBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' as const },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    gap: 10,
  },
  acceptBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' as const, marginBottom: 12 },
  lifestyleCard: { borderRadius: 16, padding: 16, marginBottom: 24 },
  lifestyleRow: { flexDirection: 'row', alignItems: 'center' },
  lifestyleIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lifestyleInfo: { flex: 1, marginLeft: 12 },
  lifestyleTitle: { fontSize: 15, fontWeight: '600' as const },
  lifestyleSubtitle: { fontSize: 12, marginTop: 2 },
  lifestyleValue: { fontSize: 14, fontWeight: '600' as const },
  lifestyleDivider: { height: 1, marginVertical: 12 },
  analyticsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  analyticsCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  analyticsIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  analyticsValue: { fontSize: 18, fontWeight: '700' as const },
  analyticsLabel: { fontSize: 12, marginTop: 4, textAlign: 'center' },
  homeManagementCard: { borderRadius: 16, marginBottom: 24, overflow: 'hidden' },
  homeManagementRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  homeManagementIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  homeManagementInfo: { flex: 1 },
  homeManagementTitle: { fontSize: 15, fontWeight: '600' as const },
  homeManagementSubtitle: { fontSize: 12, marginTop: 2 },
  homeManagementDivider: { height: 1, marginHorizontal: 14 },
  settingsCard: { borderRadius: 16, padding: 4, marginBottom: 24 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingsLabel: { fontSize: 15, fontWeight: '500' as const, flex: 1 },
  settingsDivider: { height: 1, marginHorizontal: 14 },
  healthInfo: { flex: 1 },
  healthValue: { fontSize: 13, fontWeight: '600' as const, marginTop: 2 },
  bottomPadding: { height: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalTitle: { fontSize: 22, fontWeight: '700' as const, textAlign: 'center', marginBottom: 16 },
  avatarPreviewLarge: { alignItems: 'center', marginBottom: 20 },
  categoryTabs: { marginBottom: 16 },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  categoryTabText: { fontSize: 13, fontWeight: '600' as const },
  optionsContainer: { minHeight: 100, marginBottom: 16 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#FFF',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  textGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  textOption: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  textOptionLabel: { fontSize: 13, fontWeight: '600' as const },
  modalCloseButton: { padding: 16, borderRadius: 12, alignItems: 'center' },
  modalCloseButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' as const },
  profilePhoto: { width: 80, height: 80, borderRadius: 40 },
  photoOptions: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  photoOptionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  photoOptionText: { fontSize: 14, fontWeight: '600' as const },
  customizeTitle: { fontSize: 16, fontWeight: '600' as const, marginBottom: 12, alignSelf: 'flex-start' },
  settingSection: { marginBottom: 20 },
  settingSectionTitle: { fontSize: 13, fontWeight: '500' as const, marginBottom: 12 },
  gameModeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  gameModeDisplayInfo: { flex: 1 },
  gameModeText: { fontSize: 14, fontWeight: '600' as const },
  gameModeDesc: { fontSize: 11, marginTop: 2 },
  alertsList: { maxHeight: 300, marginBottom: 16 },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  alertInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  alertTextContainer: { flex: 1 },
  alertName: { fontSize: 14, fontWeight: '600' as const },
  alertDay: { fontSize: 12, marginTop: 2 },
  createPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  postSubmitBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  postSubmitText: { color: '#FFF', fontSize: 14, fontWeight: '700' as const },
  postInput: { fontSize: 16, minHeight: 100, textAlignVertical: 'top' },
  mediaPreviewRow: { marginTop: 12, marginBottom: 12 },
  mediaPreviewItem: { width: 80, height: 80, borderRadius: 10, marginRight: 8, position: 'relative' },
  mediaPreviewImage: { width: 80, height: 80, borderRadius: 10 },
  mediaRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaActions: { flexDirection: 'row', gap: 24, paddingTop: 14, borderTopWidth: 1 },
  mediaActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mediaActionText: { fontSize: 14, fontWeight: '500' as const },
});
