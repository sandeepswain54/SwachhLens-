import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';

type LinkState = 'checking' | 'valid' | 'invalid';

export default function ResetPasswordScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [linkState, setLinkState] = useState<LinkState>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function exchangeCode() {
      if (!code) {
        setLinkState('invalid');
        return;
      }
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      setLinkState(exchangeError ? 'invalid' : 'valid');
    }
    exchangeCode();
  }, [code]);

  async function handleUpdatePassword() {
    if (!password || !confirmPassword) {
      setError('Please fill in both fields.');
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

    setError(null);
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.replace('/(tabs)');
  }

  if (linkState === 'checking') {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <ActivityIndicator color="#1B6B3A" size="large" />
      </SafeAreaView>
    );
  }

  if (linkState === 'invalid') {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#c0392b" />
        <Text style={styles.invalidTitle}>Link Expired or Invalid</Text>
        <Text style={styles.invalidSubtitle}>
          This password reset link is no longer valid. Please request a new one.
        </Text>
        <Pressable style={styles.primaryButton} onPress={() => router.replace('/forgot-password')}>
          <Text style={styles.primaryButtonText}>Back to Forgot Password</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="lock-closed-outline" size={36} color="#1B6B3A" />
        </View>

        <Text style={styles.title}>Set New Password</Text>
        <Text style={styles.subtitle}>Your new password must be different from previous ones.</Text>

        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#8a9590" />
            <TextInput
              style={styles.input}
              placeholder="New Password"
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
              placeholder="Confirm New Password"
              placeholderTextColor="#9aa5a0"
              secureTextEntry={!showPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Pressable
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleUpdatePassword}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Update Password</Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  invalidTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A2E22',
    marginTop: 8,
  },
  invalidSubtitle: {
    fontSize: 14,
    color: '#6b7770',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#eaf3ef',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A2E22',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#6b7770',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  form: {
    width: '100%',
    gap: 16,
    marginTop: 28,
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
  errorText: {
    fontSize: 13,
    color: '#c0392b',
    textAlign: 'center',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#1B6B3A',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
