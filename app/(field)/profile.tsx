import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLanguage } from '@/contexts/language-context';
import { LANGUAGES } from '@/lib/i18n/translations';
import { getTeamRatingStats, subscribeToTeamFeedback, type TeamRatingStats } from '@/lib/feedback';
import { type FieldTask, getMyTasks, subscribeToMyTasks } from '@/lib/field-tasks';
import { getMyTeam, subscribeToMyTeam, type MyTeam } from '@/lib/field-team';
import { getCurrentProfile, updateFullName, uploadAvatar, type UserProfile } from '@/lib/profile';
import { supabase } from '@/lib/supabase';

function formatDateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function FieldProfileScreen() {
  const { t, language } = useLanguage();
  const currentLanguageName = LANGUAGES.find((l) => l.code === language)?.nativeName ?? 'English';
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined);
  const [team, setTeam] = useState<MyTeam | null | undefined>(undefined);
  const [tasks, setTasks] = useState<FieldTask[]>([]);
  const [ratingStats, setRatingStats] = useState<TeamRatingStats>({ average: null, count: 0 });
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const reloadTasks = useCallback(async (teamId: string) => {
    try {
      setTasks(await getMyTasks(teamId));
    } catch {
      // keep whatever was already on screen
    }
  }, []);

  const reloadRating = useCallback(async (teamId: string) => {
    try {
      setRatingStats(await getTeamRatingStats(teamId));
    } catch {
      // keep whatever was already on screen
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([getCurrentProfile(), getMyTeam()]).then(([nextProfile, nextTeam]) => {
        if (cancelled) return;
        setProfile(nextProfile);
        setTeam(nextTeam);
        if (nextTeam) {
          reloadTasks(nextTeam.id);
          reloadRating(nextTeam.id);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [reloadTasks, reloadRating])
  );

  const teamId = team?.id;

  // Every task update, team edit (admin panel), or new citizen review lands
  // here instantly — Tasks Completed, Completion Rate, zone/team, and
  // Rating are all live.
  useEffect(() => {
    if (!teamId) return;
    const unsubTeam = subscribeToMyTeam(teamId, setTeam);
    const unsubTasks = subscribeToMyTasks(teamId, () => reloadTasks(teamId));
    const unsubFeedback = subscribeToTeamFeedback(teamId, () => reloadRating(teamId));
    return () => {
      unsubTeam();
      unsubTasks();
      unsubFeedback();
    };
  }, [teamId, reloadTasks, reloadRating]);

  // Date.now() is impure, so it can't be called directly during render — the
  // lazy useState initializer form runs it exactly once (on mount), which is
  // all "days active" needs (it doesn't need to tick live second-to-second).
  const [nowMs] = useState(() => Date.now());

  const completedCount = useMemo(() => tasks.filter((t) => t.status === 'completed').length, [tasks]);
  const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : null;
  const daysActive = team ? Math.max(1, Math.floor((nowMs - new Date(team.work_since).getTime()) / 86400000) + 1) : 0;

  function startEditingName() {
    if (!profile) return;
    setNameDraft(profile.fullName);
    setEditingName(true);
  }

  async function saveName() {
    if (!nameDraft.trim()) return;
    setSavingName(true);
    try {
      await updateFullName(nameDraft);
      setProfile((prev) => (prev ? { ...prev, fullName: nameDraft.trim() } : prev));
      setEditingName(false);
    } catch (err) {
      Alert.alert(t('common.couldNotSaveName'), err instanceof Error ? err.message : t('common.pleaseTryAgain'));
    } finally {
      setSavingName(false);
    }
  }

  async function pickAndUploadAvatar(fromCamera: boolean) {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('common.permissionNeeded'), t('common.allowPhotoAccess'));
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6, allowsEditing: true, aspect: [1, 1] })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.6,
          allowsEditing: true,
          aspect: [1, 1],
        });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setUploadingAvatar(true);
    try {
      const avatarUrl = await uploadAvatar(asset.uri, asset.mimeType ?? 'image/jpeg');
      setProfile((prev) => (prev ? { ...prev, avatarUrl } : prev));
    } catch (err) {
      Alert.alert(t('common.couldNotUpdatePhoto'), err instanceof Error ? err.message : t('common.pleaseTryAgain'));
    } finally {
      setUploadingAvatar(false);
    }
  }

  function handleChangePhoto() {
    Alert.alert(t('common.changeProfilePhoto'), undefined, [
      { text: t('common.takePhoto'), onPress: () => pickAndUploadAvatar(true) },
      { text: t('common.chooseFromGallery'), onPress: () => pickAndUploadAvatar(false) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  function handleSettingsPress() {
    Alert.alert(t('fieldProfile.settings'), undefined, [
      { text: t('fieldProfile.editFullName'), onPress: startEditingName },
      { text: t('fieldProfile.changePhoto'), onPress: handleChangePhoto },
      { text: t('common.logout'), style: 'destructive', onPress: handleLogout },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  function handleAbout() {
    Alert.alert(t('fieldProfile.aboutApp'), t('fieldProfile.aboutAppBody'));
  }

  function handleChangeLanguage() {
    router.push('/language-select');
  }

  if (profile === undefined || team === undefined) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <ActivityIndicator color="#1B6B3A" />
      </SafeAreaView>
    );
  }

  if (team === null) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <Ionicons name="alert-circle-outline" size={32} color="#c0392b" />
        <Text style={styles.errorText}>{t('common.notFieldTeamAccount')}</Text>
        <Pressable style={styles.errorLogoutButton} onPress={handleLogout}>
          <Text style={styles.errorLogoutText}>{t('common.backToLogin')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('fieldProfile.headerTitle')}</Text>
          <Pressable hitSlop={8} onPress={handleSettingsPress}>
            <Ionicons name="settings-outline" size={22} color="#ffffff" />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <Pressable style={styles.avatarWrapper} onPress={handleChangePhoto}>
              {profile?.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={32} color="#ffffff" />
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                {uploadingAvatar ? (
                  <ActivityIndicator color="#1B6B3A" size="small" />
                ) : (
                  <Ionicons name="camera" size={13} color="#1B6B3A" />
                )}
              </View>
            </Pressable>

            <View style={styles.profileInfo}>
              <Text style={styles.name} numberOfLines={1}>
                {profile?.fullName || team.leader_name}
              </Text>
              <View style={styles.rolePill}>
                <Ionicons name="person-outline" size={12} color="#1B6B3A" />
                <Text style={styles.rolePillText}>{t('fieldProfile.fieldTeamMember')}</Text>
              </View>
              <View style={styles.emailRow}>
                <Ionicons name="mail-outline" size={12} color="#6b7770" />
                <Text style={styles.emailText} numberOfLines={1}>
                  {profile?.email}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <ProfileStat icon="checkmark-done-outline" value={String(completedCount)} label={t('fieldProfile.tasksCompleted')} />
            <ProfileStat
              icon="stats-chart-outline"
              value={completionRate === null ? '—' : `${completionRate}%`}
              label={t('fieldProfile.completionRate')}
            />
            <ProfileStat
              icon="star"
              iconColor="#f5a623"
              value={ratingStats.average === null ? '—' : ratingStats.average.toFixed(1)}
              label={t('fieldProfile.rating')}
            />
            <ProfileStat icon="calendar-outline" value={String(daysActive)} label={t('fieldProfile.daysActive')} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeading}>{t('fieldProfile.basicInformation')}</Text>

          <InfoRow icon="person-outline" label={t('fieldProfile.fullName')}>
            {editingName ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.nameInput}
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  autoFocus
                  onSubmitEditing={saveName}
                />
                <Pressable onPress={saveName} disabled={savingName} hitSlop={8}>
                  {savingName ? (
                    <ActivityIndicator color="#1B6B3A" size="small" />
                  ) : (
                    <Ionicons name="checkmark" size={18} color="#1B6B3A" />
                  )}
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.editRow} onPress={startEditingName}>
                <Text style={styles.infoValue}>{profile?.fullName}</Text>
                <Ionicons name="create-outline" size={15} color="#8a9590" />
              </Pressable>
            )}
          </InfoRow>

          <InfoRow icon="mail-outline" label={t('fieldProfile.emailAddress')}>
            <Text style={styles.infoValue}>{profile?.email}</Text>
          </InfoRow>

          <InfoRow icon="people-outline" label={t('fieldProfile.team')}>
            <Text style={styles.infoValue}>
              {team.team_name} ({team.zone})
            </Text>
          </InfoRow>

          <InfoRow icon="calendar-outline" label={t('fieldProfile.joinedOn')} isLast>
            <Text style={styles.infoValue}>{formatDateOnly(team.work_since)}</Text>
          </InfoRow>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeading}>{t('fieldProfile.moreOptions')}</Text>
          <Pressable style={styles.optionRow} onPress={handleAbout}>
            <Ionicons name="information-circle-outline" size={19} color="#1B6B3A" />
            <Text style={styles.optionLabel}>{t('fieldProfile.aboutApp')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#c3cac6" />
          </Pressable>
          <Pressable style={styles.optionRow} onPress={handleChangeLanguage}>
            <Ionicons name="language-outline" size={19} color="#1B6B3A" />
            <Text style={styles.optionLabel}>{t('common.language')}</Text>
            <Text style={styles.optionValue}>{currentLanguageName}</Text>
            <Ionicons name="chevron-forward" size={16} color="#c3cac6" />
          </Pressable>
          <Pressable style={[styles.optionRow, styles.optionRowLast]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={19} color="#c0392b" />
            <Text style={[styles.optionLabel, styles.logoutLabel]}>{t('common.logout')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#e8b4ac" />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function ProfileStat({
  icon,
  value,
  label,
  iconColor = '#1B6B3A',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  iconColor?: string;
}) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={19} color={iconColor} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  children,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  children: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.infoRow, isLast && styles.infoRowLast]}>
      <View style={styles.infoLabelGroup}>
        <Ionicons name={icon} size={15} color="#1B6B3A" />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eaf3ef',
  },
  headerSafeArea: {
    backgroundColor: '#0f3d2b',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 14,
    color: '#6b7770',
    textAlign: 'center',
  },
  errorLogoutButton: {
    marginTop: 4,
    backgroundColor: '#1B6B3A',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  errorLogoutText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f3d2b',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
    gap: 16,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
  },
  profileTopRow: {
    flexDirection: 'row',
    gap: 14,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#eef1ef',
  },
  avatarPlaceholder: {
    backgroundColor: '#1B6B3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1B6B3A',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 5,
  },
  name: {
    fontSize: 18.5,
    fontWeight: '800',
    color: '#1A2E22',
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#e3f3ea',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1B6B3A',
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emailText: {
    fontSize: 11.5,
    color: '#6b7770',
    flexShrink: 1,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f2',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A2E22',
  },
  statLabel: {
    fontSize: 9.5,
    color: '#8a9590',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
  },
  cardHeading: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1A2E22',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f2',
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: '#4a5750',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    color: '#1A2E22',
    fontWeight: '700',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameInput: {
    fontSize: 13,
    color: '#1A2E22',
    fontWeight: '700',
    borderBottomWidth: 1,
    borderBottomColor: '#1B6B3A',
    minWidth: 120,
    textAlign: 'right',
    paddingVertical: 2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f2',
  },
  optionRowLast: {
    borderBottomWidth: 0,
  },
  optionLabel: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1A2E22',
  },
  optionValue: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#6b7770',
  },
  logoutLabel: {
    color: '#c0392b',
  },
});
