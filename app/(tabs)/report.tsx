import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLanguage } from '@/contexts/language-context';
import { useReportFlow } from '@/contexts/report-flow-context';

type PickedAsset = ImagePicker.ImagePickerAsset;

const FEATURE_CONFIG = {
  detect: {
    titleKey: 'report.detectTitle',
    questionKey: 'report.detectQuestion',
    descriptionKey: 'report.detectDescription',
    icon: 'brain',
    iconSet: 'community',
    color: '#1B6B3A',
    bg: '#e3f3ea',
  },
  volume: {
    titleKey: 'report.volumeTitle',
    questionKey: 'report.volumeQuestion',
    descriptionKey: 'report.volumeDescription',
    icon: 'cube-outline',
    iconSet: 'ion',
    color: '#2563eb',
    bg: '#e6eefd',
  },
  severity: {
    titleKey: 'report.severityTitle',
    questionKey: 'report.severityQuestion',
    descriptionKey: 'report.severityDescription',
    icon: 'warning-outline',
    iconSet: 'ion',
    color: '#7c3aed',
    bg: '#ede6fb',
  },
  duplicate: {
    titleKey: 'report.duplicateTitle',
    questionKey: 'report.duplicateQuestion',
    descriptionKey: 'report.duplicateDescription',
    icon: 'finger-print-outline',
    iconSet: 'ion',
    color: '#d97706',
    bg: '#fbead2',
  },
} as const;

type FeatureKey = keyof typeof FEATURE_CONFIG;

const OPTIONS = [
  {
    key: 'photo',
    icon: 'camera-outline',
    titleKey: 'report.optionPhotoTitle',
    subtitleKey: 'report.optionPhotoSubtitle',
  },
  {
    key: 'video',
    icon: 'videocam-outline',
    titleKey: 'report.optionVideoTitle',
    subtitleKey: 'report.optionVideoSubtitle',
  },
  {
    key: 'gallery',
    icon: 'images-outline',
    titleKey: 'report.optionGalleryTitle',
    subtitleKey: 'report.optionGallerySubtitle',
  },
] as const;

export default function ReportScreen() {
  const { t } = useLanguage();
  const { feature } = useLocalSearchParams<{ feature?: string }>();
  const { setMedia } = useReportFlow();

  const activeFeature =
    feature && feature in FEATURE_CONFIG ? FEATURE_CONFIG[feature as FeatureKey] : null;

  function goToScan(asset: PickedAsset, kind: 'image' | 'video') {
    setMedia({
      uri: asset.uri,
      mimeType: asset.mimeType ?? (kind === 'image' ? 'image/jpeg' : 'video/mp4'),
      kind,
    });
    router.push('/report-scan');
  }

  async function handleTakePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('report.cameraAccessNeeded'), t('report.allowCameraPhoto'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!result.canceled && result.assets?.[0]) goToScan(result.assets[0], 'image');
  }

  async function handleRecordVideo() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('report.cameraAccessNeeded'), t('report.allowCameraVideo'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      quality: 0.6,
      videoMaxDuration: 30,
    });
    if (!result.canceled && result.assets?.[0]) goToScan(result.assets[0], 'video');
  }

  async function handleChooseFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('report.photosAccessNeeded'), t('report.allowPhotoLibrary'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.6,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      goToScan(asset, asset.type === 'video' ? 'video' : 'image');
    }
  }

  function handlePress(key: (typeof OPTIONS)[number]['key']) {
    if (key === 'photo') return handleTakePhoto();
    if (key === 'video') return handleRecordVideo();
    return handleChooseFromGallery();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{activeFeature ? t(activeFeature.titleKey) : t('report.defaultTitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeFeature && (
          <View style={[styles.featureBanner, { backgroundColor: activeFeature.bg }]}>
            <View style={[styles.featureIconCircle, { backgroundColor: '#ffffff' }]}>
              {activeFeature.iconSet === 'community' ? (
                <MaterialCommunityIcons
                  name={activeFeature.icon as never}
                  size={22}
                  color={activeFeature.color}
                />
              ) : (
                <Ionicons name={activeFeature.icon as never} size={22} color={activeFeature.color} />
              )}
            </View>
            <View style={styles.featureBannerText}>
              <Text style={[styles.featureBannerTitle, { color: activeFeature.color }]}>
                {t(activeFeature.titleKey)}
              </Text>
              <Text style={styles.featureBannerDescription}>{t(activeFeature.descriptionKey)}</Text>
            </View>
          </View>
        )}

        <Text style={styles.question}>{activeFeature ? t(activeFeature.questionKey) : t('report.defaultQuestion')}</Text>

        <View style={styles.optionList}>
          {OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              style={styles.optionRow}
              onPress={() => handlePress(option.key)}>
              <View style={styles.optionIconCircle}>
                <Ionicons name={option.icon} size={22} color="#1B6B3A" />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{t(option.titleKey)}</Text>
                <Text style={styles.optionSubtitle}>{t(option.subtitleKey)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#c3cac6" />
            </Pressable>
          ))}
        </View>

        <View style={styles.tipsBox}>
          <View style={styles.tipsHeaderRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#1B6B3A" />
            <Text style={styles.tipsHeading}>{t('report.tipsHeading')}</Text>
          </View>
          <Text style={styles.tipItem}>• {t('report.tip1')}</Text>
          <Text style={styles.tipItem}>• {t('report.tip2')}</Text>
          <Text style={styles.tipItem}>• {t('report.tip3')}</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: 20,
    gap: 20,
  },
  question: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2E22',
  },
  featureBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 14,
  },
  featureIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureBannerText: {
    flex: 1,
  },
  featureBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  featureBannerDescription: {
    marginTop: 2,
    fontSize: 12,
    color: '#57635d',
  },
  optionList: {
    gap: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e7ece9',
    borderRadius: 16,
    padding: 14,
  },
  optionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eaf3ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#1A2E22',
  },
  optionSubtitle: {
    marginTop: 2,
    fontSize: 12.5,
    color: '#6b7770',
  },
  tipsBox: {
    backgroundColor: '#f4f7f5',
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  tipsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  tipsHeading: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1A2E22',
  },
  tipItem: {
    fontSize: 12.5,
    color: '#57635d',
  },
});
