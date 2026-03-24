import { Animated, Easing } from 'react-native';
import { Vector3 } from '@/types/realEstate';

export interface AnimationConfig {
  duration: number;
  easing?: (value: number) => number;
  useNativeDriver?: boolean;
}

export const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
  duration: 300,
  easing: Easing.out(Easing.ease),
  useNativeDriver: true,
};

export const SLOW_ANIMATION_CONFIG: AnimationConfig = {
  duration: 600,
  easing: Easing.inOut(Easing.ease),
  useNativeDriver: true,
};

export const FAST_ANIMATION_CONFIG: AnimationConfig = {
  duration: 150,
  easing: Easing.out(Easing.ease),
  useNativeDriver: true,
};

export function createFadeAnimation(
  animatedValue: Animated.Value,
  toValue: number,
  config: AnimationConfig = DEFAULT_ANIMATION_CONFIG
): Animated.CompositeAnimation {
  return Animated.timing(animatedValue, {
    toValue,
    duration: config.duration,
    easing: config.easing,
    useNativeDriver: config.useNativeDriver ?? true,
  });
}

export function createSlideAnimation(
  animatedValue: Animated.Value,
  toValue: number,
  config: AnimationConfig = DEFAULT_ANIMATION_CONFIG
): Animated.CompositeAnimation {
  return Animated.timing(animatedValue, {
    toValue,
    duration: config.duration,
    easing: config.easing,
    useNativeDriver: config.useNativeDriver ?? true,
  });
}

export function createScaleAnimation(
  animatedValue: Animated.Value,
  toValue: number,
  config: AnimationConfig = DEFAULT_ANIMATION_CONFIG
): Animated.CompositeAnimation {
  return Animated.timing(animatedValue, {
    toValue,
    duration: config.duration,
    easing: config.easing,
    useNativeDriver: config.useNativeDriver ?? true,
  });
}

export function createSpringAnimation(
  animatedValue: Animated.Value,
  toValue: number,
  tension: number = 40,
  friction: number = 7
): Animated.CompositeAnimation {
  return Animated.spring(animatedValue, {
    toValue,
    tension,
    friction,
    useNativeDriver: true,
  });
}

export function createBounceAnimation(
  animatedValue: Animated.Value,
  config: AnimationConfig = DEFAULT_ANIMATION_CONFIG
): Animated.CompositeAnimation {
  return Animated.sequence([
    Animated.timing(animatedValue, {
      toValue: 1.1,
      duration: config.duration / 2,
      easing: Easing.out(Easing.ease),
      useNativeDriver: config.useNativeDriver ?? true,
    }),
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: config.duration / 2,
      easing: Easing.in(Easing.ease),
      useNativeDriver: config.useNativeDriver ?? true,
    }),
  ]);
}

export function createPulseAnimation(
  animatedValue: Animated.Value,
  minValue: number = 0.95,
  maxValue: number = 1.05,
  duration: number = 1000
): Animated.CompositeAnimation {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: maxValue,
        duration: duration / 2,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: minValue,
        duration: duration / 2,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ])
  );
}

export function createShakeAnimation(
  animatedValue: Animated.Value,
  intensity: number = 10,
  duration: number = 500
): Animated.CompositeAnimation {
  const shakeDuration = duration / 6;
  return Animated.sequence([
    Animated.timing(animatedValue, { toValue: intensity, duration: shakeDuration, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: -intensity, duration: shakeDuration, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: intensity / 2, duration: shakeDuration, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: -intensity / 2, duration: shakeDuration, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: intensity / 4, duration: shakeDuration, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: 0, duration: shakeDuration, useNativeDriver: true }),
  ]);
}

export interface CameraAnimationState {
  position: Animated.ValueXY;
  zoom: Animated.Value;
  isAnimating: boolean;
}

export function createCameraAnimationState(): CameraAnimationState {
  return {
    position: new Animated.ValueXY({ x: 0, y: 0 }),
    zoom: new Animated.Value(1),
    isAnimating: false,
  };
}

export function animateCameraTo(
  state: CameraAnimationState,
  targetX: number,
  targetY: number,
  duration: number = 1000,
  onComplete?: () => void
): void {
  state.isAnimating = true;
  
  Animated.parallel([
    Animated.timing(state.position.x, {
      toValue: targetX,
      duration,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }),
    Animated.timing(state.position.y, {
      toValue: targetY,
      duration,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }),
  ]).start(() => {
    state.isAnimating = false;
    onComplete?.();
  });
}

export function animateCameraZoom(
  state: CameraAnimationState,
  targetZoom: number,
  duration: number = 500,
  onComplete?: () => void
): void {
  state.isAnimating = true;
  
  Animated.timing(state.zoom, {
    toValue: targetZoom,
    duration,
    easing: Easing.inOut(Easing.ease),
    useNativeDriver: false,
  }).start(() => {
    state.isAnimating = false;
    onComplete?.();
  });
}

