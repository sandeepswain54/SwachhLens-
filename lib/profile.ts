import { decode as decodeBase64 } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from '@/lib/supabase';

const AVATAR_BUCKET = 'avatars';

export type ProfileLocation = {
  address: string;
  latitude: number;
  longitude: number;
};

export type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  location: ProfileLocation | null;
};

function toProfile(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): UserProfile {
  const meta = user.user_metadata ?? {};
  const address = typeof meta.location_address === 'string' ? meta.location_address : null;

  return {
    id: user.id,
    fullName: typeof meta.full_name === 'string' && meta.full_name ? meta.full_name : 'SwachhLens User',
    email: user.email ?? '',
    avatarUrl: typeof meta.avatar_url === 'string' ? meta.avatar_url : null,
    location:
      address &&
      typeof meta.location_latitude === 'number' &&
      typeof meta.location_longitude === 'number'
        ? {
            address,
            latitude: meta.location_latitude,
            longitude: meta.location_longitude,
          }
        : null,
  };
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return toProfile(user);
}

export async function updateFullName(fullName: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ data: { full_name: fullName.trim() } });
  if (error) throw new Error(error.message);
}

export async function updateProfileLocation(location: ProfileLocation): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    data: {
      location_address: location.address,
      location_latitude: location.latitude,
      location_longitude: location.longitude,
    },
  });
  if (error) throw new Error(error.message);
}

export async function uploadAvatar(localUri: string, mimeType: string): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('You need to be signed in to update your photo.');

  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const extension = mimeType.split('/')[1]?.split('+')[0] ?? 'jpg';
  const path = `${user.id}/avatar.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, decodeBase64(base64), { contentType: mimeType, upsert: true });
  if (uploadError) throw new Error(`Could not upload photo: ${uploadError.message}`);

  const { data: publicUrlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  // Bust caches — the path is stable across re-uploads (upsert), so a plain
  // URL would keep showing the previous image.
  const avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } });
  if (updateError) throw new Error(updateError.message);

  return avatarUrl;
}
