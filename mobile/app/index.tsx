import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/theme';
import { getSupport, type SupportContact } from '@/api';

export default function HomeScreen() {
  const [support, setSupport] = useState<SupportContact | null>(null);
  useEffect(() => { getSupport().then(setSupport).catch(() => undefined); }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topbar}>
        <View style={styles.logo}><Feather name="message-circle" size={22} color={colors.white} /></View>
        <View><Text style={styles.brand}>e-Murojaat</Text><Text style={styles.region}>Namangan viloyati</Text></View>
      </View>
      <View style={styles.hero}>
        <View style={styles.badge}><View style={styles.dot} /><Text style={styles.badgeText}>Fuqarolar uchun yagona portal</Text></View>
        <Text style={styles.title}>Murojaatingiz{`\n`}e’tiborsiz qolmaydi.</Text>
        <Text style={styles.subtitle}>Muammoni yozing. Biz uni kerakli tashkilotga yetkazamiz va javobni kuzatishingiz mumkin.</Text>
      </View>
      <View style={styles.actions}>
        <Pressable style={({ pressed }) => [styles.primary, pressed && styles.pressed]} onPress={() => router.push('/complaint')}>
          <Feather name="edit-3" size={20} color={colors.white} /><Text style={styles.primaryText}>Murojaat yuborish</Text><Feather name="arrow-up-right" size={20} color={colors.white} />
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => router.push('/track')}>
          <Feather name="search" size={19} color={colors.teal} /><Text style={styles.secondaryText}>Murojaat holatini tekshirish</Text>
        </Pressable>
      </View>
      <View style={styles.infoCard}><Feather name="shield" size={21} color={colors.teal} /><View style={styles.infoCopy}><Text style={styles.infoTitle}>Raqam bilan nazorat qiling</Text><Text style={styles.infoText}>Yuborgandan keyin beriladigan raqamni saqlab qo‘ying.</Text></View></View>
      <View style={styles.footer}><Text style={styles.help}>Yordam kerakmi?</Text><Pressable onPress={() => support?.phone && Linking.openURL(`tel:${support.phone}`)}><Text style={styles.phone}>{support?.phone || '71 000 00 00'}</Text></Pressable>{support?.telegram_url ? <Pressable onPress={() => Linking.openURL(support.telegram_url!)}><Text style={styles.telegram}>Telegram botga o‘tish</Text></Pressable> : null}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingTop: 8 },
  logo: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  brand: { color: colors.ink, fontSize: 18, fontWeight: '800' }, region: { color: colors.muted, fontSize: 12, marginTop: 2 },
  hero: { paddingTop: 54, paddingBottom: 28 }, badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.mint, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.teal, marginRight: 7 }, badgeText: { color: colors.tealDark, fontSize: 12, fontWeight: '700' },
  title: { color: colors.ink, fontSize: 38, lineHeight: 43, fontWeight: '800', letterSpacing: -1, marginTop: 19 }, subtitle: { color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: 15, maxWidth: 360 },
  actions: { gap: 11 }, primary: { minHeight: 58, borderRadius: radius.control, backgroundColor: colors.teal, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 11 }, primaryText: { flex: 1, color: colors.white, fontSize: 16, fontWeight: '800' }, secondary: { minHeight: 55, borderRadius: radius.control, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 11 }, secondaryText: { color: colors.ink, fontSize: 15, fontWeight: '700' }, pressed: { opacity: 0.82 },
  infoCard: { marginTop: 28, borderRadius: radius.card, padding: 17, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', gap: 12 }, infoCopy: { flex: 1 }, infoTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' }, infoText: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  footer: { marginTop: 'auto', paddingVertical: 18, alignItems: 'center' }, help: { color: colors.muted, fontSize: 12 }, phone: { color: colors.teal, fontSize: 16, fontWeight: '800', marginTop: 4 }, telegram: { color: colors.tealDark, fontSize: 13, fontWeight: '700', marginTop: 10 },
});