export function interpolateVector3(
  from: Vector3,
  to: Vector3,
  progress: number
): Vector3 {
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
    z: from.z + (to.z - from.z) * progress,
  };
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0
    ? 0
    : t === 1
    ? 1
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
}

export interface AnimatedPropertyMarker {
  scale: Animated.Value;
  opacity: Animated.Value;
  translateY: Animated.Value;
}

export function createAnimatedPropertyMarker(): AnimatedPropertyMarker {
  return {
    scale: new Animated.Value(0),
    opacity: new Animated.Value(0),
    translateY: new Animated.Value(20),
  };
}

export function animateMarkerEnter(
  marker: AnimatedPropertyMarker,
  delay: number = 0,
  onComplete?: () => void
): void {
  Animated.parallel([
    Animated.timing(marker.scale, {
      toValue: 1,
      duration: 300,
      delay,
      easing: Easing.out(Easing.back(1.5)),
      useNativeDriver: true,
    }),
    Animated.timing(marker.opacity, {
      toValue: 1,
      duration: 200,
      delay,
      useNativeDriver: true,
    }),
    Animated.timing(marker.translateY, {
      toValue: 0,
      duration: 300,
      delay,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }),
  ]).start(onComplete);
}

export function animateMarkerExit(
  marker: AnimatedPropertyMarker,
  onComplete?: () => void
): void {
  Animated.parallel([
    Animated.timing(marker.scale, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }),
    Animated.timing(marker.opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }),
  ]).start(onComplete);
}

export function animateMarkerSelect(
  marker: AnimatedPropertyMarker,
  onComplete?: () => void
): void {
  Animated.sequence([
    Animated.spring(marker.scale, {
      toValue: 1.3,
      tension: 100,
      friction: 5,
      useNativeDriver: true,
    }),
    Animated.spring(marker.scale, {
      toValue: 1.2,
      tension: 40,
      friction: 7,
      useNativeDriver: true,
    }),
  ]).start(onComplete);
}

export function animateMarkerDeselect(
  marker: AnimatedPropertyMarker,
  onComplete?: () => void
): void {
  Animated.spring(marker.scale, {
    toValue: 1,
    tension: 40,
    friction: 7,
    useNativeDriver: true,
  }).start(onComplete);
}

export interface TransitionAnimationValues {
  opacity: Animated.Value;
  translateX: Animated.Value;
  translateY: Animated.Value;
  scale: Animated.Value;
}

export function createTransitionAnimationValues(): TransitionAnimationValues {
  return {
    opacity: new Animated.Value(0),
    translateX: new Animated.Value(0),
    translateY: new Animated.Value(0),
    scale: new Animated.Value(1),
  };
}

export function animateModalIn(
  values: TransitionAnimationValues,
  fromBottom: boolean = true,
  onComplete?: () => void
): void {
  values.translateY.setValue(fromBottom ? 100 : -100);
  values.opacity.setValue(0);
  values.scale.setValue(0.9);

  Animated.parallel([
    Animated.timing(values.opacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }),
    Animated.spring(values.translateY, {
      toValue: 0,
      tension: 65,
      friction: 10,
      useNativeDriver: true,
    }),
    Animated.spring(values.scale, {
      toValue: 1,
      tension: 65,
      friction: 10,
      useNativeDriver: true,
    }),
  ]).start(onComplete);
}

export function animateModalOut(
  values: TransitionAnimationValues,
  toBottom: boolean = true,
  onComplete?: () => void
): void {
  Animated.parallel([
    Animated.timing(values.opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }),
    Animated.timing(values.translateY, {
      toValue: toBottom ? 100 : -100,
      duration: 200,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }),
    Animated.timing(values.scale, {
      toValue: 0.9,
      duration: 200,
      useNativeDriver: true,
    }),
  ]).start(onComplete);
}

export function createStaggeredAnimation(
  items: Animated.Value[],
  toValue: number,
  staggerDelay: number = 50,
  config: AnimationConfig = DEFAULT_ANIMATION_CONFIG
): Animated.CompositeAnimation {
  return Animated.stagger(
    staggerDelay,
    items.map(item =>
      Animated.timing(item, {
        toValue,
        duration: config.duration,
        easing: config.easing,
        useNativeDriver: config.useNativeDriver ?? true,
      })
    )
  );
}

export function resetAnimatedValue(value: Animated.Value, toValue: number = 0): void {
  value.setValue(toValue);
}

export function resetAnimatedValueXY(value: Animated.ValueXY, toX: number = 0, toY: number = 0): void {
  value.setValue({ x: toX, y: toY });
}
