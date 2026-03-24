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
import { Mail, Lock, ArrowLeft, CheckCircle, Eye, EyeOff, KeyRound } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { trpc } from '@/lib/trpc';

const { width, height } = Dimensions.get('window');

type Step = 'email' | 'reset' | 'success';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  const checkEmailMutation = trpc.users.checkEmailExists.useMutation();
  const resetPasswordMutation = trpc.users.resetPassword.useMutation();

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

  const handleCheckEmail = async () => {
    setError('');
    
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      const result = await checkEmailMutation.mutateAsync({ 
        email: email.trim().toLowerCase() 
      });
      
      if (result.exists) {
        setStep('reset');
      } else {
        setError('No account found with this email address');
      }
    } catch (err) {
      console.error('[ForgotPassword] Check email error:', err);
      setError('Something went wrong. Please try again.');
    }
  };

  const handleResetPassword = async () => {
    setError('');
    
    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await resetPasswordMutation.mutateAsync({
        email: email.trim().toLowerCase(),
        newPassword: newPassword,
      });
      
      setStep('success');
    } catch (err) {
      console.error('[ForgotPassword] Reset password error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset password';
      setError(errorMessage);
    }
  };

  const handleBackToLogin = () => {
    router.back();
  };

  const isLoading = checkEmailMutation.isPending || resetPasswordMutation.isPending;

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
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={handleBackToLogin}
              testID="back-button"
            >
              <ArrowLeft size={24} color="#D4AF37" />
              <Text style={styles.backText}>Back to Login</Text>
            </TouchableOpacity>

            <Animated.View
              style={[
                styles.header,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={['#D4AF37', '#F4D03F', '#D4AF37']}
                  style={styles.iconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <KeyRound size={32} color="#0A1628" strokeWidth={2} />
                </LinearGradient>
              </View>
              
              <Text style={styles.title}>
                {step === 'success' ? 'Password Reset!' : 'Reset Password'}
              </Text>
              <Text style={styles.subtitle}>
                {step === 'email' && 'Enter your email to reset your password'}
                {step === 'reset' && 'Create a new password for your account'}
                {step === 'success' && 'Your password has been successfully updated'}
              </Text>
            </Animated.View>

            <Animated.View
              style={[
                styles.formCard,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {step === 'email' && (
                <>
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

                  {error ? (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                    onPress={handleCheckEmail}
                    disabled={isLoading}
                    activeOpacity={0.8}
                    testID="continue-button"
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
                        <Text style={styles.submitText}>Continue</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}

              {step === 'reset' && (
                <>
                  <View style={styles.emailDisplay}>
                    <Mail size={16} color="#94A3B8" />
                    <Text style={styles.emailText}>{email}</Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <View style={styles.inputIcon}>
                      <Lock size={20} color="#D4AF37" />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="New Password"
                      placeholderTextColor="#64748B"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      testID="new-password-input"
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

                  <View style={styles.inputContainer}>
                    <View style={styles.inputIcon}>
                      <Lock size={20} color="#D4AF37" />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm New Password"
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

                  {error ? (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                    onPress={handleResetPassword}
                    disabled={isLoading}
                    activeOpacity={0.8}
                    testID="reset-button"
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
                        <Text style={styles.submitText}>Reset Password</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.changeEmailButton}
                    onPress={() => {
                      setStep('email');
                      setError('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                  >
                    <Text style={styles.changeEmailText}>Use a different email</Text>
                  </TouchableOpacity>
                </>
              )}

              {step === 'success' && (
                <>
                  <View style={styles.successContainer}>
                    <View style={styles.successIcon}>
                      <CheckCircle size={48} color="#22C55E" />
                    </View>
                    <Text style={styles.successText}>
                      Your password has been reset successfully. You can now sign in with your new password.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleBackToLogin}
                    activeOpacity={0.8}
                    testID="back-to-login-button"
                  >
                    <LinearGradient
                      colors={['#D4AF37', '#F4D03F', '#D4AF37']}
                      style={styles.submitGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={styles.submitText}>Back to Sign In</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </Animated.View>
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
    paddingTop: 16,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  backText: {
    fontSize: 16,
    color: '#D4AF37',
    fontWeight: '500',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconGradient: {
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
    fontWeight: '700' as const,
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
    paddingHorizontal: 20,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  emailDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  emailText: {
    fontSize: 14,
    color: '#94A3B8',
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
    fontWeight: '700' as const,
    color: '#0A1628',
    letterSpacing: 0.3,
  },
  changeEmailButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  changeEmailText: {
    fontSize: 14,
    color: '#D4AF37',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIcon: {
    marginBottom: 20,
  },
  successText: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
  },
});
