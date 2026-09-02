import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';

import { HapticTab } from '@/components/haptic-tab';
import { useLanguage } from '@/contexts/language-context';

// Field-team bottom nav, matching the citizen (tabs) layout's structure.
// Only Home is wired up to real data right now — the other four screens are
// intentional "Coming Soon" placeholders (see coming-soon-screen.tsx) so the
// nav bar matches the design while nothing beyond Home does real work yet.
export default function FieldTabLayout() {
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
          title: t('fieldTabs.home'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: t('fieldTabs.tasks'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'clipboard' : 'clipboard-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: t('fieldTabs.map'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'location' : 'location-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: t('fieldTabs.reports'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('fieldTabs.profile'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
