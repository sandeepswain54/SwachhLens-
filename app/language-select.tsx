import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLanguage } from '@/contexts/language-context';
import type { Language } from '@/lib/i18n/translations';

const LANGUAGE_OPTIONS: {
  code: Language;
  titleKey: 'languageSelect.englishTitle' | 'languageSelect.hindiTitle' | 'languageSelect.odiaTitle';
  subtitleKey:
    | 'languageSelect.englishSubtitle'
    | 'languageSelect.hindiSubtitle'
    | 'languageSelect.odiaSubtitle';
  avatarLabel: string;
}[] = [
  { code: 'en', titleKey: 'languageSelect.englishTitle', subtitleKey: 'languageSelect.englishSubtitle', avatarLabel: 'A' },
  { code: 'hi', titleKey: 'languageSelect.hindiTitle', subtitleKey: 'languageSelect.hindiSubtitle', avatarLabel: 'हिं' },
  { code: 'or', titleKey: 'languageSelect.odiaTitle', subtitleKey: 'languageSelect.odiaSubtitle', avatarLabel: 'ଓ' },
];

export default function LanguageSelectScreen() {
  const { setLanguage, t } = useLanguage();
  const { next } = useLocalSearchParams<{ next?: string }>();

  function handleSelect(code: Language) {
    setLanguage(code);
    if (next) {
      router.replace(next as never);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }

  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/back23.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.topContent}>
            <View style={styles.logoCircle}>
              <Image
                source={require('@/assets/images/applogo.png')}
                style={styles.logoImage}
                contentFit="contain"
              />
            </View>

            <Text style={styles.wordmark}>
              <Text style={styles.wordmarkDark}>Swachh</Text>
              <Text style={styles.wordmarkGreen}>Lens</Text>
            </Text>
            <Text style={styles.tagline}>{t('languageSelect.appTagline')}</Text>

            <Text style={styles.welcome}>{t('languageSelect.title')}</Text>
            <Text style={styles.subtitle}>{t('languageSelect.subtitle')}</Text>
          </View>

          <View style={styles.cardList}>
            {LANGUAGE_OPTIONS.map((option) => (
              <Pressable
                key={option.code}
                style={styles.card}
                onPress={() => handleSelect(option.code)}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{option.avatarLabel}</Text>
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{t(option.titleKey)}</Text>
                  <Text style={styles.cardSubtitle}>{t(option.subtitleKey)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#1B6B3A" />
              </Pressable>
            ))}
          </View>

          <View style={styles.footer}>
            <Ionicons name="leaf" size={14} color="#1B6B3A" style={styles.footerLeaf} />
            <Text style={styles.footerText}>{t('languageSelect.footerLine1')}</Text>
            <Text style={styles.footerText}>{t('languageSelect.footerLine2')}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4faf6',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  topContent: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 84,
    height: 84,
  },
  wordmark: {
    marginTop: 8,
    fontSize: 30,
    fontWeight: '800',
  },
  wordmarkDark: {
    color: '#1A2E22',
  },
  wordmarkGreen: {
    color: '#1F8A46',
  },
  tagline: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '600',
    color: '#57635d',
  },
  welcome: {
    marginTop: 28,
    fontSize: 24,
    fontWeight: '800',
    color: '#1B6B3A',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#57635d',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  cardList: {
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#0a140f',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e3f3ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1B6B3A',
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A2E22',
  },
  cardSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#6b7770',
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerLeaf: {
    marginBottom: 8,
  },
  footerText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1B6B3A',
    lineHeight: 21,
  },
});
