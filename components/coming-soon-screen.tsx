import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Shared placeholder for the field-team tabs that aren't built yet
// (Tasks / Map / Reports / Profile) — only Home is wired to real data today.
export function ComingSoonScreen({
  icon,
  title,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={32} color="#1B6B3A" />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>This screen is coming soon.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e3f3ea',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A2E22',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7770',
    textAlign: 'center',
  },
});
