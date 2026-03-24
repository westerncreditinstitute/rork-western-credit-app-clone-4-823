import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PlayerAvatar } from '@/types/game';

interface FullBodyAvatarProps {
  avatar: PlayerAvatar;
  size?: 'small' | 'medium' | 'large';
  showOutfit?: boolean;
}

export default function FullBodyAvatar({ avatar, size = 'medium', showOutfit = true }: FullBodyAvatarProps) {
  const dimensions = {
    small: { width: 80, height: 160 },
    medium: { width: 120, height: 240 },
    large: { width: 180, height: 360 },
  };

  const { width, height } = dimensions[size];
  const headSize = width * 0.5;
  const bodyWidth = width * 0.6;
  const legWidth = width * 0.22;

  const getHairStyle = () => {
    switch (avatar.hairStyle) {
      case 'long':
        return { height: headSize * 0.5, borderRadius: headSize * 0.3, top: -headSize * 0.15 };
      case 'medium':
        return { height: headSize * 0.35, borderRadius: headSize * 0.25, top: -headSize * 0.1 };
      case 'curly':
        return { height: headSize * 0.4, borderRadius: headSize * 0.5, top: -headSize * 0.12 };
      case 'wavy':
        return { height: headSize * 0.38, borderRadius: headSize * 0.3, top: -headSize * 0.1 };
      case 'ponytail':
        return { height: headSize * 0.3, borderRadius: headSize * 0.2, top: -headSize * 0.08 };
      case 'bun':
        return { height: headSize * 0.25, borderRadius: headSize * 0.5, top: -headSize * 0.1 };
      case 'braids':
        return { height: headSize * 0.45, borderRadius: headSize * 0.2, top: -headSize * 0.12 };
      case 'buzz':
        return { height: headSize * 0.15, borderRadius: headSize * 0.5, top: -headSize * 0.05 };
      case 'bald':
        return { height: 0, borderRadius: 0, top: 0 };
      default:
        return { height: headSize * 0.25, borderRadius: headSize * 0.3, top: -headSize * 0.08 };
    }
  };

  const hairStyle = getHairStyle();
  const topColor = avatar.outfit.top?.color || '#4B5563';
  const bottomColor = avatar.outfit.bottom?.color || '#1F2937';
  const shoesColor = avatar.outfit.shoes?.color || '#374151';
  const hatColor = avatar.outfit.hat?.color;
  const watchColor = avatar.outfit.watch?.color;
  const jewelryColor = avatar.outfit.jewelry?.color;

  return (
    <View style={[styles.container, { width, height }]}>
      {showOutfit && hatColor && (
        <View style={[styles.hat, { 
          backgroundColor: hatColor,
          width: headSize * 1.1,
          height: headSize * 0.35,
          top: headSize * 0.05,
          borderRadius: headSize * 0.15,
        }]} />
      )}

      <View style={[styles.head, { 
        width: headSize, 
        height: headSize, 
        borderRadius: headSize / 2,
        backgroundColor: avatar.skinTone,
        top: headSize * 0.35,
      }]}>
        {avatar.hairStyle !== 'bald' && (
          <View style={[styles.hair, {
            backgroundColor: avatar.hairColor,
            width: headSize * 0.85,
            height: hairStyle.height,
            borderTopLeftRadius: hairStyle.borderRadius,
            borderTopRightRadius: hairStyle.borderRadius,
            top: hairStyle.top,
          }]} />
        )}

        <View style={styles.faceContainer}>
          <View style={styles.eyesRow}>
            <View style={[styles.eye, { 
              backgroundColor: '#FFFFFF',
              width: headSize * 0.18,
              height: headSize * 0.12,
            }]}>
              <View style={[styles.pupil, { 
                backgroundColor: avatar.eyeColor,
                width: headSize * 0.08,
                height: headSize * 0.08,
              }]} />
            </View>
            <View style={[styles.eye, { 
              backgroundColor: '#FFFFFF',
              width: headSize * 0.18,
              height: headSize * 0.12,
            }]}>
              <View style={[styles.pupil, { 
                backgroundColor: avatar.eyeColor,
                width: headSize * 0.08,
                height: headSize * 0.08,
              }]} />
            </View>
          </View>

          {avatar.glasses && avatar.glasses !== 'none' && (
            <View style={[styles.glasses, { top: headSize * 0.25 }]}>
              <View style={[styles.glassLens, { 
                width: headSize * 0.22,
                height: headSize * 0.15,
                borderColor: avatar.glasses === 'sunglasses' ? '#000' : '#6B7280',
                backgroundColor: avatar.glasses === 'sunglasses' ? 'rgba(0,0,0,0.6)' : 'transparent',
              }]} />
              <View style={[styles.glassBridge, { 
                width: headSize * 0.08,
                backgroundColor: avatar.glasses === 'sunglasses' ? '#000' : '#6B7280',
              }]} />
              <View style={[styles.glassLens, { 
                width: headSize * 0.22,
                height: headSize * 0.15,
                borderColor: avatar.glasses === 'sunglasses' ? '#000' : '#6B7280',
                backgroundColor: avatar.glasses === 'sunglasses' ? 'rgba(0,0,0,0.6)' : 'transparent',
              }]} />
            </View>
          )}

          <View style={[styles.nose, {
            width: headSize * 0.08,
            height: headSize * 0.12,
            backgroundColor: avatar.skinTone,
            borderBottomColor: 'rgba(0,0,0,0.1)',
          }]} />

          <View style={[styles.mouth, {
            width: headSize * 0.2,
            height: headSize * 0.05,
            backgroundColor: '#D97706',
            borderRadius: headSize * 0.025,
          }]} />

          {avatar.facialHair && avatar.facialHair !== 'none' && (
            <View style={[styles.facialHair, {
              backgroundColor: avatar.hairColor + '90',
              width: avatar.facialHair === 'full_beard' ? headSize * 0.6 : 
                     avatar.facialHair === 'beard' ? headSize * 0.5 :
                     avatar.facialHair === 'goatee' ? headSize * 0.25 :
                     avatar.facialHair === 'mustache' ? headSize * 0.3 : headSize * 0.4,
              height: avatar.facialHair === 'full_beard' ? headSize * 0.25 :
                      avatar.facialHair === 'beard' ? headSize * 0.2 :
                      avatar.facialHair === 'goatee' ? headSize * 0.15 :
                      avatar.facialHair === 'mustache' ? headSize * 0.06 : headSize * 0.08,
              borderRadius: headSize * 0.1,
              bottom: avatar.facialHair === 'mustache' ? headSize * 0.18 : headSize * 0.05,
            }]} />
          )}
        </View>

        <View style={[styles.ear, styles.leftEar, { 
          backgroundColor: avatar.skinTone,
          width: headSize * 0.12,
          height: headSize * 0.18,
        }]} />
        <View style={[styles.ear, styles.rightEar, { 
          backgroundColor: avatar.skinTone,
          width: headSize * 0.12,
          height: headSize * 0.18,
        }]} />
      </View>

      <View style={[styles.neck, {
        backgroundColor: avatar.skinTone,
        width: headSize * 0.35,
        height: headSize * 0.2,
        top: headSize * 0.35 + headSize - 2,
      }]} />

      {showOutfit && jewelryColor && (
        <View style={[styles.necklace, {
          borderColor: jewelryColor,
          width: headSize * 0.5,
          height: headSize * 0.15,
          top: headSize * 0.35 + headSize + headSize * 0.1,
        }]} />
      )}

      <View style={[styles.torso, {
        backgroundColor: showOutfit ? topColor : avatar.skinTone,
        width: bodyWidth,
        height: height * 0.28,
        top: headSize * 0.35 + headSize + headSize * 0.15,
        borderTopLeftRadius: bodyWidth * 0.3,
        borderTopRightRadius: bodyWidth * 0.3,
      }]}>
        {showOutfit && avatar.outfit.top && (
          <>
            <View style={[styles.collar, {
              backgroundColor: topColor,
              borderColor: 'rgba(0,0,0,0.1)',
            }]} />
            <View style={[styles.shirtDetail, {
              backgroundColor: 'rgba(255,255,255,0.1)',
            }]} />
          </>
        )}
      </View>

      <View style={[styles.armsContainer, {
        top: headSize * 0.35 + headSize + headSize * 0.2,
        width: width,
      }]}>
        <View style={[styles.arm, styles.leftArm, {
          backgroundColor: showOutfit ? topColor : avatar.skinTone,
          width: bodyWidth * 0.25,
          height: height * 0.22,
        }]}>
          <View style={[styles.hand, {
            backgroundColor: avatar.skinTone,
            width: bodyWidth * 0.22,
            height: bodyWidth * 0.22,
          }]} />
          {showOutfit && watchColor && (
            <View style={[styles.watch, {
              backgroundColor: watchColor,
              width: bodyWidth * 0.2,
              height: bodyWidth * 0.12,
            }]} />
          )}
        </View>
        <View style={[styles.arm, styles.rightArm, {
          backgroundColor: showOutfit ? topColor : avatar.skinTone,
          width: bodyWidth * 0.25,
          height: height * 0.22,
        }]}>
          <View style={[styles.hand, {
            backgroundColor: avatar.skinTone,
            width: bodyWidth * 0.22,
            height: bodyWidth * 0.22,
          }]} />
        </View>
      </View>

      <View style={[styles.waist, {
        backgroundColor: showOutfit ? bottomColor : avatar.skinTone,
        width: bodyWidth * 0.95,
        height: height * 0.08,
        top: headSize * 0.35 + headSize + headSize * 0.15 + height * 0.28 - 2,
      }]}>
        {showOutfit && (
          <View style={[styles.belt, {
            backgroundColor: '#1F2937',
            width: bodyWidth * 0.85,
          }]}>
            <View style={[styles.beltBuckle, { backgroundColor: '#B8860B' }]} />
          </View>
        )}
      </View>

      <View style={[styles.legsContainer, {
        top: headSize * 0.35 + headSize + headSize * 0.15 + height * 0.28 + height * 0.06,
      }]}>
        <View style={[styles.leg, {
          backgroundColor: showOutfit ? bottomColor : avatar.skinTone,
          width: legWidth,
          height: height * 0.28,
          borderBottomLeftRadius: legWidth * 0.3,
          borderBottomRightRadius: legWidth * 0.3,
        }]} />
        <View style={[styles.leg, {
          backgroundColor: showOutfit ? bottomColor : avatar.skinTone,
          width: legWidth,
          height: height * 0.28,
          borderBottomLeftRadius: legWidth * 0.3,
          borderBottomRightRadius: legWidth * 0.3,
        }]} />
      </View>

      <View style={[styles.feetContainer, {
        top: headSize * 0.35 + headSize + headSize * 0.15 + height * 0.28 + height * 0.06 + height * 0.26,
      }]}>
        <View style={[styles.shoe, {
          backgroundColor: showOutfit ? shoesColor : '#1F2937',
          width: legWidth * 1.3,
          height: height * 0.06,
          borderRadius: height * 0.02,
        }]} />
        <View style={[styles.shoe, {
          backgroundColor: showOutfit ? shoesColor : '#1F2937',
          width: legWidth * 1.3,
          height: height * 0.06,
          borderRadius: height * 0.02,
        }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    position: 'relative',
  },
  hat: {
    position: 'absolute',
    zIndex: 10,
  },
  head: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  hair: {
    position: 'absolute',
  },
  faceContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: '15%',
  },
  eyesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 4,
  },
  eye: {
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pupil: {
    borderRadius: 100,
  },
  glasses: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  glassLens: {
    borderWidth: 2,
    borderRadius: 4,
  },
  glassBridge: {
    height: 2,
  },
  nose: {
    borderBottomWidth: 1,
    marginVertical: 2,
  },
  mouth: {
    marginTop: 4,
  },
  facialHair: {
    position: 'absolute',
  },
  ear: {
    position: 'absolute',
    borderRadius: 100,
    top: '35%',
  },
  leftEar: {
    left: -4,
  },
  rightEar: {
    right: -4,
  },
  neck: {
    position: 'absolute',
    zIndex: 2,
  },
  necklace: {
    position: 'absolute',
    borderWidth: 2,
    borderTopWidth: 0,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    zIndex: 6,
  },
  torso: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 3,
  },
  collar: {
    width: '60%',
    height: 8,
    borderRadius: 4,
    marginTop: 4,
    borderWidth: 1,
  },
  shirtDetail: {
    position: 'absolute',
    width: 2,
    height: '60%',
    top: '20%',
  },
  armsContainer: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  arm: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  leftArm: {
    marginLeft: 4,
  },
  rightArm: {
    marginRight: 4,
  },
  hand: {
    borderRadius: 100,
    marginBottom: -4,
  },
  watch: {
    position: 'absolute',
    bottom: '30%',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  waist: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  belt: {
    height: 6,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beltBuckle: {
    width: 10,
    height: 8,
    borderRadius: 2,
  },
  legsContainer: {
    position: 'absolute',
    flexDirection: 'row',
    gap: 6,
    zIndex: 1,
  },
  leg: {},
  feetContainer: {
    position: 'absolute',
    flexDirection: 'row',
    gap: 10,
    zIndex: 1,
  },
  shoe: {},
});
