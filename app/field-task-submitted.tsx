import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getTaskById, type FieldTask } from '@/lib/field-tasks';
import { formatDateTime } from '@/lib/reports';

export default function FieldTaskSubmittedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [task, setTask] = useState<FieldTask | null | undefined>(undefined);

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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark" size={40} color="#ffffff" />
        </View>
        <Text style={styles.title}>Submitted for Review!</Text>
        <Text style={styles.subtitle}>
          Great work! Your task has been submitted for verification.
        </Text>

        {task === undefined && <ActivityIndicator color="#1B6B3A" style={{ marginTop: 20 }} />}

        {task && (
          <View style={styles.card}>
            <Text style={styles.taskCode}>#{task.assignment_code}</Text>
            <Text style={styles.taskTitle}>{task.report.category}</Text>
            <Text style={styles.taskAddress}>{task.report.address}</Text>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Submitted On</Text>
              <Text style={styles.rowValue}>
                {task.submitted_for_review_at ? formatDateTime(task.submitted_for_review_at) : '—'}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.button} onPress={() => router.replace('/(field)')}>
          <Text style={styles.buttonText}>Back to Tasks</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#1B6B3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 20,
    fontSize: 21,
    fontWeight: '800',
    color: '#1A2E22',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13.5,
    color: '#6b7770',
    textAlign: 'center',
    lineHeight: 19,
  },
  card: {
    marginTop: 28,
    width: '100%',
    backgroundColor: '#f7faf8',
    borderRadius: 16,
    padding: 16,
  },
  taskCode: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1B6B3A',
  },
  taskTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#1A2E22',
    marginTop: 2,
  },
  taskAddress: {
    fontSize: 12.5,
    color: '#6b7770',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5ebe8',
    marginVertical: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontSize: 12,
    color: '#8a9590',
  },
  rowValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A2E22',
  },
  footer: {
    padding: 20,
  },
  button: {
    backgroundColor: '#1B6B3A',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
