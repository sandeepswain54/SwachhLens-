import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { reverseGeocode } from '@/lib/geocoding';
import { getCurrentProfile, updateProfileLocation, type UserProfile } from '@/lib/profile';
import {
  formatRelativeTime,
  getMyImpactStats,
  getMyReports,
  STATUS_COLOR,
  STATUS_LABEL,
  type ImpactStats,
  type ReportRow,
} from '@/lib/reports';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

const SEVERITY_BADGE: Record<string, { bg: string; text: string }> = {
  Low: { bg: '#e3f3ea', text: '#1B6B3A' },
  Medium: { bg: '#fdecd2', text: '#b9770e' },
  High: { bg: '#fce4e1', text: '#c0392b' },
  Critical: { bg: '#fce4e1', text: '#c0392b' },
};

const AI_FEATURES = [
  {
    icon: 'brain',
    iconSet: 'community',
    color: '#1B6B3A',
    bg: '#e3f3ea',
    label: 'Detect Waste\nType',
    feature: 'detect',
  },
  {
    icon: 'cube-outline',
    iconSet: 'ion',
    color: '#2563eb',
    bg: '#e6eefd',
    label: 'Estimate\nVolume',
    feature: 'volume',
  },
  {
    icon: 'warning-outline',
    iconSet: 'ion',
    color: '#7c3aed',
    bg: '#ede6fb',
    label: 'Check\nSeverity',
    feature: 'severity',
  },
  {
    icon: 'finger-print-outline',
    iconSet: 'ion',
    color: '#d97706',
    bg: '#fbead2',
    label: 'Find\nDuplicates',
    feature: 'duplicate',
  },
] as const;

