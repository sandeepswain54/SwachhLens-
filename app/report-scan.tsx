import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLanguage } from '@/contexts/language-context';
import { useReportFlow, type ReportLocation } from '@/contexts/report-flow-context';
import { checkForDuplicate } from '@/lib/duplicate-check';
import { reverseGeocode } from '@/lib/geocoding';
import { analyzeWasteMedia, validateWasteImage } from '@/lib/gemini';
import { protectImagePrivacy } from '@/lib/privacy';

// Waste image validation + OpenCV privacy protection only apply to photos —
// video reports keep the original, shorter step list and go straight to
// analysis; this feature set doesn't cover video redaction.
const IMAGE_STEP_KEYS = [
  'reportScan.stepValidate',
  'reportScan.stepPrivacy',
  'reportScan.step1',
  'reportScan.step2',
  'reportScan.step3',
  'reportScan.step4',
  'reportScan.step5',
] as const;

const VIDEO_STEP_KEYS = [
  'reportScan.step1',
  'reportScan.step2',
  'reportScan.step3',
  'reportScan.step4',
  'reportScan.step5',
] as const;

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
  const { t, language } = useLanguage();
  const { media, setMedia, setAnalysis, setDuplicate, setLocation } = useReportFlow();
  const [completedSteps, setCompletedSteps] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [invalidImage, setInvalidImage] = useState(false);
  const [spin] = useState(() => new Animated.Value(0));

  const STEP_KEYS = useMemo(
    () => (media?.kind === 'video' ? VIDEO_STEP_KEYS : IMAGE_STEP_KEYS),
    [media?.kind]
  );

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
      setCompletedSteps((prev) => (prev < STEP_KEYS.length - 1 ? prev + 1 : prev));
    }, 900);

    async function run() {
      try {
        const locationPromise = fetchLocation().catch(() => null);
        const originalBase64 = await FileSystem.readAsStringAsync(media!.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        let analysisBase64 = originalBase64;
        let analysisMimeType = media!.mimeType;

        if (media!.kind === 'image') {
          // 1. Waste image validation — reject anything that isn't a
          // genuine waste/sanitation issue before any further processing,
          // so nothing invalid is ever privacy-processed, analyzed, or
          // stored.
          const validation = await validateWasteImage({
            base64: originalBase64,
            mimeType: media!.mimeType,
          });
          if (cancelled) return;
          if (!validation.isValid) {
            setInvalidImage(true);
            setError(t('reportScan.invalidImageMessage'));
            return;
          }

          // 2. OpenCV privacy protection — blur faces/plates before this
          // image ever reaches Gemini or gets stored. A failure here must
          // stop the report safely rather than fall back to the original,
          // unprotected photo.
          const protectedImage = await protectImagePrivacy({
            base64: originalBase64,
            mimeType: media!.mimeType,
          });
          if (cancelled) return;

          const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
          if (!cacheDir) {
            throw new Error('Could not access local storage to save the protected photo.');
          }
          const protectedUri = `${cacheDir}swachhlens-protected-${Date.now()}.jpg`;
          await FileSystem.writeAsStringAsync(protectedUri, protectedImage.base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          // Every screen downstream (preview, Gemini analysis, upload) now
          // only ever sees this privacy-protected file — the original never
          // gets read again.
          setMedia({ uri: protectedUri, mimeType: protectedImage.mimeType, kind: 'image' });

          analysisBase64 = protectedImage.base64;
          analysisMimeType = protectedImage.mimeType;
        }

        const location = await locationPromise;
        if (cancelled) return;
        if (location) setLocation(location);

        const analysis = await analyzeWasteMedia({
          base64: analysisBase64,
          mimeType: analysisMimeType,
          address: location?.address,
          language,
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

        setCompletedSteps(STEP_KEYS.length);
        router.replace('/report-result');
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t('reportScan.somethingWrong'));
        }
      }
    }

    run();
    return () => {
      cancelled = true;
      clearInterval(stepTimer);
    };
    // Deliberately empty: this must run exactly once against the media this
    // screen was navigated to with. It intentionally does NOT depend on
    // `media` — the privacy-protection step below calls setMedia() partway
    // through this same run() to swap in the protected file for downstream
    // screens, and re-running this effect off that change would re-validate
    // and re-protect the already-protected image.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.errorContent}>
          <Ionicons name="alert-circle-outline" size={48} color="#c0392b" />
          <Text style={styles.errorTitle}>
            {invalidImage ? t('reportScan.invalidImageTitle') : t('reportScan.analysisFailed')}
          </Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/report'))}>
            <Text style={styles.retryButtonText}>{t('reportScan.tryAgain')}</Text>
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
        <Text style={styles.headerTitle}>{t('reportScan.title')}</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>{t('reportScan.subtitle')}</Text>

        <View style={styles.ring}>
          <Animated.View style={[styles.ringSpinner, { transform: [{ rotate }] }]} />
          <Text style={styles.ringText}>AI</Text>
        </View>

        <View style={styles.stepList}>
          {STEP_KEYS.map((stepKey, index) => (
            <View key={stepKey} style={styles.stepRow}>
              <Ionicons
                name={index < completedSteps ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={index < completedSteps ? '#1B6B3A' : '#c3cac6'}
              />
              <Text
                style={[styles.stepText, index < completedSteps && styles.stepTextDone]}>
                {t(stepKey)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.hintRow}>
          <Ionicons name="time-outline" size={14} color="#9aa5a0" />
          <Text style={styles.hintText}>{t('reportScan.hint')}</Text>
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
