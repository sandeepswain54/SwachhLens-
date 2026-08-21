import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useReportFlow } from '@/contexts/report-flow-context';
import type { RiskItem } from '@/lib/gemini';

const CATEGORY_EMOJI: Record<string, string> = {
  'Overflowing Bin': '🗑️',
  'Garbage Dump': '🗑️',
  'Plastic Waste': '♻️',
  'Construction Debris': '🧱',
  'Organic Waste': '🍂',
  'E-Waste': '🔌',
  'Hazardous Waste': '☣️',
  'Drain Blockage': '🚰',
};

const LEVEL_COLOR: Record<string, string> = {
  Low: '#1B6B3A',
  Medium: '#b9770e',
  High: '#e05d2c',
  Critical: '#c0392b',
};

const PRIORITY_COLOR: Record<string, string> = {
  Normal: '#1B6B3A',
  High: '#b9770e',
  Urgent: '#c0392b',
};

const SIZE_STEPS = ['Small', 'Medium', 'Large', 'Very Large'];

function Bar({ percent, color = '#1B6B3A' }: { percent: number; color?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${clamped}%`, backgroundColor: color }]} />
    </View>
  );
}

function RiskCard({
  emoji,
  label,
  risk,
  expanded,
  onToggle,
}: {
  emoji: string;
  label: string;
  risk: RiskItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable style={styles.riskCard} onPress={onToggle}>
      <View style={styles.riskCardHeader}>
        <Text style={styles.riskCardEmoji}>{emoji}</Text>
        <View
          style={[styles.riskLevelBadge, { backgroundColor: `${LEVEL_COLOR[risk.level]}1a` }]}>
          <Text style={[styles.riskLevelBadgeText, { color: LEVEL_COLOR[risk.level] }]}>
            {risk.level.toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={styles.riskCardLabel}>{label}</Text>
      {expanded && <Text style={styles.riskCardExplanation}>{risk.explanation}</Text>}
    </Pressable>
  );
}

export default function ReportResultScreen() {
  const { media, analysis, duplicate, location } = useReportFlow();
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);

  useEffect(() => {
    if (!media || !analysis) router.replace('/report');
  }, [media, analysis]);

  if (!media || !analysis) return null;

  const { wasteType, volume, severity } = analysis;
  const dominantType =
    wasteType.typeComparison.length > 0
      ? wasteType.typeComparison.reduce((a, b) => (b.percent > a.percent ? b : a))
      : null;

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

        {/* AI Overview Dashboard */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewTitleRow}>
            <Ionicons name="hardware-chip-outline" size={16} color="#ffffff" />
            <Text style={styles.overviewTitle}>AI ANALYSIS</Text>
          </View>

          <View style={styles.overviewRow}>
            <Text style={styles.overviewRowLabel}>
              {CATEGORY_EMOJI[wasteType.primaryType] ?? '🗑️'} {wasteType.primaryType}
            </Text>
            <Text style={styles.overviewRowValue}>
              {Math.round(wasteType.confidencePercent)}%
            </Text>
          </View>
          <View style={styles.overviewRow}>
            <Text style={styles.overviewRowLabel}>📦 {volume.size}</Text>
            <Text style={styles.overviewRowValue}>{Math.round(volume.confidencePercent)}%</Text>
          </View>
          <View style={styles.overviewRow}>
            <Text style={styles.overviewRowLabel}>⚠️ {severity.level} Severity</Text>
            <Text style={styles.overviewRowValue}>{severity.score}/100</Text>
          </View>
          <View style={styles.overviewRow}>
            <Text style={styles.overviewRowLabel}>
              {severity.priority === 'Urgent' ? '🔴' : severity.priority === 'High' ? '🟠' : '🟢'}{' '}
              Priority: {severity.priority}
            </Text>
          </View>
          <View style={styles.overviewRow}>
            <Text style={styles.overviewRowLabel}>🔍 Duplicate</Text>
            <Text style={styles.overviewRowValue}>
              {duplicate && (duplicate.status === 'possible' || duplicate.status === 'yes')
                ? `${duplicate.duplicateConfidencePercent}% Match`
                : duplicate?.status === 'none'
                  ? 'None found'
                  : 'Not Available'}
            </Text>
          </View>
        </View>

        {/* 1. Waste Type Detection */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Waste Type Detection</Text>

          <Text style={styles.bigValue}>
            {CATEGORY_EMOJI[wasteType.primaryType] ?? '🗑️'} {wasteType.primaryType}
          </Text>
          {wasteType.secondaryType !== 'None' && (
            <Text style={styles.subtleText}>Secondary: {wasteType.secondaryType}</Text>
          )}

          <Text style={[styles.microLabel, { marginTop: 10 }]}>Confidence</Text>
          <Bar percent={wasteType.confidencePercent} />
          <Text style={styles.subtleText}>{Math.round(wasteType.confidencePercent)}%</Text>

          {wasteType.detectedObjects.length > 0 && (
            <>
              <Text style={[styles.microLabel, { marginTop: 12 }]}>Detected Objects</Text>
              <View style={styles.chipRow}>
                {wasteType.detectedObjects.map((object) => (
                  <View key={object} style={styles.chip}>
                    <Text style={styles.chipText}>{object}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <Text style={[styles.microLabel, { marginTop: 12 }]}>Visual Evidence</Text>
          <Text style={styles.subtleText}>{wasteType.visualEvidence}</Text>

          <Text style={[styles.microLabel, { marginTop: 10 }]}>AI Explanation</Text>
          <Text style={styles.subtleText}>{wasteType.explanation}</Text>

          {wasteType.typeComparison.length > 1 && (
            <>
              <Text style={[styles.microLabel, { marginTop: 14 }]}>Waste Type Comparison</Text>
              <View style={{ gap: 8, marginTop: 4 }}>
                {wasteType.typeComparison
                  .slice()
                  .sort((a, b) => b.percent - a.percent)
                  .map((item) => (
                    <View key={item.type}>
                      <View style={styles.compareLabelRow}>
                        <Text
                          style={[
                            styles.compareLabel,
                            item.type === dominantType?.type && styles.compareLabelDominant,
                          ]}>
                          {CATEGORY_EMOJI[item.type] ?? '🗑️'} {item.type}
                        </Text>
                        <Text style={styles.subtleText}>{Math.round(item.percent)}%</Text>
                      </View>
                      <Bar
                        percent={item.percent}
                        color={item.type === dominantType?.type ? '#1B6B3A' : '#c3cac6'}
                      />
                    </View>
                  ))}
              </View>
            </>
          )}
        </View>

        {/* 2. Waste Volume Estimation */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Waste Volume Estimation</Text>

          <View style={styles.sizeScaleRow}>
            {SIZE_STEPS.map((step) => (
              <View key={step} style={styles.sizeScaleItem}>
                <View style={[styles.sizeDot, step === volume.size && styles.sizeDotActive]} />
                <Text style={[styles.sizeLabel, step === volume.size && styles.sizeLabelActive]}>
                  {step}
                </Text>
              </View>
            ))}
          </View>

          <Text style={[styles.microLabel, { marginTop: 14 }]}>
            Estimated Volume{' '}
            <Text style={styles.approxTag}>(approximate)</Text>
          </Text>
          <Text style={styles.bigValue}>{volume.estimatedVolumeLiters}</Text>

          <Text style={[styles.microLabel, { marginTop: 12 }]}>Waste Coverage</Text>
          <Bar percent={volume.coveragePercent} />
          <Text style={styles.subtleText}>{Math.round(volume.coveragePercent)}% of visible area</Text>

          <Text style={[styles.microLabel, { marginTop: 12 }]}>Confidence</Text>
          <Bar percent={volume.confidencePercent} />
          <Text style={styles.subtleText}>{Math.round(volume.confidencePercent)}%</Text>

          <Text style={[styles.microLabel, { marginTop: 12 }]}>Scale Reference</Text>
          <Text style={styles.subtleText}>
            {volume.scaleReference ? `📏 ${volume.scaleReference}` : 'Not Available'}
          </Text>

          <Text style={[styles.microLabel, { marginTop: 12 }]}>AI Explanation</Text>
          <Text style={styles.subtleText}>{volume.explanation}</Text>
        </View>

        {/* 3. Severity Analysis */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Severity Analysis</Text>

          <View style={styles.gaugeTrack}>
            <View
              style={[
                styles.gaugeFill,
                { width: `${severity.score}%`, backgroundColor: LEVEL_COLOR[severity.level] },
              ]}
            />
          </View>
          <View style={styles.gaugeLabelsRow}>
            <Text style={styles.gaugeLabel}>Low</Text>
            <Text style={styles.gaugeLabel}>Medium</Text>
            <Text style={styles.gaugeLabel}>High</Text>
            <Text style={styles.gaugeLabel}>Critical</Text>
          </View>

          <View style={styles.severityBadgeRow}>
            <Text style={styles.severityScore}>{severity.score}/100</Text>
            <View style={[styles.levelBadge, { backgroundColor: `${LEVEL_COLOR[severity.level]}1a` }]}>
              <Text style={[styles.levelBadgeText, { color: LEVEL_COLOR[severity.level] }]}>
                {severity.level.toUpperCase()}
              </Text>
            </View>
            <View
              style={[
                styles.levelBadge,
                { backgroundColor: `${PRIORITY_COLOR[severity.priority]}1a` },
              ]}>
              <Text
                style={[styles.levelBadgeText, { color: PRIORITY_COLOR[severity.priority] }]}>
                {severity.priority.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={[styles.microLabel, { marginTop: 14 }]}>Risk Breakdown</Text>
          <View style={{ gap: 8, marginTop: 4 }}>
            {(
              [
                ['Waste Volume', severity.risks.wasteVolume],
                ['Drainage Risk', severity.risks.drainage],
                ['Location Risk', severity.risks.location],
                ['Hazard Risk', severity.risks.hazard],
                ['Waste Spread', severity.risks.spreadRoadBlocking],
              ] as [string, RiskItem][]
            ).map(([label, risk]) => (
              <View key={label}>
                <View style={styles.compareLabelRow}>
                  <Text style={styles.compareLabel}>{label}</Text>
                  <Text style={styles.subtleText}>{risk.percent}%</Text>
                </View>
                <Bar percent={risk.percent} color={LEVEL_COLOR[risk.level]} />
              </View>
            ))}
          </View>

          <Text style={[styles.microLabel, { marginTop: 16 }]}>Risk Cards</Text>
          <View style={styles.riskCardGrid}>
            <RiskCard
              emoji="📦"
              label="Volume Risk"
              risk={severity.risks.wasteVolume}
              expanded={expandedRisk === 'volume'}
              onToggle={() => setExpandedRisk((prev) => (prev === 'volume' ? null : 'volume'))}
            />
            <RiskCard
              emoji="🚰"
              label="Drainage Risk"
              risk={severity.risks.drainage}
              expanded={expandedRisk === 'drainage'}
              onToggle={() => setExpandedRisk((prev) => (prev === 'drainage' ? null : 'drainage'))}
            />
            <RiskCard
              emoji="☣️"
              label="Hazard Risk"
              risk={severity.risks.hazard}
              expanded={expandedRisk === 'hazard'}
              onToggle={() => setExpandedRisk((prev) => (prev === 'hazard' ? null : 'hazard'))}
            />
            <RiskCard
              emoji="🚗"
              label="Road Blocking"
              risk={severity.risks.spreadRoadBlocking}
              expanded={expandedRisk === 'spread'}
              onToggle={() => setExpandedRisk((prev) => (prev === 'spread' ? null : 'spread'))}
            />
          </View>

          <Text style={[styles.microLabel, { marginTop: 12 }]}>Reason</Text>
          <Text style={styles.subtleText}>{severity.reason}</Text>
        </View>

        {/* 4. Duplicate Complaint Detection */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Duplicate Complaint Detection</Text>

          {(!duplicate || duplicate.status === 'not_available') && (
            <View style={styles.duplicateEmptyRow}>
              <Ionicons name="help-circle-outline" size={18} color="#9aa5a0" />
              <Text style={styles.subtleText}>
                Duplicate Check: Not Available{location ? '' : ' — location not set'}
              </Text>
            </View>
          )}

          {duplicate?.status === 'none' && (
            <View style={styles.duplicateEmptyRow}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#1B6B3A" />
              <Text style={styles.subtleText}>
                No similar reports found nearby in the last 72 hours.
              </Text>
            </View>
          )}

          {duplicate && (duplicate.status === 'possible' || duplicate.status === 'yes') && (
            <>
              <View style={styles.matchRing}>
                <Text style={styles.matchRingPercent}>{duplicate.duplicateConfidencePercent}%</Text>
                <Text style={styles.matchRingLabel}>MATCH</Text>
              </View>
              <Text style={styles.matchStatusText}>
                {duplicate.status === 'yes' ? 'LIKELY DUPLICATE' : 'POSSIBLE DUPLICATE'}
              </Text>

              <View style={styles.compareCard}>
                <View style={styles.compareCardRow}>
                  <Text style={styles.compareCardCell}>{wasteType.primaryType}</Text>
                  <Text style={styles.compareCardArrow}>↔</Text>
                  <Text style={styles.compareCardCell}>{wasteType.primaryType}</Text>
                </View>
                <View style={styles.compareCardRow}>
                  <Text style={styles.compareCardCell}>Today</Text>
                  <Text style={styles.compareCardArrow}>↔</Text>
                  <Text style={styles.compareCardCell}>{duplicate.timeDescription}</Text>
                </View>
                <View style={styles.compareCardRow}>
                  <Text style={styles.compareCardCell}>Current Location</Text>
                  <Text style={styles.compareCardArrow}>↔</Text>
                  <Text style={styles.compareCardCell}>{duplicate.locationDistanceMeters} m away</Text>
                </View>
              </View>

              <View style={{ gap: 6, marginTop: 12 }}>
                <View style={styles.matchIndicatorRow}>
                  <Text style={styles.subtleText}>📍 Location</Text>
                  <Text style={styles.matchIndicatorGood}>✓ Match</Text>
                </View>
                <View style={styles.matchIndicatorRow}>
                  <Text style={styles.subtleText}>⏱️ Time</Text>
                  <Text style={styles.matchIndicatorGood}>✓ Match</Text>
                </View>
                <View style={styles.matchIndicatorRow}>
                  <Text style={styles.subtleText}>🗑️ Waste Type</Text>
                  <Text style={styles.matchIndicatorGood}>✓ Match</Text>
                </View>
                <View style={styles.matchIndicatorRow}>
                  <Text style={styles.subtleText}>📸 Image</Text>
                  <Text style={styles.subtleText}>Not Available</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.microLabel}>Existing Complaint</Text>
              <Text style={styles.bigValue}>{duplicate.similarComplaintId}</Text>

              <Text style={[styles.microLabel, { marginTop: 8 }]}>Status</Text>
              <Text style={styles.subtleText}>🟡 {duplicate.existingComplaintStatus}</Text>

              <Text style={[styles.microLabel, { marginTop: 8 }]}>AI Recommendation</Text>
              <Text style={styles.subtleText}>{duplicate.recommendedAction}</Text>
            </>
          )}
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
  overviewCard: {
    backgroundColor: '#16532f',
    borderRadius: 18,
    padding: 18,
    gap: 8,
  },
  overviewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  overviewTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overviewRowLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#eaf3ef',
  },
  overviewRowValue: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  card: {
    borderWidth: 1,
    borderColor: '#eceeec',
    borderRadius: 16,
    padding: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A2E22',
    marginBottom: 10,
  },
  microLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#6b7770',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  bigValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A2E22',
    marginTop: 2,
  },
  subtleText: {
    marginTop: 3,
    fontSize: 12.5,
    color: '#6b7770',
  },
  approxTag: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#b9770e',
    textTransform: 'none',
  },
  barTrack: {
    marginTop: 4,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#eceeec',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  chip: {
    backgroundColor: '#eaf3ef',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1B6B3A',
  },
  compareLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  compareLabel: {
    fontSize: 12.5,
    color: '#42504a',
    fontWeight: '600',
  },
  compareLabelDominant: {
    color: '#1A2E22',
    fontWeight: '800',
  },
  sizeScaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sizeScaleItem: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  sizeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e0e6e2',
  },
  sizeDotActive: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1B6B3A',
  },
  sizeLabel: {
    fontSize: 10.5,
    color: '#9aa5a0',
    fontWeight: '600',
  },
  sizeLabelActive: {
    color: '#1B6B3A',
    fontWeight: '800',
  },
  gaugeTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#eceeec',
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 5,
  },
  gaugeLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  gaugeLabel: {
    fontSize: 10,
    color: '#9aa5a0',
  },
  severityBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  severityScore: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A2E22',
  },
  levelBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  riskCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  riskCard: {
    width: '47%',
    borderWidth: 1,
    borderColor: '#eceeec',
    borderRadius: 14,
    padding: 12,
  },
  riskCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  riskCardEmoji: {
    fontSize: 18,
  },
  riskLevelBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  riskLevelBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  riskCardLabel: {
    marginTop: 8,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1A2E22',
  },
  riskCardExplanation: {
    marginTop: 6,
    fontSize: 11.5,
    color: '#6b7770',
    lineHeight: 16,
  },
  duplicateEmptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  matchRing: {
    alignSelf: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    borderColor: '#1B6B3A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  matchRingPercent: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A2E22',
  },
  matchRingLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6b7770',
  },
  matchStatusText: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    color: '#b9770e',
  },
  compareCard: {
    marginTop: 14,
    backgroundColor: '#f4f7f5',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  compareCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compareCardCell: {
    flex: 1,
    fontSize: 12,
    color: '#1A2E22',
    fontWeight: '600',
  },
  compareCardArrow: {
    fontSize: 12,
    color: '#9aa5a0',
    marginHorizontal: 6,
  },
  matchIndicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  matchIndicatorGood: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1B6B3A',
  },
  divider: {
    height: 1,
    backgroundColor: '#eceeec',
    marginVertical: 14,
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
