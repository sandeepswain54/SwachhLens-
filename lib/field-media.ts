import { decode as decodeBase64 } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from '@/lib/supabase';

const ASSIGNMENT_MEDIA_BUCKET = 'assignment-media';

// Uploads every picked progress photo to Storage and returns their public
// URLs, in the same order — mirrors submitReport()'s upload flow in
// lib/reports.ts (base64 read -> decode -> upload -> getPublicUrl), just
// looped and namespaced by assignment instead of by user.
export async function uploadProgressPhotos(assignmentId: string, uris: string[]): Promise<string[]> {
  const urls: string[] = [];

  for (let i = 0; i < uris.length; i++) {
    const uri = uris[i];
    const ext = uri.split('.').pop()?.split('?')[0] || 'jpg';
    const path = `${assignmentId}/${Date.now()}-${i}.${ext}`;

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const { error: uploadError } = await supabase.storage
      .from(ASSIGNMENT_MEDIA_BUCKET)
      .upload(path, decodeBase64(base64), {
        contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        upsert: false,
      });
    if (uploadError) throw new Error(`Could not upload photo ${i + 1}: ${uploadError.message}`);

    const { data } = supabase.storage.from(ASSIGNMENT_MEDIA_BUCKET).getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return urls;
}
