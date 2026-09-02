import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLanguage } from '@/contexts/language-context';
import { useReportFlow } from '@/contexts/report-flow-context';
import { submitReport } from '@/lib/reports';

const COMMENT_LIMIT = 200;

function formatSubmittedAt(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ReportConfirmScreen() {
  const { t } = useLanguage();
  const { media, analysis, duplicate, location, comments, setComments, applySubmission } =
    useReportFlow();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!media) router.replace('/report');
  }, [media]);

  if (!media) return null;

  async function handleSubmit() {
    if (!media || !analysis || !location) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await submitReport({ media, analysis, duplicate, location, comments });
      applySubmission({
        reportId: result.reportCode,
        submittedAt: formatSubmittedAt(result.createdAt),
        merged: result.merged,
        alreadyReported: result.alreadyReported,
      });
      router.replace('/report-submitted');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('reportConfirm.couldNotSubmit'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1A2E22" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('reportConfirm.title')}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.photoRow}>
          {media.kind === 'image' ? (
            <Image source={{ uri: media.uri }} style={styles.photoThumb} contentFit="cover" />
          ) : (
            <View style={[styles.photoThumb, styles.videoPlaceholder]}>
              <Ionicons name="videocam" size={22} color="#ffffff" />
            </View>
          )}
          <Pressable onPress={() => router.replace('/report')}>
            <Text style={styles.editPhotoLink}>{t('reportConfirm.editPhoto')}</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>{t('reportConfirm.location')}</Text>
        <Pressable
          style={styles.locationRow}
          onPress={() => router.push('/report-location-picker')}>
          <Ionicons name="location-outline" size={18} color="#1B6B3A" />
          <Text style={styles.locationText} numberOfLines={2}>
            {location?.address ?? t('reportConfirm.tapToSetLocation')}
          </Text>
          <Ionicons name="create-outline" size={18} color="#9aa5a0" />
        </Pressable>

        <Text style={styles.label}>{t('reportConfirm.commentsOptional')}</Text>
        <View style={styles.commentsBox}>
          <TextInput
            style={styles.commentsInput}
            placeholder={t('reportConfirm.addMoreDetails')}
            placeholderTextColor="#9aa5a0"
            multiline
            maxLength={COMMENT_LIMIT}
            value={comments}
            onChangeText={setComments}
          />
        </View>
        <Text style={styles.charCount}>
          {comments.length}/{COMMENT_LIMIT}
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <Pressable
          style={[styles.submitButton, (!location || submitting) && styles.submitButtonDisabled]}
          disabled={!location || submitting}
          onPress={handleSubmit}>
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>{t('reportConfirm.submitReport')}</Text>
          )}
        </Pressable>
        {!location && (
          <Text style={styles.footerHint}>{t('reportConfirm.setLocationHint')}</Text>
        )}
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
    padding: 20,
    gap: 8,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: 14,
  },
  videoPlaceholder: {
    backgroundColor: '#1A2E22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editPhotoLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B6B3A',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A2E22',
    marginTop: 12,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e0e6e2',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  locationText: {
    flex: 1,
    fontSize: 13.5,
    color: '#1A2E22',
  },
  commentsBox: {
    borderWidth: 1,
    borderColor: '#e0e6e2',
    borderRadius: 14,
    padding: 14,
    minHeight: 100,
  },
  commentsInput: {
    fontSize: 13.5,
    color: '#1A2E22',
    textAlignVertical: 'top',
    minHeight: 72,
  },
  charCount: {
    alignSelf: 'flex-end',
    fontSize: 11,
    color: '#9aa5a0',
    marginTop: 4,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eceeec',
  },
  submitButton: {
    backgroundColor: '#1B6B3A',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  footerHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#c0392b',
    textAlign: 'center',
  },
  errorText: {
    marginBottom: 10,
    fontSize: 12.5,
    color: '#c0392b',
    textAlign: 'center',
  },
});
