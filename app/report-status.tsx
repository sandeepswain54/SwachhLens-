import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  formatRelativeTime,
  getReportById,
  STATUS_LABEL,
  STATUS_ORDER,
  type ReportRow,
} from '@/lib/reports';

const STEP_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  submitted: 'document-text-outline',
  team_assigned: 'people-outline',
  in_progress: 'construct-outline',
  resolved: 'checkmark-done-outline',
};

const STEP_DESCRIPTION: Record<string, string> = {
  submitted: 'Your report was received.',
  team_assigned: 'A cleanup team has been assigned to this report.',
  in_progress: 'The team is actively working on cleanup.',
  resolved: 'This waste issue has been cleaned up.',
};

export default function ReportStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<ReportRow | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getReportById(id).then((result) => {
      if (!cancelled) setReport(result);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const currentStepIndex = report ? STATUS_ORDER.indexOf(report.status) : -1;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1A2E22" />
        </Pressable>
        <Text style={styles.headerTitle}>Report Status</Text>
        <View style={{ width: 22 }} />
      </View>

      {report === undefined && (
        <View style={styles.centered}>
          <ActivityIndicator color="#1B6B3A" />
        </View>
      )}

      {report === null && (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color="#c0392b" />
          <Text style={styles.notFoundText}>Could not find this report.</Text>
        </View>
      )}

      {report && (
        <ScrollView contentContainerStyle={styles.content}>
          <Image source={{ uri: report.media_url }} style={styles.media} contentFit="cover" />

          <Text style={styles.reportCode}>{report.report_code}</Text>
          <Text style={styles.category}>{report.category}</Text>

          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color="#6b7770" />
            <Text style={styles.metaText}>{report.address}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color="#6b7770" />
            <Text style={styles.metaText}>Reported {formatRelativeTime(report.created_at)}</Text>
          </View>

          <View style={styles.stepper}>
            {STATUS_ORDER.map((step, index) => {
              const done = index <= currentStepIndex;
              const isLast = index === STATUS_ORDER.length - 1;
              return (
                <View key={step} style={styles.stepRow}>
                  <View style={styles.stepIconColumn}>
                    <View style={[styles.stepIconCircle, done && styles.stepIconCircleDone]}>
                      <Ionicons
                        name={STEP_ICON[step]}
                        size={16}
                        color={done ? '#ffffff' : '#9aa5a0'}
                      />
                    </View>
                    {!isLast && <View style={[styles.stepLine, done && styles.stepLineDone]} />}
                  </View>
                  <View style={styles.stepTextColumn}>
                    <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>
                      {STATUS_LABEL[step]}
                    </Text>
                    <Text style={styles.stepDescription}>{STEP_DESCRIPTION[step]}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  notFoundText: {
    fontSize: 14,
    color: '#6b7770',
  },
  content: {
    padding: 20,
  },
  media: {
    width: '100%',
    height: 160,
    borderRadius: 16,
  },
  reportCode: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: '700',
    color: '#1B6B3A',
  },
  category: {
    marginTop: 2,
    fontSize: 19,
    fontWeight: '800',
    color: '#1A2E22',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  metaText: {
    fontSize: 12.5,
    color: '#6b7770',
  },
  stepper: {
    marginTop: 28,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 14,
  },
  stepIconColumn: {
    alignItems: 'center',
  },
  stepIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#eceeec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconCircleDone: {
    backgroundColor: '#1B6B3A',
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 28,
    backgroundColor: '#eceeec',
    marginTop: 2,
  },
  stepLineDone: {
    backgroundColor: '#1B6B3A',
  },
  stepTextColumn: {
    flex: 1,
    paddingBottom: 20,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9aa5a0',
  },
  stepLabelDone: {
    color: '#1A2E22',
  },
  stepDescription: {
    marginTop: 2,
    fontSize: 12,
    color: '#6b7770',
  },
});
