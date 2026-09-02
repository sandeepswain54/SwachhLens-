import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
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

import { getMyTeam } from '@/lib/field-team';
import { supabase } from '@/lib/supabase';

type AccountType = 'user' | 'fieldTeam';

const ILLUSTRATION_HEIGHT = 240;

export default function LoginScreen() {
  const [accountType, setAccountType] = useState<AccountType>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleLogin() {
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

    if (signInError) {
      setLoading(false);
      setError(signInError.message);
      return;
    }

    // A "team" login only exists as a `teams` row created by an admin (see
    // admin_panel's create-team-member function) — that's the only signal
    // that tells a field-team account apart from a citizen account, so
    // cross-check it against whichever tab the user picked and bounce them
    // back out if they don't match.
    const team = await getMyTeam().catch(() => null);
    setLoading(false);

    if (accountType === 'fieldTeam' && !team) {
      await supabase.auth.signOut();
      setError('This account is not registered as a field team. Use the User tab instead.');
      return;
    }
    if (accountType === 'user' && team) {
      await supabase.auth.signOut();
      setError('This is a field team login. Switch to the Field Team tab to continue.');
      return;
    }

    router.replace({
      pathname: '/language-select',
      params: { next: team ? '/(field)' : '/(tabs)' },
    });
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
            <Animated.View style={[styles.illustrationContainer, { height: illustrationHeight }]}>
              <Image
                source={require('@/assets/images/loginlogo.png')}
                style={styles.illustration}
                contentFit="cover"
              />
            </Animated.View>

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
                  <Text
                    style={[styles.tabText, accountType === 'fieldTeam' && styles.tabTextActive]}>
                    Field Team
                  </Text>
                  {accountType === 'fieldTeam' && <View style={styles.tabIndicator} />}
                </Pressable>
              </View>

              <View style={styles.form}>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color="#8a9590"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#9aa5a0"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    returnKeyType="next"
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
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="password"
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
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

                <Pressable
                  style={styles.forgotPassword}
                  onPress={() => router.push('/forgot-password')}>
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
  illustrationContainer: {
    backgroundColor: '#eaf3ef',
    overflow: 'hidden',
  },
  illustration: {
    width: '100%',
    height: '100%',
  },
  sheet: {
    flexGrow: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
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
