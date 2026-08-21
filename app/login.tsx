import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';

type AccountType = 'user' | 'fieldTeam';

export default function LoginScreen() {
  const [accountType, setAccountType] = useState<AccountType>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (accountType !== 'user') {
      // Field Team accounts are provisioned separately — sign-in for that
      // role isn't wired up yet.
      return;
    }

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.replace('/(tabs)');
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.illustrationContainer}>
          <Image
            source={require('@/assets/images/loginlogo.png')}
            style={styles.illustration}
            contentFit="cover"
          />
        </View>

        <View style={styles.sheet}>
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>Log in to continue</Text>

          <View style={styles.tabRow}>
            <Pressable style={styles.tab} onPress={() => setAccountType('user')}>
              <Text style={[styles.tabText, accountType === 'user' && styles.tabTextActive]}>
                User
              </Text>
              {accountType === 'user' && <View style={styles.tabIndicator} />}
            </Pressable>
            <Pressable style={styles.tab} onPress={() => setAccountType('fieldTeam')}>
              <Text style={[styles.tabText, accountType === 'fieldTeam' && styles.tabTextActive]}>
                Field Team
              </Text>
              {accountType === 'fieldTeam' && <View style={styles.tabIndicator} />}
            </Pressable>
          </View>

          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#8a9590" style={styles.inputIcon} />
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
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#8a9590"
                style={styles.inputIcon}
              />
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

            <Pressable style={styles.forgotPassword} onPress={() => router.push('/forgot-password')}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </Pressable>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Pressable
              style={[styles.loginButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </Pressable>

            {accountType === 'user' && (
              <View style={styles.signUpRow}>
                <Text style={styles.signUpText}>Don&apos;t have an account? </Text>
                <Pressable onPress={() => router.push('/signup')}>
                  <Text style={styles.signUpLink}>Sign Up</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
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
  illustrationContainer: {
    height: 240,
    backgroundColor: '#eaf3ef',
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
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A2E22',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#6b7770',
  },
  tabRow: {
    flexDirection: 'row',
    marginTop: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#e7ece9',
  },
  tab: {
    marginRight: 28,
    paddingBottom: 10,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9aa5a0',
  },
  tabTextActive: {
    color: '#1B6B3A',
  },
  tabIndicator: {
    marginTop: 8,
    height: 2,
    width: '100%',
    backgroundColor: '#1B6B3A',
  },
  form: {
    marginTop: 24,
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
  inputIcon: {
    marginRight: 0,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1A2E22',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1B6B3A',
  },
  errorText: {
    fontSize: 13,
    color: '#c0392b',
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#1B6B3A',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },
  signUpText: {
    fontSize: 14,
    color: '#4a5750',
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B6B3A',
  },
});
