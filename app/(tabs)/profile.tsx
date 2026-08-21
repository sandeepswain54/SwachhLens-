import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getMyImpactStats, type ImpactStats } from '@/lib/reports';
import { getCurrentProfile, updateFullName, uploadAvatar, type UserProfile } from '@/lib/profile';
import { supabase } from '@/lib/supabase';

const MENU_ITEMS = [
  { icon: 'person-outline', label: 'Personal Information' },
  { icon: 'location-outline', label: 'Saved Locations' },
  { icon: 'notifications-outline', label: 'Notifications' },
  { icon: 'help-circle-outline', label: 'Help & Support' },
  { icon: 'shield-checkmark-outline', label: 'Privacy Policy' },
  { icon: 'document-text-outline', label: 'Terms & Conditions' },
] as const;

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined);
  const [impact, setImpact] = useState<ImpactStats>({ submitted: 0, resolved: 0, wasteRemovedKg: 0 });
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([getCurrentProfile(), getMyImpactStats().catch(() => null)]).then(
        ([nextProfile, stats]) => {
          if (cancelled) return;
          setProfile(nextProfile);
          if (stats) setImpact(stats);
        }
      );
      return () => {
        cancelled = true;
      };
    }, [])
  );

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
      Alert.alert('Could not save name', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSavingName(false);
    }
  }

  async function pickAndUploadAvatar(fromCamera: boolean) {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow access to update your profile photo.');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.6,
          allowsEditing: true,
          aspect: [1, 1],
        })
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
      Alert.alert('Could not update photo', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  function handleChangePhoto() {
    Alert.alert('Change Profile Photo', undefined, [
      { text: 'Take Photo', onPress: () => pickAndUploadAvatar(true) },
      { text: 'Choose from Gallery', onPress: () => pickAndUploadAvatar(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (profile === undefined) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <ActivityIndicator color="#1B6B3A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Pressable hitSlop={8} onPress={editingName ? saveName : startEditingName}>
              {savingName ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Ionicons name={editingName ? 'checkmark' : 'create-outline'} size={20} color="#ffffff" />
              )}
            </Pressable>
          </View>

          <Pressable style={styles.avatarWrapper} onPress={handleChangePhoto}>
            {profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={36} color="#ffffff" />
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              {uploadingAvatar ? (
                <ActivityIndicator color="#1B6B3A" size="small" />
              ) : (
                <Ionicons name="camera" size={14} color="#1B6B3A" />
              )}
            </View>
          </Pressable>

          {editingName ? (
            <TextInput
              style={styles.nameInput}
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder="Your name"
              placeholderTextColor="rgba(255,255,255,0.7)"
              autoFocus
              onSubmitEditing={saveName}
            />
          ) : (
            <Text style={styles.name}>{profile?.fullName}</Text>
          )}

          <Text style={styles.email}>{profile?.email}</Text>

          <Pressable
            style={styles.locationRow}
            onPress={() => router.push('/profile-location-picker')}>
            <Ionicons name="location-outline" size={14} color="#ffffff" />
            <Text style={styles.locationText} numberOfLines={1}>
              {profile?.location?.address ?? 'Set your location'}
            </Text>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.8)" />
          </Pressable>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{impact.submitted}</Text>
            <Text style={styles.statLabel}>Reports</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{impact.resolved}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{impact.wasteRemovedKg} kg</Text>
            <Text style={styles.statLabel}>Waste Removed</Text>
          </View>
        </View>

        <View style={styles.menuList}>
          {MENU_ITEMS.map((item, index) => (
            <Pressable
              key={item.label}
              style={[styles.menuRow, index === MENU_ITEMS.length - 1 && styles.menuRowLast]}>
              <Ionicons name={item.icon} size={19} color="#1B6B3A" />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#c3cac6" />
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  headerCard: {
    backgroundColor: '#1B6B3A',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    alignItems: 'center',
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  avatarWrapper: {
    marginTop: 12,
    position: 'relative',
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1B6B3A',
  },
  name: {
    marginTop: 12,
    fontSize: 19,
    fontWeight: '800',
    color: '#ffffff',
  },
  nameInput: {
    marginTop: 12,
    fontSize: 19,
    fontWeight: '800',
    color: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.6)',
    paddingVertical: 2,
    minWidth: 160,
    textAlign: 'center',
  },
  email: {
    marginTop: 2,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.85)',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  locationText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#ffffff',
    maxWidth: 220,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eceeec',
    borderRadius: 18,
    marginHorizontal: 20,
    marginTop: -18,
    paddingVertical: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#eceeec',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A2E22',
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    color: '#6b7770',
  },
  menuList: {
    marginHorizontal: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#eceeec',
    borderRadius: 18,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f2',
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
  menuLabel: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1A2E22',
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#f1d4d0',
    backgroundColor: '#fdf3f2',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#c0392b',
  },
});
