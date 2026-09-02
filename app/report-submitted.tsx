import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLanguage } from '@/contexts/language-context';
import { useReportFlow } from '@/contexts/report-flow-context';

const DOTS = [
  { top: 6, left: '18%', color: '#f4c542', size: 8 },
  { top: 30, left: '78%', color: '#2563eb', size: 6 },
  { top: 70, left: '10%', color: '#1B6B3A', size: 6 },
  { top: 100, left: '85%', color: '#c0392b', size: 8 },
  { top: 130, left: '25%', color: '#7c3aed', size: 6 },
] as const;

export default function ReportSubmittedScreen() {
  const { t } = useLanguage();
  const { reportId, submittedAt, merged, alreadyReported, reset } = useReportFlow();

  useEffect(() => {
    if (!reportId) router.replace('/report');
  }, [reportId]);

  if (!reportId) return null;

  function handleGoToMyReports() {
    reset();
    router.replace('/(tabs)/my-reports');
  }

  // Geo-deduplication + anti-spam: a submission within 20m of an existing
  // active report links to it instead of creating a new ticket (`merged`),
  // and if this same user had already reported/confirmed that exact ticket
  // before, their confirmation isn't counted again (`alreadyReported`).
  const title = alreadyReported
    ? t('reportSubmitted.alreadyReportedTitle')
    : merged
      ? t('reportSubmitted.mergedTitle')
      : t('reportSubmitted.title');
  const subtitle = alreadyReported
    ? t('reportSubmitted.alreadyReportedSubtitle')
    : merged
      ? t('reportSubmitted.mergedSubtitle')
      : t('reportSubmitted.subtitle');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.checkWrapper}>
          {DOTS.map((dot, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  top: dot.top,
                  left: dot.left,
                  width: dot.size,
                  height: dot.size,
                  borderRadius: dot.size / 2,
                  backgroundColor: dot.color,
                },
              ]}
            />
          ))}
          <Ionicons name="checkmark-circle" size={88} color="#1B6B3A" />
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>
            {merged ? t('reportSubmitted.linkedReportId') : t('reportSubmitted.reportId')}
          </Text>
          <Text style={styles.cardValue}>{reportId}</Text>

          <View style={styles.cardDivider} />

          <Text style={styles.cardLabel}>{t('reportSubmitted.submittedOn')}</Text>
          <Text style={styles.cardValue}>{submittedAt}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.primaryButton} onPress={handleGoToMyReports}>
          <Text style={styles.primaryButtonText}>{t('reportSubmitted.goToMyReports')}</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  checkWrapper: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  dot: {
    position: 'absolute',
  },
  title: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '800',
    color: '#1B6B3A',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13.5,
    color: '#6b7770',
    textAlign: 'center',
  },
  card: {
    marginTop: 28,
    width: '100%',
    backgroundColor: '#f4f7f5',
    borderRadius: 16,
    padding: 18,
  },
  cardLabel: {
    fontSize: 12,
    color: '#6b7770',
  },
  cardValue: {
    marginTop: 3,
    fontSize: 16,
    fontWeight: '800',
    color: '#1A2E22',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#e0e6e2',
    marginVertical: 14,
  },
  footer: {
    padding: 20,
  },
  primaryButton: {
    backgroundColor: '#1B6B3A',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
