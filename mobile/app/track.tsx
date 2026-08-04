import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { trackComplaint, type TrackResult } from '@/api';
import { colors, radius } from '@/theme';

const stepLabels: Record<string, string> = {
  qabul_qilindi: 'Qabul qilindi',
  korilmoqda: 'Ko‘rib chiqilmoqda',
  ijroda: 'Ijroda',
  yakunlandi: 'Yakunlandi',
  rad_etildi: 'Rad etildi',
};

function readableStep(step: string) {
  return stepLabels[step] || step.replaceAll('_', ' ');
}

export default function TrackScreen() {
  const params = useLocalSearchParams<{ ticket?: string; sent?: string }>();
  const [ticket, setTicket] = useState(params.ticket || '');
  const [result, setResult] = useState<TrackResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = useCallback(async () => {
    setError('');
    setResult(null);
    if (!ticket.trim()) return setError('Murojaat raqamini kiriting.');
    setLoading(true);
    try { setResult(await trackComplaint(ticket.trim())); }
    catch (e) { setError(e instanceof Error ? e.message : 'Murojaat topilmadi.'); }
    finally { setLoading(false); }
  }, [ticket]);

  useEffect(() => { if (params.ticket) void search(); }, [params.ticket, search]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Feather name="arrow-left" size={25} color={colors.ink} /></Pressable>
        <Text style={styles.headerTitle}>Murojaat holati</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {params.sent ? <View style={styles.success}><Feather name="check-circle" size={21} color={colors.success} /><Text style={styles.successText}>Murojaat qabul qilindi. Raqamni saqlang.</Text></View> : null}
        <Text style={styles.eyebrow}>NAZORAT</Text>
        <Text style={styles.title}>Raqam orqali{`\n`}tekshiring</Text>
        <Text style={styles.sub}>Murojaat yuborilganda berilgan ticket raqamini kiriting.</Text>
        <TextInput value={ticket} onChangeText={setTicket} style={styles.input} autoCapitalize="characters" placeholder="UY-2026-000001" placeholderTextColor={colors.muted} />
        <Pressable style={styles.primary} onPress={search} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.white} /> : <><Text style={styles.primaryText}>Holatni ko‘rish</Text><Feather name="search" size={19} color={colors.white} /></>}
        </Pressable>
        {error ? <View style={styles.errorBox}><Feather name="alert-circle" size={18} color={colors.danger} /><Text style={styles.error}>{error}</Text></View> : null}
        {result ? <View style={styles.card}>
          <View style={styles.statusRow}><Text style={styles.cardLabel}>Joriy holat</Text><View style={styles.status}><View style={styles.statusDot} /><Text style={styles.statusText}>{result.status_simple}</Text></View></View>
          <Text style={styles.ticket}>{result.ticket_number}</Text>
          <Text style={styles.category}>{result.category.name}</Text>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Mas’ul bo‘lim</Text><Text style={styles.detailValue}>{result.department?.name || 'Hali biriktirilmagan'}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Ijro muddati</Text><Text style={styles.detailValue}>{result.deadline_at ? new Date(result.deadline_at).toLocaleDateString('uz-UZ') : 'Belgilanmagan'}</Text></View>
          {result.timeline?.length ? <View style={styles.timeline}><Text style={styles.sectionTitle}>Jarayon</Text>{result.timeline.map((item) => <View key={`${item.step}-${item.at || ''}`} style={styles.timelineRow}><View style={[styles.timelineDot, item.done && styles.timelineDotDone]} /><Text style={[styles.timelineText, item.done && styles.timelineTextDone]}>{readableStep(item.step)}</Text>{item.done ? <Feather name="check" size={15} color={colors.teal} /> : null}</View>)}</View> : null}
          {result.reply_text ? <View style={styles.reply}><Text style={styles.sectionTitle}>Hokimlik javobi</Text><Text style={styles.replyText}>{result.reply_text}</Text></View> : null}
        </View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingTop: 8 },
  headerTitle: { color: colors.ink, fontSize: 19, fontWeight: '800' },
  content: { paddingTop: 34, paddingBottom: 35 },
  eyebrow: { color: colors.teal, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginTop: 8 },
  title: { color: colors.ink, fontSize: 34, lineHeight: 39, fontWeight: '800', letterSpacing: -0.7, marginTop: 10 },
  sub: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 10, marginBottom: 21 },
  input: { minHeight: 57, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.control, paddingHorizontal: 17, color: colors.ink, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  primary: { minHeight: 57, borderRadius: radius.control, backgroundColor: colors.teal, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: colors.teal, shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  success: { marginBottom: 23, borderRadius: radius.control, backgroundColor: '#E8F7EE', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 9 },
  successText: { color: colors.success, fontSize: 13, fontWeight: '700', flex: 1 },
  errorBox: { marginTop: 13, borderRadius: radius.control, backgroundColor: '#FFF0F1', padding: 13, flexDirection: 'row', alignItems: 'center', gap: 8 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 18, flex: 1 },
  card: { marginTop: 27, backgroundColor: colors.white, borderRadius: radius.card, padding: 20, borderWidth: 1, borderColor: colors.line, shadowColor: '#0B3439', shadowOpacity: 0.06, shadowRadius: 15, shadowOffset: { width: 0, height: 7 }, elevation: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardLabel: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.mint, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 7, maxWidth: '62%' },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.teal },
  statusText: { color: colors.tealDark, fontSize: 12, fontWeight: '800', flexShrink: 1 },
  ticket: { color: colors.ink, fontSize: 25, fontWeight: '800', marginTop: 18, letterSpacing: 0.5 },
  category: { color: colors.teal, fontSize: 14, fontWeight: '800', marginTop: 7 },
  detailRow: { marginTop: 17, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line },
  detailLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  detailValue: { color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: '800', marginTop: 4 },
  timeline: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.line },
  sectionTitle: { color: colors.teal, fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 13 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.line },
  timelineDotDone: { backgroundColor: colors.teal },
  timelineText: { color: colors.muted, fontSize: 14, flex: 1 },
  timelineTextDone: { color: colors.ink, fontWeight: '700' },
  reply: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: 20, paddingTop: 16 },
  replyText: { color: colors.ink, fontSize: 14, lineHeight: 21, marginTop: 8 },
});
