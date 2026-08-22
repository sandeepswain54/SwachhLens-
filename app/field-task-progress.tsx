import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { uploadProgressPhotos } from '@/lib/field-media';
import {
  cancelTask,
  FIELD_TASK_STATUS_BADGE,
  FIELD_TASK_STATUS_LABEL,
  getTaskById,
  submitTaskForReview,
  type FieldTask,
} from '@/lib/field-tasks';

const MIN_PHOTOS = 2;
const MAX_PHOTOS = 6;

export default function FieldTaskProgressScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [task, setTask] = useState<FieldTask | null | undefined>(undefined);
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getTaskById(id).then((result) => {
        if (!cancelled) setTask(result);
      });
      return () => {
        cancelled = true;
      };
    }, [id])
  );

  function handleAddPhoto() {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert('Photo limit reached', `You can attach up to ${MAX_PHOTOS} photos.`);
      return;
    }
    Alert.alert('Add Photo', undefined, [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Gallery', onPress: pickFromGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission needed', 'Enable camera access to take a progress photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!result.canceled && result.assets?.[0]) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  }

  async function pickFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo library permission needed', 'Enable photo access to attach progress photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
    });
    if (!result.canceled && result.assets?.length) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, MAX_PHOTOS));
    }
  }

  function removePhoto(uri: string) {
    setPhotos((prev) => prev.filter((p) => p !== uri));
  }

  async function handleSubmit() {
    if (!task || photos.length < MIN_PHOTOS) return;
    setSubmitting(true);
    try {
      const urls = await uploadProgressPhotos(task.id, photos);
      await submitTaskForReview(task.id, { photoUrls: urls, notes });
      router.replace({ pathname: '/field-task-submitted', params: { id: task.id } });
    } catch (err) {
      Alert.alert('Could not submit', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancelTask() {
    if (!task) return;
    Alert.alert('Cancel this task?', 'It will go back to "New" so you (or another team) can pick it up again.', [
      { text: 'Keep Working', style: 'cancel' },
      {
        text: 'Cancel Task',
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            await cancelTask(task.id);
            router.replace('/(field)');
          } catch (err) {
            Alert.alert('Could not cancel', err instanceof Error ? err.message : 'Please try again.');
            setCancelling(false);
          }
        },
      },
    ]);
  }

  if (task === undefined) {
    return (
      <SafeAreaView style={styles.centered} edges={['top', 'bottom']}>
        <ActivityIndicator color="#1B6B3A" />
      </SafeAreaView>
    );
  }
  if (task === null) {
    return (
      <SafeAreaView style={styles.centered} edges={['top', 'bottom']}>
        <Text style={styles.notFoundText}>Could not find this task.</Text>
      </SafeAreaView>
    );
  }

  const statusBadge = FIELD_TASK_STATUS_BADGE[task.status];
  const canSubmit = photos.length >= MIN_PHOTOS && !submitting && !cancelling;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1A2E22" />
        </Pressable>
        <Text style={styles.headerTitle}>#{task.assignment_code}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
          <Text style={[styles.statusBadgeText, { color: statusBadge.text }]}>
            {FIELD_TASK_STATUS_LABEL[task.status]}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.category}>{task.report.category}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={13} color="#6b7770" />
          <Text style={styles.metaText}>{task.report.address}</Text>
        </View>

        <Text style={styles.sectionHeading}>Upload Progress</Text>
        <Text style={styles.sectionSubheading}>
          (Add at least {MIN_PHOTOS} photo{MIN_PHOTOS > 1 ? 's' : ''})
        </Text>

        <View style={styles.photoGrid}>
          {photos.map((uri) => (
            <View key={uri} style={styles.photoTile}>
              <Image source={{ uri }} style={styles.photoImage} />
              <Pressable style={styles.photoRemove} onPress={() => removePhoto(uri)} hitSlop={6}>
                <Ionicons name="close" size={13} color="#ffffff" />
              </Pressable>
            </View>
          ))}
          {photos.length < MAX_PHOTOS && (
            <Pressable style={styles.addTile} onPress={handleAddPhoto}>
              <Ionicons name="add" size={26} color="#8a9590" />
            </Pressable>
          )}
        </View>

        <Text style={styles.sectionHeading}>
          Add Notes <Text style={styles.optionalText}>(Optional)</Text>
        </Text>
        <TextInput
          style={styles.notesInput}
          multiline
          placeholder="e.g. Garbage collected and area cleaned."
          placeholderTextColor="#9aa5a0"
          value={notes}
          onChangeText={setNotes}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]} disabled={!canSubmit} onPress={handleSubmit}>
          {submitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Submit for Review</Text>
          )}
        </Pressable>
        <Pressable disabled={cancelling || submitting} onPress={handleCancelTask} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancel Task</Text>
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
  centered: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  notFoundText: {
    fontSize: 14,
    color: '#6b7770',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 10,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A2E22',
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  category: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1A2E22',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  metaText: {
    fontSize: 12.5,
    color: '#6b7770',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A2E22',
    marginTop: 22,
  },
  sectionSubheading: {
    fontSize: 11.5,
    color: '#8a9590',
    marginTop: 2,
  },
  optionalText: {
    fontWeight: '500',
    color: '#8a9590',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  photoTile: {
    width: 78,
    height: 78,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTile: {
    width: 78,
    height: 78,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#d7ece0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7faf8',
  },
  notesInput: {
    marginTop: 10,
    minHeight: 90,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5ebe8',
    padding: 12,
    fontSize: 13,
    color: '#1A2E22',
    textAlignVertical: 'top',
  },
  footer: {
    padding: 20,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f2',
  },
  submitButton: {
    backgroundColor: '#1B6B3A',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  cancelButtonText: {
    color: '#c0392b',
    fontSize: 13.5,
    fontWeight: '700',
  },
});
