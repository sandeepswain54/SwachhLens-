import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Check your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Supabase recommends stopping/starting the auto token refresh loop based on
// app foreground state so it doesn't keep firing while the app is backgrounded.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

// supabase-js caches realtime channels by topic name and throws
// ("cannot add `postgres_changes` callbacks... after `subscribe()`") if a
// second call tries to attach a listener to a topic that's already
// subscribed — which happens the moment the same subscribeToX() is called
// from two screens mounted at once (e.g. two tabs that stay mounted side by
// side). Every subscribeToX() below should build its channel name with this
// so concurrent callers never collide, even when watching the same row(s).
let channelSeq = 0;
export function uniqueChannel(topic: string): string {
  channelSeq += 1;
  return `${topic}-${channelSeq}`;
}
