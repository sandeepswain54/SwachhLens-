import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getMyTeam } from '@/lib/field-team';
import { supabase } from '@/lib/supabase';

export default function WelcomeScreen() {
  const [checkingSession, setCheckingSession] = useState(true);

  // If the device already has a signed-in session (persisted across app
  // restarts/reloads by lib/supabase.ts's AsyncStorage config), skip
  // straight to that user's home screen instead of showing Welcome/Login
  // again — a restart should never look like being logged out.
  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (!cancelled) setCheckingSession(false);
        return;
      }

      const team = await getMyTeam().catch(() => null);
      if (cancelled) return;
      router.replace(team ? '/(field)' : '/(tabs)');
    }

    checkSession();
    return () => {
      cancelled = true;
    };
  }, []);

  if (checkingSession) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#1B6B3A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/51809282-d532-4f71-9aec-076281f1770d.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.topContent}>
          <Image
            source={require('@/assets/images/applogo.png')}
            style={styles.appLogo}
            contentFit="contain"
          />

          <Text style={styles.logo}>
            <Text style={styles.logoDark}>Swachh</Text>
            <Text style={styles.logoGreen}>Lens</Text>
          </Text>

          <Text style={styles.tagline}>Cleaner City. Smarter Future.</Text>

          <Text style={styles.description}>
            Report waste issues, help your city stay clean and healthy.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/login')}>
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eaf4ee',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#eaf4ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
  },
  topContent: {
    alignItems: 'center',
    marginTop: 40,
  },
  appLogo: {
    width: 64,
    height: 64,
  },
  logo: {
    marginTop: 10,
    fontSize: 30,
    fontWeight: '800',
  },
  logoDark: {
    color: '#1A2E22',
  },
  logoGreen: {
    color: '#1F8A46',
  },
  tagline: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '600',
    color: '#33403a',
  },
  description: {
    marginTop: 14,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    color: '#4a5750',
    paddingHorizontal: 12,
  },
  buttonContainer: {
    paddingBottom: 100,
    gap: 14,
  },
  primaryButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#1B6B3A',
    fontSize: 16,
    fontWeight: '700',
  },
});
