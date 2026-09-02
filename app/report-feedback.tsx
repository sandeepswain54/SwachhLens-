import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLanguage } from '@/contexts/language-context';
import { getAssignmentRefForReport, submitFeedback } from '@/lib/feedback';
import { getReportById, type ReportRow } from '@/lib/reports';

export default function ReportFeedbackScreen() {
  const { t } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<ReportRow | null | undefined>(undefined);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getReportById(id).then((result) => {
      if (!cancelled) setReport(result);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSubmit() {
    if (rating === 0) {
      Alert.alert(t('reportFeedback.pickARating'), t('reportFeedback.tapStarToRate'));
      return;
    }
    setSubmitting(true);
    try {
      const ref = await getAssignmentRefForReport(id);
      await submitFeedback({
        reportId: id,
        assignmentId: ref?.assignmentId ?? null,
        teamId: ref?.teamId ?? null,
        rating,
        comment,
      });
      router.back();
    } catch (err) {
      Alert.alert(t('reportFeedback.couldNotSubmitReview'), err instanceof Error ? err.message : t('common.pleaseTryAgain'));
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
        <Text style={styles.headerTitle}>{t('reportFeedback.title')}</Text>
        <View style={{ width: 22 }} />
      </View>

      {report === undefined ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#1B6B3A" />
        </View>
      ) : (
        <View style={styles.content}>
          {report && (
            <View style={styles.reportCard}>
              <Image source={{ uri: report.media_url }} style={styles.reportThumb} contentFit="cover" />
              <View style={styles.reportInfo}>
                <Text style={styles.reportCode}>{report.report_code}</Text>
                <Text style={styles.reportCategory}>{t(`wasteCategory.${report.category}`)}</Text>
                <Text style={styles.reportAddress} numberOfLines={1}>
                  {report.address}
                </Text>
              </View>
            </View>
          )}

          <Text style={styles.promptText}>{t('reportFeedback.howWasCleanup')}</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable key={star} onPress={() => setRating(star)} hitSlop={6}>
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={36}
                  color={star <= rating ? '#f5a623' : '#c3cdc7'}
                />
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionHeading}>
            {t('reportFeedback.addCommentOptional')}
          </Text>
          <TextInput
            style={styles.commentInput}
            multiline
            placeholder={t('reportFeedback.tellUsHowItWent')}
            placeholderTextColor="#9aa5a0"
            value={comment}
            onChangeText={setComment}
          />
        </View>
      )}

      <View style={styles.footer}>
        <Pressable style={styles.submitButton} disabled={submitting} onPress={handleSubmit}>
          {submitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>{t('reportFeedback.submitReview')}</Text>
          )}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2E22',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  reportCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#f7faf8',
    borderRadius: 14,
    padding: 12,
  },
  reportThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#eef1ef',
  },
  reportInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  reportCode: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1B6B3A',
  },
  reportCategory: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#1A2E22',
  },
  reportAddress: {
    fontSize: 11.5,
    color: '#6b7770',
  },
  promptText: {
    marginTop: 28,
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2E22',
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 14,
  },
  sectionHeading: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1A2E22',
    marginTop: 28,
  },
  optionalText: {
    fontWeight: '500',
    color: '#8a9590',
  },
  commentInput: {
    marginTop: 10,
    minHeight: 100,
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
  },
  submitButton: {
    backgroundColor: '#1B6B3A',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
