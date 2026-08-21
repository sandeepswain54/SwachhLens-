import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useReportFlow, type ReportLocation } from '@/contexts/report-flow-context';
import { checkForDuplicate } from '@/lib/duplicate-check';
import { reverseGeocode } from '@/lib/geocoding';
import { analyzeWasteMedia } from '@/lib/gemini';

const STEPS = [
  'Detecting waste type...',
  'Estimating volume...',
  'Checking severity...',
  'Finding location...',
  'Checking for duplicates...',
];

async function fetchLocation(): Promise<ReportLocation | null> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) return null;

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const address = await reverseGeocode(position.coords.latitude, position.coords.longitude).catch(
    () => `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`
  );

  return { latitude: position.coords.latitude, longitude: position.coords.longitude, address };
}

export default function ReportScanScreen() {
  const { media, setAnalysis, setDuplicate, setLocation } = useReportFlow();
  const [completedSteps, setCompletedSteps] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [spin] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  useEffect(() => {
    if (!media) {
      router.replace('/report');
      return;
    }

    let cancelled = false;
    const stepTimer = setInterval(() => {
      setCompletedSteps((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 900);

    async function run() {
      try {
        const locationPromise = fetchLocation().catch(() => null);
        const base64 = await FileSystem.readAsStringAsync(media!.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const location = await locationPromise;
        if (cancelled) return;
        if (location) setLocation(location);

        const analysis = await analyzeWasteMedia({
          base64,
          mimeType: media!.mimeType,
          address: location?.address,
        });
        if (cancelled) return;
        setAnalysis(analysis);

        const duplicate = location
          ? await checkForDuplicate({
              category: analysis.wasteType.primaryType,
              latitude: location.latitude,
              longitude: location.longitude,
            }).catch(() => ({ status: 'not_available' as const }))
          : ({ status: 'not_available' as const });
        if (cancelled) return;
        setDuplicate(duplicate);

        setCompletedSteps(STEPS.length);
        router.replace('/report-result');
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
        }
      }
    }

    run();
    return () => {
      cancelled = true;
      clearInterval(stepTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.errorContent}>
          <Ionicons name="alert-circle-outline" size={48} color="#c0392b" />
          <Text style={styles.errorTitle}>Analysis Failed</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/report'))}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          hitSlop={8}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/report'))}>
          <Ionicons name="arrow-back" size={22} color="#1A2E22" />
        </Pressable>
        <Text style={styles.headerTitle}>AI Analyzing...</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>Please wait while we analyze the waste</Text>

        <View style={styles.ring}>
          <Animated.View style={[styles.ringSpinner, { transform: [{ rotate }] }]} />
          <Text style={styles.ringText}>AI</Text>
        </View>

        <View style={styles.stepList}>
          {STEPS.map((step, index) => (
            <View key={step} style={styles.stepRow}>
              <Ionicons
                name={index < completedSteps ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={index < completedSteps ? '#1B6B3A' : '#c3cac6'}
              />
              <Text
                style={[styles.stepText, index < completedSteps && styles.stepTextDone]}>
                {step}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.hintRow}>
          <Ionicons name="time-outline" size={14} color="#9aa5a0" />
          <Text style={styles.hintText}>This may take a few seconds</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2E22',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 28,
  },
  subtitle: {
    fontSize: 13.5,
    color: '#6b7770',
    textAlign: 'center',
    marginTop: -12,
  },
  ring: {
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 10,
    borderColor: '#e5ece8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSpinner: {
    position: 'absolute',
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 10,
    borderColor: 'transparent',
    borderTopColor: '#1B6B3A',
  },
  ringText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1B6B3A',
  },
  stepList: {
    width: '100%',
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepText: {
    fontSize: 13.5,
    color: '#9aa5a0',
  },
  stepTextDone: {
    color: '#1A2E22',
    fontWeight: '600',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hintText: {
    fontSize: 12,
    color: '#9aa5a0',
  },
  errorContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 6,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A2E22',
    marginTop: 8,
  },
  errorSubtitle: {
    fontSize: 13.5,
    color: '#6b7770',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#1B6B3A',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
