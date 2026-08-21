import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCooldown } from '@/hooks/use-cooldown';
import { parseAuthError } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';

const RESEND_COOLDOWN_SECONDS = 30;

export default function CheckEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useCooldown();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    if (cooldown > 0 || resending) return;
    setError(null);
    setInfo(null);
    setResending(true);
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email });
    setResending(false);

    if (resendError) {
      const parsed = parseAuthError(resendError.message);
      setError(parsed.message);
      setCooldown(parsed.retryAfterSeconds ?? RESEND_COOLDOWN_SECONDS);
      return;
    }
    setInfo('Verification email sent again.');
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="mail-outline" size={36} color="#1B6B3A" />
        </View>

        <Text style={styles.title}>Check Your Email</Text>
        <Text style={styles.subtitle}>
          We sent a verification link to{'\n'}
          <Text style={styles.emailText}>{email}</Text>
          {'\n\n'}Open it on this device to finish creating your account. You&apos;ll be brought
          straight back into the app once it&apos;s verified.
        </Text>

        {info && !error && <Text style={styles.infoText}>{info}</Text>}
        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.resendRow}>
          <Text style={styles.resendText}>Didn&apos;t get the email? </Text>
          <Pressable onPress={handleResend} disabled={cooldown > 0 || resending}>
            <Text
              style={[styles.resendLink, (cooldown > 0 || resending) && styles.resendLinkDisabled]}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend'}
            </Text>
          </Pressable>
        </View>

        <Pressable style={styles.backButton} onPress={() => router.replace('/login')}>
          <Text style={styles.backButtonText}>Back to Login</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  emailText: {
    color: '#1A2E22',
    fontWeight: '700',
  },
  infoText: {
    marginTop: 16,
    fontSize: 13,
    color: '#1B6B3A',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 13,
    color: '#c0392b',
    textAlign: 'center',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  resendText: {
    fontSize: 14,
    color: '#4a5750',
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B6B3A',
  },
  resendLinkDisabled: {
    color: '#9aa5a0',
  },
  backButton: {
    marginTop: 28,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7770',
  },
});
