import { router } from 'expo-router';

import { LocationPickerScreen } from '@/components/location-picker-screen';
import { useReportFlow } from '@/contexts/report-flow-context';

export default function ReportLocationPickerRoute() {
  const { location, setLocation } = useReportFlow();

  return (
    <LocationPickerScreen
      titleKey="locationPicker.setLocationTitle"
      initialLocation={location}
      onConfirm={(picked) => {
        setLocation(picked);
        router.back();
      }}
    />
  );
}
