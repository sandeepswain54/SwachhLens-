import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useReportFlow } from '@/contexts/report-flow-context';

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  High: { bg: '#fce4e1', text: '#c0392b' },
  Medium: { bg: '#fdecd2', text: '#b9770e' },
  Low: { bg: '#e3f3ea', text: '#1B6B3A' },
};

export default function ReportResultScreen() {
  const { media, analysis, location } = useReportFlow();

  useEffect(() => {
    if (!media || !analysis) router.replace('/report');
  }, [media, analysis]);

  if (!media || !analysis) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1A2E22" />
        </Pressable>
        <Text style={styles.headerTitle}>Analysis Result</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {media.kind === 'image' ? (
          <Image source={{ uri: media.uri }} style={styles.mediaPreview} contentFit="cover" />
        ) : (
          <View style={[styles.mediaPreview, styles.videoPlaceholder]}>
            <Ionicons name="videocam" size={32} color="#ffffff" />
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>Waste Type</Text>
          <Text style={styles.value}>
            {analysis.category.emoji} {analysis.category.label}
          </Text>
          <Text style={styles.subtleText}>
            Confidence: {Math.round(analysis.category.confidencePercent)}%
          </Text>

          <View style={styles.divider} />

          <Text style={styles.label}>Waste Composition</Text>
          <View style={styles.compositionList}>
            {analysis.composition.map((item) => (
              <View key={item.material} style={styles.compositionRow}>
                <Text style={styles.compositionMaterial}>{item.material}</Text>
                <View
                  style={[
                    styles.levelBadge,
                    { backgroundColor: (LEVEL_COLORS[item.level] ?? LEVEL_COLORS.Low).bg },
                  ]}>
                  <Text
                    style={[
                      styles.levelBadgeText,
                      { color: (LEVEL_COLORS[item.level] ?? LEVEL_COLORS.Low).text },
                    ]}>
                    {item.level}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          <Text style={styles.label}>Severity</Text>
          <Text style={styles.value}>
            {analysis.severity.emoji} {analysis.severity.label}
          </Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${Math.min(100, Math.max(0, analysis.severity.score))}%` },
              ]}
            />
          </View>
          <Text style={styles.subtleText}>Severity score: {analysis.severity.score}/100</Text>

          <View style={styles.divider} />

          <Text style={styles.label}>Estimated Waste Size</Text>
          <Text style={styles.value}>{analysis.estimatedSize.description}</Text>
          <Text style={styles.subtleText}>
            Coverage: ~{analysis.estimatedSize.coveragePercent}% of visible dumping area
          </Text>
          <Text style={styles.subtleText}>
            Scale reference: {analysis.estimatedSize.scaleReference}
          </Text>
          <Text style={styles.caveatText}>
            ⚠️ Approximate visual estimate, not an exact physical measurement.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.label}>Waste Spread</Text>
          <Text style={styles.value}>{analysis.spread.label}</Text>
          <Text style={styles.subtleText}>{analysis.spread.description}</Text>

          <View style={styles.divider} />

          <Text style={styles.label}>Environmental Risk</Text>
          <Text style={styles.value}>
            {analysis.environmentalRisk.emoji} {analysis.environmentalRisk.level}
          </Text>
          <Text style={styles.subtleText}>{analysis.environmentalRisk.description}</Text>

          <View style={styles.divider} />

          <Text style={styles.label}>Location Sensitivity</Text>
          <Text style={styles.value}>
            {analysis.locationSensitivity.emoji} {analysis.locationSensitivity.label}
          </Text>
          <Text style={styles.subtleText}>{analysis.locationSensitivity.note}</Text>
          {location && (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={13} color="#6b7770" />
              <Text style={styles.subtleText}>{location.address}</Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.urgencyBadge}>
            <Text style={styles.urgencyBadgeText}>
              {analysis.urgency.emoji} {analysis.urgency.label}
            </Text>
          </View>
          <Text style={styles.subtleText}>{analysis.urgency.recommendation}</Text>

          <View style={styles.divider} />

          <Text style={styles.label}>Recommended Cleanup</Text>
          <View style={styles.cleanupRow}>
            {analysis.recommendedCleanup.map((item) => (
              <View key={item.resource} style={styles.cleanupChip}>
                <Text style={styles.cleanupChipText}>
                  {item.emoji} {item.resource}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.continueButton} onPress={() => router.push('/report-confirm')}>
          <Text style={styles.continueButtonText}>Continue</Text>
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
    paddingBottom: 12,
    gap: 16,
  },
  mediaPreview: {
    width: '100%',
    height: 160,
    borderRadius: 16,
  },
  videoPlaceholder: {
    backgroundColor: '#1A2E22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
    borderColor: '#eceeec',
    borderRadius: 16,
    padding: 16,
  },
  label: {
    fontSize: 12,
    color: '#6b7770',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2E22',
  },
  subtleText: {
    marginTop: 3,
    fontSize: 12.5,
    color: '#6b7770',
  },
  caveatText: {
    marginTop: 6,
    fontSize: 11.5,
    color: '#b9770e',
  },
  divider: {
    height: 1,
    backgroundColor: '#eceeec',
    marginVertical: 14,
  },
  compositionList: {
    gap: 8,
    marginTop: 4,
  },
  compositionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compositionMaterial: {
    fontSize: 13.5,
    color: '#1A2E22',
    fontWeight: '600',
  },
  levelBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  barTrack: {
    marginTop: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#eceeec',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#1B6B3A',
    borderRadius: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  urgencyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fce4e1',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  urgencyBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#c0392b',
  },
  cleanupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  cleanupChip: {
    backgroundColor: '#eaf3ef',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cleanupChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1B6B3A',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eceeec',
  },
  continueButton: {
    backgroundColor: '#1B6B3A',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
