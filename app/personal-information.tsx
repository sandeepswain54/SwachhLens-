import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getCurrentProfile, type UserProfile } from '@/lib/profile';
import { supabase } from '@/lib/supabase';

function formatJoinDate(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function PersonalInformationScreen() {
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined);
  const [joinedAt, setJoinedAt] = useState<string | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([getCurrentProfile(), supabase.auth.getUser()]).then(
        ([currentProfile, { data }]) => {
          if (cancelled) return;
          setProfile(currentProfile);
          setJoinedAt(data.user?.created_at);
        }
      );
      return () => {
        cancelled = true;
      };
    }, [])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1A2E22" />
        </Pressable>
        <Text style={styles.headerTitle}>Personal Information</Text>
        <View style={{ width: 22 }} />
      </View>

      {profile === undefined ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#1B6B3A" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.avatarBlock}>
            {profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={32} color="#ffffff" />
              </View>
            )}
            <Text style={styles.name}>{profile?.fullName}</Text>
          </View>

          <View style={styles.card}>
            <InfoRow icon="person-outline" label="Full Name" value={profile?.fullName ?? '—'} />
            <InfoRow icon="mail-outline" label="Email" value={profile?.email ?? '—'} />
            <InfoRow
              icon="location-outline"
              label="Saved Location"
              value={profile?.location?.address ?? 'Not set'}
            />
            <InfoRow icon="calendar-outline" label="Member Since" value={formatJoinDate(joinedAt)} last />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <View style={styles.infoIconCircle}>
        <Ionicons name={icon} size={17} color="#1B6B3A" />
      </View>
      <View style={styles.infoTextBlock}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
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
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  avatarBlock: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  avatarPlaceholder: {
    backgroundColor: '#1B6B3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: '800',
    color: '#1A2E22',
  },
  card: {
    borderWidth: 1,
    borderColor: '#eceeec',
    borderRadius: 18,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f2',
  },
  infoIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e3f3ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextBlock: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11.5,
    color: '#9aa5a0',
  },
  infoValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2E22',
  },
});
