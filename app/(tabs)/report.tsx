import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useReportFlow } from '@/contexts/report-flow-context';

type PickedAsset = ImagePicker.ImagePickerAsset;

const OPTIONS = [
  {
    key: 'photo',
    icon: 'camera-outline',
    title: 'Take Photo',
    subtitle: 'Capture waste image',
  },
  {
    key: 'video',
    icon: 'videocam-outline',
    title: 'Record Video',
    subtitle: 'Record a short video',
  },
  {
    key: 'gallery',
    icon: 'images-outline',
    title: 'Choose from Gallery',
    subtitle: 'Upload from gallery',
  },
] as const;

export default function ReportScreen() {
  const { setMedia } = useReportFlow();

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
      Alert.alert('Camera access needed', 'Allow camera access to take a photo of the waste.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!result.canceled && result.assets?.[0]) goToScan(result.assets[0], 'image');
  }

  async function handleRecordVideo() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Allow camera access to record a video of the waste.');
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
      Alert.alert('Photos access needed', 'Allow photo library access to choose media.');
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
        <Pressable
          hitSlop={8}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}>
          <Ionicons name="arrow-back" size={22} color="#1A2E22" />
        </Pressable>
        <Text style={styles.headerTitle}>Report Waste</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.question}>What did you want to report?</Text>

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
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#c3cac6" />
            </Pressable>
          ))}
        </View>

        <View style={styles.tipsBox}>
          <View style={styles.tipsHeaderRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#1B6B3A" />
            <Text style={styles.tipsHeading}>Tips</Text>
          </View>
          <Text style={styles.tipItem}>• Capture clear images</Text>
          <Text style={styles.tipItem}>• Include the waste area</Text>
          <Text style={styles.tipItem}>• Ensure good lighting</Text>
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
    padding: 20,
    gap: 20,
  },
  question: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2E22',
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
