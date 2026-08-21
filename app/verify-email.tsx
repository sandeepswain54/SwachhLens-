import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';

type VerifyState = 'checking' | 'invalid';

export default function VerifyEmailScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [state, setState] = useState<VerifyState>('checking');

  useEffect(() => {
    async function exchangeCode() {
      if (!code) {
        setState('invalid');
        return;
      }
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setState('invalid');
        return;
      }
      router.replace('/(tabs)');
    }
    exchangeCode();
  }, [code]);

  if (state === 'checking') {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <ActivityIndicator color="#1B6B3A" size="large" />
        <Text style={styles.checkingText}>Verifying your email...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.centeredContainer}>
      <Ionicons name="alert-circle-outline" size={48} color="#c0392b" />
      <Text style={styles.title}>Link Expired or Invalid</Text>
      <Text style={styles.subtitle}>
        This verification link is no longer valid. Please sign up again or request a new link.
      </Text>
      <Pressable style={styles.primaryButton} onPress={() => router.replace('/signup')}>
        <Text style={styles.primaryButtonText}>Back to Sign Up</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  checkingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7770',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A2E22',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7770',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#1B6B3A',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
