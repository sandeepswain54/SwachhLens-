import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { LocationPickerScreen, type PickedLocation } from '@/components/location-picker-screen';
import { getCurrentProfile, updateProfileLocation } from '@/lib/profile';

export default function ProfileLocationPickerRoute() {
  const [initialLocation, setInitialLocation] = useState<PickedLocation | null | undefined>(
    undefined
  );

  useEffect(() => {
    getCurrentProfile().then((profile) => setInitialLocation(profile?.location ?? null));
  }, []);

  if (initialLocation === undefined) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator color="#1B6B3A" />
      </View>
    );
  }

  return (
    <LocationPickerScreen
      titleKey="locationPicker.setYourLocationTitle"
      initialLocation={initialLocation}
      onConfirm={async (picked) => {
        await updateProfileLocation(picked).catch(() => null);
        router.back();
      }}
    />
  );
}
