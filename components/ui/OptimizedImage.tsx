import React from 'react';
import { Image, ImageProps, ImageContentFit } from 'expo-image';
import { StyleProp, ImageStyle } from 'react-native';

const blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

interface OptimizedImageProps {
  uri: string;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  transition?: number;
  placeholder?: string | null;
  priority?: 'low' | 'normal' | 'high';
  recyclingKey?: string;
  onLoad?: () => void;
  onError?: (error: { error: string }) => void;
  accessibilityLabel?: string;
  testID?: string;
}

export const OptimizedImage = React.memo(function OptimizedImage({
  uri,
  style,
  contentFit = 'cover',
  transition = 200,
  placeholder = blurhash,
  priority = 'normal',
  recyclingKey,
  onLoad,
  onError,
  accessibilityLabel,
  testID,
}: OptimizedImageProps) {
  if (!uri) {
    return null;
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      contentFit={contentFit}
      transition={transition}
      placeholder={placeholder ? { blurhash: placeholder } : undefined}
      cachePolicy="memory-disk"
      priority={priority}
      recyclingKey={recyclingKey}
      onLoad={onLoad}
      onError={onError}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    />
  );
});

export const AvatarImage = React.memo(function AvatarImage({
  uri,
  style,
  size = 40,
  onLoad,
  onError,
  testID,
}: {
  uri: string;
  style?: StyleProp<ImageStyle>;
  size?: number;
  onLoad?: () => void;
  onError?: (error: { error: string }) => void;
  testID?: string;
}) {
  return (
    <OptimizedImage
      uri={uri}
      style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
      contentFit="cover"
      transition={150}
      priority="normal"
      onLoad={onLoad}
      onError={onError}
      testID={testID}
    />
  );
});

export const ThumbnailImage = React.memo(function ThumbnailImage({
  uri,
  style,
  onLoad,
  onError,
  testID,
}: {
  uri: string;
  style?: StyleProp<ImageStyle>;
  onLoad?: () => void;
  onError?: (error: { error: string }) => void;
  testID?: string;
}) {
  return (
    <OptimizedImage
      uri={uri}
      style={style}
      contentFit="cover"
      transition={200}
      priority="low"
      onLoad={onLoad}
      onError={onError}
      testID={testID}
    />
  );
});

export const HeroImage = React.memo(function HeroImage({
  uri,
  style,
  onLoad,
  onError,
  testID,
}: {
  uri: string;
  style?: StyleProp<ImageStyle>;
  onLoad?: () => void;
  onError?: (error: { error: string }) => void;
  testID?: string;
}) {
  return (
    <OptimizedImage
      uri={uri}
      style={style}
      contentFit="cover"
      transition={300}
      priority="high"
      onLoad={onLoad}
      onError={onError}
      testID={testID}
    />
  );
});