export default function HomeScreen() {
  const [latestReport, setLatestReport] = useState<ReportRow | null | undefined>(undefined);
  const [impact, setImpact] = useState<ImpactStats>({ submitted: 0, resolved: 0, wasteRemovedKg: 0 });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function autoDetectLocation() {
        setLocating(true);
        try {
          const permission = await Location.requestForegroundPermissionsAsync();
          if (!permission.granted) {
            if (!cancelled) setLocationLabel('Set your location');
            return;
          }
          const position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const address = await reverseGeocode(
            position.coords.latitude,
            position.coords.longitude
          ).catch(() => null);

          if (cancelled) return;
          if (!address) {
            setLocationLabel('Set your location');
            return;
          }
          setLocationLabel(address);
          // Save it as the profile's location so it's remembered next time
          // and stays in sync with the Profile screen.
          await updateProfileLocation({
            address,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }).catch(() => null);
        } catch {
          if (!cancelled) setLocationLabel('Set your location');
        } finally {
          if (!cancelled) setLocating(false);
        }
      }

      async function load() {
        const [reports, stats, currentProfile] = await Promise.all([
          getMyReports().catch(() => []),
          getMyImpactStats().catch(() => ({ submitted: 0, resolved: 0, wasteRemovedKg: 0 })),
          getCurrentProfile().catch(() => null),
        ]);
        if (cancelled) return;
        setLatestReport(reports[0] ?? null);
        setImpact(stats);
        setProfile(currentProfile);

        if (currentProfile?.location) {
          setLocationLabel(currentProfile.location.address);
        } else {
          autoDetectLocation();
        }
      }
      load();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerBackground}>
            <Image
              source={require('@/assets/images/back.png')}
              style={styles.headerBackgroundImage}
              contentFit="cover"
            />

            <View style={styles.headerRow}>
              <Pressable hitSlop={8} style={styles.bellButton}>
                <Ionicons name="notifications-outline" size={24} color="#1A2E22" />
                <View style={styles.bellDot} />
              </Pressable>
            </View>

            <View style={styles.greetingBlock}>
              <Text style={styles.greeting}>
                {getGreeting()}
                {profile ? `, ${profile.fullName}` : ''}
              </Text>

              <Pressable
                style={styles.locationRow}
                onPress={() => router.push('/profile-location-picker')}>
                <Ionicons name="location-outline" size={16} color="#1B6B3A" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {locating ? 'Detecting location...' : (locationLabel ?? 'Set your location')}
                </Text>
                {locating ? (
                  <ActivityIndicator size="small" color="#1B6B3A" />
                ) : (
                  <Ionicons name="chevron-down" size={16} color="#6b7770" />
                )}
              </Pressable>

              <Text style={styles.greetingSubtitle}>&apos;</Text>
            </View>
          </View>

          <View style={styles.body}>
            {/* Report a Waste Issue */}
            <View style={styles.reportCard}>
              <View style={styles.reportCardText}>
                <Text style={styles.reportCardTitle}>Report a Waste Issue</Text>
                <Text style={styles.reportCardSubtitle}>
                  Found unwanted, overflowed or misplaced waste?
                </Text>
                <Text style={styles.reportCardSubtitle}>Take a photo and let AI analyze it.</Text>

                <Pressable style={styles.reportNowButton} onPress={() => router.push('/report')}>
                  <Ionicons name="camera" size={18} color="#1B6B3A" />
                  <Text style={styles.reportNowText}>Report Now</Text>
                </Pressable>
              </View>

              <Image
                source={require('@/assets/images/03_report_waste_bin_illustration.png')}
                style={styles.reportCardImage}
                contentFit="cover"
              />
            </View>

            {/* AI Powered */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>AI Powered</Text>
              <View style={styles.aiRow}>
                {AI_FEATURES.map((feature, index) => (
                  <View key={feature.label} style={styles.aiItemWrapper}>
                    {index > 0 && <View style={styles.aiDivider} />}
                    <Pressable
                      style={styles.aiItem}
                      onPress={() =>
                        router.push({ pathname: '/report', params: { feature: feature.feature } })
                      }>
                      <View style={[styles.aiIconCircle, { backgroundColor: feature.bg }]}>
                        {feature.iconSet === 'community' ? (
                          <MaterialCommunityIcons
                            name={feature.icon as never}
                            size={22}
                            color={feature.color}
                          />
                        ) : (
                          <Ionicons name={feature.icon as never} size={22} color={feature.color} />
                        )}
                      </View>
                      <Text style={styles.aiLabel}>{feature.label}</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>

            {/* Your Active Report */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Your Active Report</Text>
              <Pressable onPress={() => router.push('/(tabs)/my-reports')}>
                <Text style={styles.linkText}>View All</Text>
              </Pressable>
            </View>

            {latestReport === undefined ? null : latestReport === null ? (
              <View style={styles.emptyReportCard}>
                <Ionicons name="camera-outline" size={22} color="#9aa5a0" />
                <Text style={styles.emptyReportText}>
                  No reports yet. Tap Report Now to submit your first one.
                </Text>
              </View>
            ) : (
              <View style={styles.activeReportCard}>
                <Image
                  source={{ uri: latestReport.media_url }}
                  style={styles.activeReportThumb}
                  contentFit="cover"
                />

                <View style={styles.activeReportBody}>
                  <View
                    style={[
                      styles.badgeHigh,
                      {
                        backgroundColor: (
                          SEVERITY_BADGE[latestReport.severity_label] ?? SEVERITY_BADGE.Low
                        ).bg,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.badgeHighText,
                        {
                          color: (SEVERITY_BADGE[latestReport.severity_label] ?? SEVERITY_BADGE.Low)
                            .text,
                        },
                      ]}>
                      {latestReport.severity_label.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.activeReportTitle}>{latestReport.category}</Text>
                  <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={13} color="#6b7770" />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {latestReport.address}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name="time-outline" size={13} color="#6b7770" />
                    <Text style={styles.metaText}>
                      Reported {formatRelativeTime(latestReport.created_at)}
                    </Text>
                  </View>
                </View>

                <View style={styles.activeReportAside}>
                  <View style={styles.assignedRow}>
                    <View
                      style={[
                        styles.badgeAssigned,
                        { backgroundColor: STATUS_COLOR[latestReport.status].bg },
                      ]}>
                      <Text
                        style={[
                          styles.badgeAssignedText,
                          { color: STATUS_COLOR[latestReport.status].text },
                        ]}>
                        {STATUS_LABEL[latestReport.status]}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    style={styles.trackButton}
                    onPress={() =>
                      router.push({
                        pathname: '/report-status',
                        params: { id: latestReport.id },
                      })
                    }>
                    <Text style={styles.trackButtonText}>Track Status</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Waste Hotspots Near You */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Waste Hotspots Near You</Text>
              <Pressable onPress={() => router.push('/waste-hotspots')}>
                <Text style={styles.linkText}>View Map</Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hotspotRow}>
              <View style={[styles.hotspotCard, styles.hotspotHigh]}>
                <Ionicons
                  name="trash"
                  size={72}
                  color="rgba(192,57,43,0.12)"
                  style={styles.hotspotWatermark}
                />
                <View style={styles.hotspotBadgeRow}>
                  <View style={styles.dotHigh} />
                  <Text style={styles.hotspotBadgeHighText}>HIGH</Text>
                </View>
                <Text style={styles.hotspotTitle}>Garbage Dump</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={13} color="#6b7770" />
                  <Text style={styles.metaText}>0.8 km away</Text>
                </View>
              </View>

              <View style={[styles.hotspotCard, styles.hotspotMedium]}>
                <Ionicons
                  name="trash-outline"
                  size={72}
                  color="rgba(217,119,6,0.14)"
                  style={styles.hotspotWatermark}
                />
                <View style={styles.hotspotBadgeRow}>
                  <View style={styles.dotMedium} />
                  <Text style={styles.hotspotBadgeMediumText}>MEDIUM</Text>
                </View>
                <Text style={styles.hotspotTitle}>Overflowing Bin</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={13} color="#6b7770" />
                  <Text style={styles.metaText}>1.4 km away</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.dotsRow}>
              <View style={[styles.pageDot, styles.pageDotActive]} />
              <View style={styles.pageDot} />
              <View style={styles.pageDot} />
              <View style={styles.pageDot} />
            </View>

            {/* Your Impact */}
            <Text style={styles.sectionHeading}>Your Impact</Text>
            <View style={styles.card}>
              <View style={styles.impactRow}>
                <View style={styles.impactItem}>
                  <View style={styles.impactIconCircle}>
                    <Ionicons name="hand-left-outline" size={20} color="#1B6B3A" />
                  </View>
                  <Text style={styles.impactValue}>{impact.submitted}</Text>
                  <Text style={styles.impactLabel}>{'Reports\nSubmitted'}</Text>
                </View>
                <View style={styles.impactItem}>
                  <View style={styles.impactIconCircle}>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#1B6B3A" />
                  </View>
                  <Text style={styles.impactValue}>{impact.resolved}</Text>
                  <Text style={styles.impactLabel}>{'Reports\nResolved'}</Text>
                </View>
                <View style={styles.impactItem}>
                  <View style={styles.impactIconCircle}>
                    <MaterialCommunityIcons name="recycle" size={20} color="#1B6B3A" />
                  </View>
                  <Text style={styles.impactValue}>{impact.wasteRemovedKg} kg</Text>
                  <Text style={styles.impactLabel}>{'Waste\nRemoved'}</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eaf3ef',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  headerBackground: {
    overflow: 'hidden',
  },
  headerBackgroundImage: {
    ...StyleSheet.absoluteFill,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  bellButton: {
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e0432b',
    borderWidth: 1,
    borderColor: '#eaf3ef',
  },
  greetingBlock: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 21,
    fontWeight: '800',
    color: '#1A2E22',
  },
  greetingSubtitle: {
    marginTop: 10,
    fontSize: 13,
    color: '#42504a',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A2E22',
  },
  body: {
    paddingHorizontal: 20,
    marginTop: 4,
    gap: 20,
  },
  reportCard: {
    flexDirection: 'row',
    backgroundColor: '#1B6B3A',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    gap: 12,
  },
  reportCardText: {
    flex: 1,
    gap: 3,
  },
  reportCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  reportCardSubtitle: {
    fontSize: 12.5,
    lineHeight: 17,
    color: '#dcefe3',
  },
  reportNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  reportNowText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B6B3A',
  },
  reportCardImage: {
    width: 118,
    height: 132,
    borderRadius: 14,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A2E22',
    marginBottom: 14,
  },
  aiRow: {
    flexDirection: 'row',
  },
  aiItemWrapper: {
    flex: 1,
    flexDirection: 'row',
  },
  aiDivider: {
    width: 1,
    backgroundColor: '#eceeec',
    marginRight: 4,
  },
  aiItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  aiIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#42504a',
    textAlign: 'center',
    lineHeight: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A2E22',
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B6B3A',
  },
  emptyReportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginTop: -8,
  },
  emptyReportText: {
    flex: 1,
    fontSize: 12.5,
    color: '#6b7770',
  },
  activeReportCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    gap: 12,
    marginTop: -8,
  },
  activeReportThumb: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: '#eef1ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeReportBody: {
    flex: 1,
    gap: 4,
  },
  activeReportAside: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  badgeHigh: {
    alignSelf: 'flex-start',
    backgroundColor: '#fce4e1',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeHighText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#c0392b',
  },
  activeReportTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2E22',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11.5,
    color: '#6b7770',
  },
  assignedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeAssigned: {
    backgroundColor: '#fdecd2',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeAssignedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b9770e',
  },
  trackButton: {
    borderWidth: 1,
    borderColor: '#1B6B3A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 'auto',
  },
  trackButtonText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1B6B3A',
  },
  hotspotRow: {
    gap: 12,
    marginTop: -8,
  },
  hotspotCard: {
    width: 168,
    borderRadius: 18,
    padding: 14,
    overflow: 'hidden',
    gap: 4,
  },
  hotspotHigh: {
    backgroundColor: '#fdf1ef',
  },
  hotspotMedium: {
    backgroundColor: '#fdf3e4',
  },
  hotspotWatermark: {
    position: 'absolute',
    right: -10,
    bottom: -14,
  },
  hotspotBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dotHigh: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#c0392b',
  },
  dotMedium: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#d97706',
  },
  hotspotBadgeHighText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#c0392b',
  },
  hotspotBadgeMediumText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b9770e',
  },
  hotspotTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A2E22',
    marginTop: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: -8,
  },
  pageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d7ddda',
  },
  pageDotActive: {
    width: 16,
    backgroundColor: '#1B6B3A',
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  impactItem: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  impactIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f3ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  impactValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A2E22',
  },
  impactLabel: {
    fontSize: 10.5,
    color: '#6b7770',
    textAlign: 'center',
    lineHeight: 13,
  },
});
