import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GraduationCap, Mail, User, Phone, ArrowRight, CheckCircle, Shield, Lock, Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function RegisterScreen() {
  const { register, login } = useAuth();
  const { updateTier } = useSubscription();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedTier, setSelectedTier] = useState<'free' | 'ace1_student'>('free');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.toLowerCase());
  };

  const handleSubmit = async () => {
    setError('');
    
    if (mode === 'register') {
      if (!name.trim()) {
        setError('Please enter your name');
        return;
      }
      if (!password) {
        setError('Please enter a password');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    } else {
      if (!password) {
        setError('Please enter your password');
        return;
      }
    }
    
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    
    try {
      if (mode === 'register') {
        const result = await register({
          name: name.trim(),
          email: email.trim(),
          password: password,
          phone: phone.trim() || undefined,
          desiredTier: selectedTier,
        });

        if (result.success) {
          const tier = (result as any).tier || selectedTier || 'free';
          const durationDays = selectedTier === 'ace1_student' ? 60 : undefined;
          await updateTier(tier, durationDays);
          console.log('[Register] User registered as', tier, 'subscriber');
        } else {
          setError(result.error || 'Registration failed');
        }
      } else {
        const result = await login(email.trim(), password);
        
        if (result.success) {
          console.log('[Login] User logged in successfully');
        } else {
          setError(result.error || 'Login failed');
        }
      }
    } catch (err) {
      console.error('[Register/Login] Error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    'Weekly Credit Tips & Insights',
    'Community Forum Access',
    'Basic Credit Resources',
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A1628', '#1A365D', '#0A1628']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <View style={styles.backgroundPattern}>
        {[...Array(6)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.patternCircle,
              {
                top: Math.random() * height,
                left: Math.random() * width,
                opacity: 0.03 + Math.random() * 0.05,
                width: 100 + Math.random() * 200,
                height: 100 + Math.random() * 200,
              },
            ]}
          />
        ))}
      </View>

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View
              style={[
                styles.header,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={['#D4AF37', '#F4D03F', '#D4AF37']}
                  style={styles.logoGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <GraduationCap size={36} color="#0A1628" strokeWidth={2} />
                </LinearGradient>
              </View>
              
              <Text style={styles.title}>Western Credit Institute</Text>
              <Text style={styles.subtitle}>
                Master Your Credit. Transform Your Future.
              </Text>
            </Animated.View>

            {mode === 'register' && (
              <Animated.View
                style={[
                  styles.tiersContainer,
                  { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
                ]}
              >
                <Text style={styles.tiersTitle}>Choose Your Plan</Text>
                
                <TouchableOpacity
                  style={[
                    styles.tierCard,
                    selectedTier === 'free' && styles.tierCardSelected,
                  ]}
                  onPress={() => setSelectedTier('free')}
                >
                  <View style={styles.tierHeader}>
                    <Text style={styles.tierName}>Free</Text>
                    <Text style={styles.tierPrice}>$0</Text>
                  </View>
                  <Text style={styles.tierFeature}>✓ Weekly tips</Text>
                  <Text style={styles.tierFeature}>✓ Community access</Text>
                  <Text style={styles.tierFeature}>✓ Basic resources</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tierCard,
                    selectedTier === 'ace1_student' && styles.tierCardSelected,
                  ]}
                  onPress={() => setSelectedTier('ace1_student')}
                >
                  <View style={styles.tierHeader}>
                    <Text style={styles.tierName}>ACE-1 Student</Text>
                    <Text style={styles.tierPrice}>Free Trial</Text>
                  </View>
                  <Text style={styles.tierFeature}>✓ Full course access</Text>
                  <Text style={styles.tierFeature}>✓ AI Credit Coach</Text>
                  <Text style={styles.tierFeature}>✓ AI Dispute Assistant</Text>
                  <Text style={styles.tierFeature}>✓ 60-day trial (no payment)</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            <Animated.View
              style={[
                styles.formCard,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Text style={styles.formTitle}>
                {mode === 'register' ? 'Create Your Account' : 'Welcome Back'}
              </Text>
              <Text style={styles.formSubtitle}>
                {mode === 'register' 
                  ? 'Start your credit education journey today'
                  : 'Sign in to continue learning'
                }
              </Text>

              {mode === 'register' && (
                <View style={styles.inputContainer}>
                  <View style={styles.inputIcon}>
                    <User size={20} color="#D4AF37" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    placeholderTextColor="#64748B"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    autoCorrect={false}
                    testID="name-input"
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <Mail size={20} color="#D4AF37" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor="#64748B"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="email-input"
                />
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <Lock size={20} color="#D4AF37" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#64748B"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="password-input"
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#64748B" />
                  ) : (
                    <Eye size={20} color="#64748B" />
                  )}
                </TouchableOpacity>
              </View>

              {mode === 'register' && (
                <View style={styles.inputContainer}>
                  <View style={styles.inputIcon}>
                    <Lock size={20} color="#D4AF37" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    placeholderTextColor="#64748B"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    testID="confirm-password-input"
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} color="#64748B" />
                    ) : (
                      <Eye size={20} color="#64748B" />
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {mode === 'register' && (
                <View style={styles.inputContainer}>
                  <View style={styles.inputIcon}>
                    <Phone size={20} color="#D4AF37" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Phone (Optional)"
                    placeholderTextColor="#64748B"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    testID="phone-input"
                  />
                </View>
              )}

              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
                activeOpacity={0.8}
                testID="submit-button"
              >
                <LinearGradient
                  colors={['#D4AF37', '#F4D03F', '#D4AF37']}
                  style={styles.submitGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#0A1628" size="small" />
                  ) : (
                    <>
                      <Text style={styles.submitText}>
                        {mode === 'register' 
                          ? (selectedTier === 'ace1_student' ? 'Start ACE-1 Trial' : 'Get Started Free')
                          : 'Sign In'
                        }
                      </Text>
                      <ArrowRight size={20} color="#0A1628" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchModeButton}
                onPress={() => {
                  setMode(mode === 'register' ? 'login' : 'register');
                  setError('');
                  setPassword('');
                  setConfirmPassword('');
                  setSelectedTier('free');
                }}
              >
                <Text style={styles.switchModeText}>
                  {mode === 'register' 
                    ? 'Already have an account? Sign In'
                    : "Don't have an account? Register"
                  }
                </Text>
              </TouchableOpacity>

              {mode === 'login' && (
                <TouchableOpacity
                  style={styles.forgotPasswordButton}
                  onPress={() => router.push('/forgot-password' as any)}
                  testID="forgot-password-button"
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}
            </Animated.View>

            {mode === 'register' && (
              <Animated.View
                style={[
                  styles.featuresCard,
                  {
                    opacity: fadeAnim,
                  },
                ]}
              >
                <View style={styles.featuresHeader}>
                  <Shield size={18} color="#D4AF37" />
                  <Text style={styles.featuresTitle}>Free Account Includes</Text>
                </View>
                
                {features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <CheckCircle size={16} color="#22C55E" />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </Animated.View>
            )}

            <Animated.Text
              style={[
                styles.disclaimer,
                { opacity: fadeAnim },
              ]}
            >
              By registering, you agree to our Terms of Service and Privacy Policy
            </Animated.Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  backgroundPattern: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  patternCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#D4AF37',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoGradient: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  tiersContainer: {
    marginBottom: 24,
  },
  tiersTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  tierCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  tierCardSelected: {
    borderColor: '#D4AF37',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tierName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tierPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D4AF37',
  },
  tierFeature: {
    fontSize: 13,
    color: '#CBD5E1',
    marginBottom: 4,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
    overflow: 'hidden',
  },
  inputIcon: {
    paddingLeft: 16,
    paddingRight: 12,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: '#FFFFFF',
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  submitText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0A1628',
    letterSpacing: 0.3,
  },
  switchModeButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchModeText: {
    fontSize: 14,
    color: '#D4AF37',
  },
  forgotPasswordButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  featuresCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
  },
  featuresHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  featuresTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#CBD5E1',
  },
  disclaimer: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
