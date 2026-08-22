import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  FIELD_TASK_STATUS_BADGE,
  FIELD_TASK_STATUS_LABEL,
  getTaskById,
  startOnTheWay,
  subscribeToTask,
  type FieldTask,
} from '@/lib/field-tasks';
import { priorityMeta } from '@/lib/field-ui';
import { formatDateTime, formatRelativeTime, SIZE_KG_ESTIMATE } from '@/lib/reports';

export default function FieldTaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [task, setTask] = useState<FieldTask | null | undefined>(undefined);
  const [starting, setStarting] = useState(false);

  const load = useCallback(() => {
    getTaskById(id).then(setTask).catch(() => setTask(null));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
      return subscribeToTask(id, load);
    }, [id, load])
  );

  async function handlePrimaryAction() {
    if (!task) return;
    if (task.status === 'pending') {
      setStarting(true);
      try {
        await startOnTheWay(task.id);
        router.push({ pathname: '/field-task-on-the-way', params: { id: task.id } });
      } catch (err) {
        Alert.alert('Could not start task', err instanceof Error ? err.message : 'Please try again.');
      } finally {
        setStarting(false);
      }
      return;
    }
    if (task.status === 'on_the_way') {
      router.push({ pathname: '/field-task-on-the-way', params: { id: task.id } });
      return;
    }
    if (task.status === 'in_progress') {
      router.push({ pathname: '/field-task-progress', params: { id: task.id } });
    }
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
        <Ionicons name="alert-circle-outline" size={32} color="#c0392b" />
        <Text style={styles.notFoundText}>Could not find this task.</Text>
        <Pressable onPress={() => router.back()} style={styles.notFoundButton}>
          <Text style={styles.notFoundButtonText}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const priority = priorityMeta(task.report.urgency_label);
  const statusBadge = FIELD_TASK_STATUS_BADGE[task.status];
  const volume = task.report.analysis?.volume;
  const kgEstimate = volume ? SIZE_KG_ESTIMATE[volume.size] : undefined;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1A2E22" />
        </Pressable>
        <Text style={styles.headerTitle}>#{task.assignment_code}</Text>
        <View style={[styles.priorityBadge, { backgroundColor: priority.bg }]}>
          <Text style={[styles.priorityBadgeText, { color: priority.text }]}>{priority.label} Priority</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.category}>{task.report.category}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={13} color="#6b7770" />
          <Text style={styles.metaText}>{task.report.address}</Text>
        </View>

        <Image source={{ uri: task.report.media_url }} style={styles.media} contentFit="cover" />

        <View style={[styles.statusPill, { backgroundColor: statusBadge.bg }]}>
          <Text style={[styles.statusPillText, { color: statusBadge.text }]}>
            {FIELD_TASK_STATUS_LABEL[task.status]}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Reported On</Text>
          <Text style={styles.infoValue}>{formatDateTime(task.report.created_at)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Reported By</Text>
          <Text style={styles.infoValue}>Citizen (App User)</Text>
        </View>

        <Text style={styles.sectionHeading}>Description</Text>
        <Text style={styles.description}>
          {task.report.comments || 'No additional details were provided with this report.'}
        </Text>

        <View style={styles.analysisCard}>
          <Text style={styles.sectionHeading}>AI Analysis</Text>
          <View style={styles.analysisRow}>
            <Text style={styles.analysisLabel}>Waste Type</Text>
            <Text style={styles.analysisValue}>{task.report.category}</Text>
          </View>
          <View style={styles.analysisRow}>
            <Text style={styles.analysisLabel}>Volume (Estimated)</Text>
            <Text style={styles.analysisValue}>
              {volume ? `${volume.size}${kgEstimate ? ` (~${kgEstimate} kg)` : ''}` : 'Not available'}
            </Text>
          </View>
          <View style={styles.analysisRow}>
            <Text style={styles.analysisLabel}>Severity Score</Text>
            <Text style={styles.analysisValue}>{task.report.severity_score}/100</Text>
          </View>
        </View>

        {task.status === 'pending_review' && (
          <View style={styles.reviewNotice}>
            <Ionicons name="time-outline" size={16} color="#7c3aed" />
            <Text style={styles.reviewNoticeText}>
              Submitted {task.submitted_for_review_at ? formatRelativeTime(task.submitted_for_review_at) : 'recently'}
              . Waiting for admin approval.
            </Text>
          </View>
        )}
        {task.status === 'completed' && (
          <View style={styles.doneNotice}>
            <Ionicons name="checkmark-circle" size={16} color="#1B6B3A" />
            <Text style={styles.doneNoticeText}>This task was approved and marked complete.</Text>
          </View>
        )}
      </ScrollView>

      {(task.status === 'pending' || task.status === 'on_the_way' || task.status === 'in_progress') && (
        <View style={styles.footer}>
          <Pressable style={styles.primaryButton} disabled={starting} onPress={handlePrimaryAction}>
            {starting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {task.status === 'pending'
                  ? 'Start Task'
                  : task.status === 'on_the_way'
                    ? 'Continue: On the Way'
                    : 'Continue: Upload Progress'}
              </Text>
            )}
          </Pressable>
        </View>
      )}
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
    paddingHorizontal: 32,
  },
  notFoundText: {
    fontSize: 14,
    color: '#6b7770',
  },
  notFoundButton: {
    marginTop: 4,
    backgroundColor: '#1B6B3A',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  notFoundButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13.5,
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
  priorityBadge: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  category: {
    fontSize: 21,
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
    fontSize: 13,
    color: '#6b7770',
  },
  media: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    marginTop: 14,
    backgroundColor: '#eef1ef',
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 10,
  },
  statusPillText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f2',
    marginTop: 6,
  },
  infoLabel: {
    fontSize: 12.5,
    color: '#8a9590',
  },
  infoValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1A2E22',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A2E22',
    marginTop: 18,
  },
  description: {
    marginTop: 6,
    fontSize: 13,
    color: '#4a5750',
    lineHeight: 19,
  },
  analysisCard: {
    marginTop: 18,
    backgroundColor: '#f7faf8',
    borderRadius: 14,
    padding: 14,
  },
  analysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  analysisLabel: {
    fontSize: 12.5,
    color: '#6b7770',
  },
  analysisValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1A2E22',
  },
  reviewNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: '#ede6fb',
    borderRadius: 14,
    padding: 12,
  },
  reviewNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#5b21b6',
    lineHeight: 17,
  },
  doneNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: '#e3f3ea',
    borderRadius: 14,
    padding: 12,
  },
  doneNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#1B6B3A',
    lineHeight: 17,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f2',
  },
  primaryButton: {
    backgroundColor: '#1B6B3A',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
