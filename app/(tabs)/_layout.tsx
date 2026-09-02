import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';

import { HapticTab } from '@/components/haptic-tab';
import { useLanguage } from '@/contexts/language-context';

export default function TabLayout() {
  const { t } = useLanguage();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1B6B3A',
        tabBarInactiveTintColor: '#9aa5a0',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#eceeec',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('citizenTabs.home'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: t('citizenTabs.report'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'camera' : 'camera-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-reports"
        options={{
          title: t('citizenTabs.myReports'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'reader' : 'reader-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('citizenTabs.profile'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
