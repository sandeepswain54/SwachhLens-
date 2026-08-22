import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
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

export default function SignUpScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useCooldown();

  async function handleSignUp() {
    if (cooldown > 0) return;
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!agreed) {
      setError('Please agree to the Terms & Conditions and Privacy Policy.');
      return;
    }

    setError(null);
    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim(), role: 'user' },
        emailRedirectTo: Linking.createURL('verify-email', { scheme: 'swachhlens' }),
      },
    });
    setLoading(false);

    if (signUpError) {
      const parsed = parseAuthError(signUpError.message);
      setError(parsed.message);
      if (parsed.retryAfterSeconds) setCooldown(parsed.retryAfterSeconds);
      return;
    }

    if (data.session) {
      // Email confirmation is disabled on this project, so the account is
      // already active — skip straight to the app.
      router.replace('/(tabs)');
      return;
    }

    router.replace({ pathname: '/check-email', params: { email: email.trim() } });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join as a Citizen</Text>

        <Image
          source={require('@/assets/images/girl.png')}
          style={styles.avatar}
          contentFit="contain"
        />

        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color="#8a9590" />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#9aa5a0"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#8a9590" />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#9aa5a0"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#8a9590" />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#9aa5a0"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable onPress={() => setShowPassword((prev) => !prev)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#8a9590"
              />
            </Pressable>
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#8a9590" />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#9aa5a0"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <Pressable onPress={() => setShowConfirmPassword((prev) => !prev)}>
              <Ionicons
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#8a9590"
              />
            </Pressable>
          </View>

          <Pressable style={styles.agreeRow} onPress={() => setAgreed((prev) => !prev)}>
            <Ionicons
              name={agreed ? 'checkbox' : 'square-outline'}
              size={20}
              color={agreed ? '#1B6B3A' : '#9aa5a0'}
            />
            <Text style={styles.agreeText}>
              I agree to the <Text style={styles.agreeLink}>Terms & Conditions</Text> and{' '}
              <Text style={styles.agreeLink}>Privacy Policy</Text>
            </Text>
          </Pressable>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Pressable
            style={[styles.signUpButton, (loading || cooldown > 0) && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading || cooldown > 0}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.signUpButtonText}>
                {cooldown > 0 ? `Try again in ${cooldown}s` : 'Sign Up'}
              </Text>
            )}
          </Pressable>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Pressable onPress={() => router.replace('/login')}>
              <Text style={styles.loginLink}>Login</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A2E22',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#6b7770',
  },
  avatar: {
    width: 180,
    height: 180,
    borderRadius: 90,
    marginTop: 16,
    marginBottom: 8,
  },
  form: {
    width: '100%',
    gap: 16,
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
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  agreeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#4a5750',
  },
  agreeLink: {
    color: '#1B6B3A',
    fontWeight: '700',
  },
  errorText: {
    fontSize: 13,
    color: '#c0392b',
    textAlign: 'center',
  },
  signUpButton: {
    backgroundColor: '#1B6B3A',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signUpButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },
  loginText: {
    fontSize: 14,
    color: '#4a5750',
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B6B3A',
  },
});
