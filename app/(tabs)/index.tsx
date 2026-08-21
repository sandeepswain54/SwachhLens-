import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const AI_FEATURES = [
  { icon: 'brain', iconSet: 'community', color: '#1B6B3A', bg: '#e3f3ea', label: 'Detect Waste\nType' },
  { icon: 'cube-outline', iconSet: 'ion', color: '#2563eb', bg: '#e6eefd', label: 'Estimate\nVolume' },
  { icon: 'warning-outline', iconSet: 'ion', color: '#7c3aed', bg: '#ede6fb', label: 'Check\nSeverity' },
  { icon: 'finger-print-outline', iconSet: 'ion', color: '#d97706', bg: '#fbead2', label: 'Find\nDuplicates' },
] as const;

const IMPACT_STATS = [
  { icon: 'hand-left-outline', iconSet: 'ion', value: '3', label: 'Reports\nSubmitted' },
  { icon: 'checkmark-circle-outline', iconSet: 'ion', value: '2', label: 'Reports\nResolved' },
  { icon: 'recycle', iconSet: 'community', value: '12 kg', label: 'Waste\nRemoved' },
] as const;

export default function HomeScreen() {
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
              <Pressable hitSlop={8}>
                <Ionicons name="menu" size={26} color="#1A2E22" />
              </Pressable>

              <Pressable hitSlop={8} style={styles.bellButton}>
                <Ionicons name="notifications-outline" size={24} color="#1A2E22" />
                <View style={styles.bellDot} />
              </Pressable>
            </View>

            <View style={styles.greetingBlock}>
              <Text style={styles.greeting}>Good Morning, Sandeep! 👋</Text>

              <Pressable style={styles.locationRow}>
                <Ionicons name="location-outline" size={16} color="#1B6B3A" />
                <Text style={styles.locationText}>Bhubaneswar, Odisha</Text>
                <Ionicons name="chevron-down" size={16} color="#6b7770" />
              </Pressable>

              <Text style={styles.greetingSubtitle}>
                &apos;
              </Text>
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
                    <View style={styles.aiItem}>
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
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Your Active Report */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Your Active Report</Text>
              <Pressable>
                <Text style={styles.linkText}>View All</Text>
              </Pressable>
            </View>

            <View style={styles.activeReportCard}>
              <View style={styles.activeReportThumb}>
                <Ionicons name="image-outline" size={28} color="#9aa5a0" />
              </View>

              <View style={styles.activeReportBody}>
                <View style={styles.badgeHigh}>
                  <Text style={styles.badgeHighText}>HIGH</Text>
                </View>
                <Text style={styles.activeReportTitle}>Garbage Dump</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={13} color="#6b7770" />
                  <Text style={styles.metaText}>Khandagiri Road, Bhubaneswar</Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={13} color="#6b7770" />
                  <Text style={styles.metaText}>Reported 20 min ago</Text>
                </View>
              </View>

              <View style={styles.activeReportAside}>
                <View style={styles.assignedRow}>
                  <View style={styles.badgeAssigned}>
                    <Text style={styles.badgeAssignedText}>Team Assigned</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9aa5a0" />
                </View>
                <Pressable style={styles.trackButton}>
                  <Text style={styles.trackButtonText}>Track Status</Text>
                </Pressable>
              </View>
            </View>

            {/* Waste Hotspots Near You */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Waste Hotspots Near You</Text>
              <Pressable>
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
                {IMPACT_STATS.map((stat) => (
                  <View key={stat.label} style={styles.impactItem}>
                    <View style={styles.impactIconCircle}>
                      {stat.iconSet === 'community' ? (
                        <MaterialCommunityIcons name={stat.icon as never} size={20} color="#1B6B3A" />
                      ) : (
                        <Ionicons name={stat.icon as never} size={20} color="#1B6B3A" />
                      )}
                    </View>
                    <Text style={styles.impactValue}>{stat.value}</Text>
                    <Text style={styles.impactLabel}>{stat.label}</Text>
                  </View>
                ))}
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
    justifyContent: 'space-between',
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
