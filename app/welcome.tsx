import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/51809282-d532-4f71-9aec-076281f1770d.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.topContent}>
          <Ionicons name="leaf" size={44} color="#1F8A46" />

          <Text style={styles.logo}>
            <Text style={styles.logoDark}>Swachh</Text>
            <Text style={styles.logoGreen}>Lens</Text>
          </Text>

          <Text style={styles.tagline}>Cleaner City. Smarter Future.</Text>

          <Text style={styles.description}>
            Report waste issues, help your city stay clean and healthy.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/login')}>
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eaf4ee',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
  },
  topContent: {
    alignItems: 'center',
    marginTop: 40,
  },
  logo: {
    marginTop: 10,
    fontSize: 30,
    fontWeight: '800',
  },
  logoDark: {
    color: '#1A2E22',
  },
  logoGreen: {
    color: '#1F8A46',
  },
  tagline: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '600',
    color: '#33403a',
  },
  description: {
    marginTop: 14,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    color: '#4a5750',
    paddingHorizontal: 12,
  },
  buttonContainer: {
    paddingBottom: 100,
    gap: 14,
  },
  primaryButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#1B6B3A',
    fontSize: 16,
    fontWeight: '700',
  },
});
