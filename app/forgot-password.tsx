import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCooldown } from '@/hooks/use-cooldown';
import { parseAuthError } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';

const ILLUSTRATION_HEIGHT = 220;

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useCooldown();

  const illustrationHeight = useRef(new Animated.Value(ILLUSTRATION_HEIGHT)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      Animated.timing(illustrationHeight, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      Animated.timing(illustrationHeight, {
        toValue: ILLUSTRATION_HEIGHT,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [illustrationHeight]);

  async function handleSendResetLink() {
    if (cooldown > 0) return;
    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }

    setError(null);
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: Linking.createURL('reset-password'),
    });
    setLoading(false);

    if (resetError) {
      const parsed = parseAuthError(resetError.message);
      setError(parsed.message);
      if (parsed.retryAfterSeconds) setCooldown(parsed.retryAfterSeconds);
      return;
    }

    setSent(true);
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.safeArea}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive">
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#1B6B3A" />
            </Pressable>

            <View style={styles.header}>
              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.subtitle}>
                Don&apos;t worry! Enter your email and we&apos;ll send you a link to reset your
                password.
              </Text>
            </View>

            <Animated.View style={[styles.illustrationContainer, { height: illustrationHeight }]}>
              <Image
                source={require('@/assets/images/loginlogo.png')}
                style={styles.illustration}
                contentFit="cover"
              />
            </Animated.View>

            <View style={styles.sheet}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#1B6B3A" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#9aa5a0"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  onSubmitEditing={handleSendResetLink}
                  editable={!sent}
                  value={email}
                  onChangeText={(text) => {
                    setError(null);
                    setEmail(text);
                  }}
                />
              </View>

              {sent ? (
                <View style={styles.infoRow}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#1B6B3A" />
                  <Text style={styles.infoText}>
                    Reset link sent! Check your inbox and follow the link to set a new password.
                  </Text>
                </View>
              ) : (
                <View style={styles.infoRow}>
                  <Ionicons name="information-circle-outline" size={18} color="#1B6B3A" />
                  <Text style={styles.infoText}>
                    We will send a password reset link to your email.
                  </Text>
                </View>
              )}

              {error && <Text style={styles.errorText}>{error}</Text>}

              <Pressable
                style={[
                  styles.sendButton,
                  (loading || sent || cooldown > 0) && styles.buttonDisabled,
                ]}
                onPress={handleSendResetLink}
                disabled={loading || sent || cooldown > 0}>
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.sendButtonText}>
                    {sent
                      ? 'Link Sent'
                      : cooldown > 0
                        ? `Try again in ${cooldown}s`
                        : 'Send Reset Link'}
                  </Text>
                )}
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.rememberRow}>
                <Ionicons name="lock-closed-outline" size={18} color="#1B6B3A" />
                <Text style={styles.rememberText}>Remember your password? </Text>
                <Pressable onPress={() => router.replace('/login')}>
                  <Text style={styles.loginLink}>Login</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eaf3ef',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  backButton: {
    marginLeft: 20,
    marginTop: 8,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 24,
    marginTop: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1A2E22',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: '#5a655f',
  },
  illustrationContainer: {
    marginTop: 12,
    overflow: 'hidden',
  },
  illustration: {
    width: '100%',
    height: '100%',
  },
  sheet: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2E22',
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e6e2',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1A2E22',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#6b7770',
  },
  sendButton: {
    backgroundColor: '#1B6B3A',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorText: {
    marginTop: 12,
    fontSize: 13,
    color: '#c0392b',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e7ece9',
  },
  dividerText: {
    fontSize: 13,
    color: '#9aa5a0',
    fontWeight: '600',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
  },
  rememberText: {
    fontSize: 14,
    color: '#4a5750',
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B6B3A',
  },
});
