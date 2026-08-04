import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { trackComplaint, type TrackResult } from '@/api';
import { BottomNav } from '@/components/BottomNav';
import { Timeline } from '@/components/track/Timeline';
import { useI18n, type Language } from '@/i18n';
import {
  Badge,
  Button,
  Card,
  Divider,
  Drift,
  Field,
  GildedRule,
  IconButton,
  NightPanel,
  ProgressRail,
  Reveal,
  SuzaniBloom,
  Txt,
  colors,
  getStatus,
  getStatusLabel,
  layout,
  palette,
  radius,
  space,
  squircle,
} from '@/design';

function formatDeadline(value: string | null, language: Language, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  const local = new Date(date.getTime() + 5 * 60 * 60 * 1000);
  const day = String(local.getUTCDate()).padStart(2, '0');
  const month = String(local.getUTCMonth() + 1).padStart(2, '0');
  const year = local.getUTCFullYear();
  return language === 'en' ? `${day}/${month}/${year}` : `${day}.${month}.${year}`;
}

export default function TrackScreen() {
  const insets = useSafeAreaInsets();
  const { language, t } = useI18n();
  const params = useLocalSearchParams<{ ticket?: string; sent?: string }>();

  const [ticket, setTicket] = useState(params.ticket || '');
  const [result, setResult] = useState<TrackResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = useCallback(async () => {
    setError('');
    setResult(null);
    if (!ticket.trim()) return setError(t.track.empty);
    setLoading(true);
    try {
      setResult(await trackComplaint(ticket.trim()));
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : t.track.notFound);
    } finally {
      setLoading(false);
    }
  }, [ticket, t]);

  useEffect(() => {
    if (params.ticket) void search();
    // Only auto-search for a ticket handed over by the wizard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.ticket]);

  const status = result ? getStatus(result.status_simple) : null;
  const contentPadding = layout.navHeight + space['3xl'] + Math.max(insets.bottom, space.sm);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View style={[styles.header, { paddingTop: insets.top + space.xs }]}>
        <IconButton icon="arrow-left" label={t.common.back} onPress={() => router.back()} />
        <Txt variant="bodyStrong" numberOfLines={1} style={styles.headerTitle}>
          {t.track.title}
        </Txt>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.body, { paddingBottom: contentPadding }]}
      >
        {params.sent ? (
          <Reveal style={styles.sent}>
            <View style={styles.sentIcon}>
              <Feather name="check" size={15} color={colors.onDark} />
            </View>
            <Txt variant="caption" tone="success" style={styles.sentText}>
              {t.track.sent}
            </Txt>
          </Reveal>
        ) : null}

        <Reveal index={params.sent ? 1 : 0}>
          <Txt variant="overline" tone="primary" caps>
            {t.track.eyebrow}
          </Txt>
          <Txt variant="display" style={styles.heading} maxFontSizeMultiplier={1.25}>
            {t.track.heading}
          </Txt>
          <Txt variant="body" tone="secondary" style={styles.headingText}>
            {t.track.text}
          </Txt>
        </Reveal>

        <Reveal index={2} style={styles.form}>
          <Field
            icon="hash"
            value={ticket}
            onChangeText={setTicket}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder={t.track.placeholder}
            inputStyle={styles.ticketInput}
            onSubmitEditing={search}
            returnKeyType="search"
          />
          <Button
            label={t.track.action}
            trailingIcon="search"
            loading={loading}
            onPress={search}
            style={styles.action}
          />
        </Reveal>

        {error ? (
          <Reveal style={styles.error}>
            <Feather name="alert-circle" size={15} color={colors.danger} />
            <Txt variant="caption" tone="danger" style={styles.errorText}>
              {error}
            </Txt>
          </Reveal>
        ) : null}

        {result && status ? (
          <>
            <Reveal index={1} style={styles.resultBlock}>
              <NightPanel
                round="2xl"
                pattern="full"
                gilded
                style={styles.summary}
                overlay={
                  <Drift style={styles.summaryBloom} amplitude={5} duration={13000}>
                    <SuzaniBloom
                      size={180}
                      color={palette.white}
                      accent={palette.brass[200]}
                      opacity={0.15}
                    />
                  </Drift>
                }
              >
                <View>
                  <Txt variant="overline" tone="onDarkFaint" caps>
                    {t.cabinet.ticket}
                  </Txt>
                  <Txt variant="title1" tone="onDark" style={styles.ticketNumber} numberOfLines={1}>
                    {result.ticket_number}
                  </Txt>

                  <View style={styles.summaryMeta}>
                    <Badge
                      label={getStatusLabel(result.status_simple, language)}
                      color={status.color}
                      background={status.background}
                      icon={status.icon}
                    />
                    <Txt variant="caption" tone="onDarkSoft" numberOfLines={1} style={styles.categoryName}>
                      {result.category.name}
                    </Txt>
                  </View>

                  <ProgressRail
                    value={status.progress}
                    gradient={[palette.turquoise[300], palette.brass[300]]}
                    trackColor="rgba(255,255,255,0.16)"
                    height={6}
                    style={styles.summaryRail}
                  />
                </View>
              </NightPanel>
            </Reveal>

            <Reveal index={2} style={styles.resultBlock}>
              <Card round="2xl" padded="lg" lift="card">
                <DetailRow
                  icon="briefcase"
                  label={t.track.department}
                  value={result.department?.name || t.track.departmentEmpty}
                />
                <Divider style={styles.detailDivider} />
                <DetailRow
                  icon="calendar"
                  label={t.track.deadline}
                  value={formatDeadline(result.deadline_at, language, t.track.deadlineEmpty)}
                />

                {result.timeline?.length ? (
                  <>
                    <View style={styles.ruleWrap}>
                      <GildedRule width={180} color={palette.brass[300]} opacity={0.8} />
                    </View>
                    <Txt variant="overline" tone="muted" caps style={styles.timelineLabel}>
                      {t.track.timeline}
                    </Txt>
                    <Timeline entries={result.timeline} />
                  </>
                ) : null}

                {result.reply_text ? (
                  <>
                    <Divider style={styles.detailDivider} />
                    <Txt variant="overline" tone="accent" caps>
                      {t.track.reply}
                    </Txt>
                    <View style={styles.reply}>
                      <Txt variant="body">{result.reply_text}</Txt>
                    </View>
                  </>
                ) : null}
              </Card>
            </Reveal>
          </>
        ) : null}
      </ScrollView>

      <BottomNav active="complaints" onChange={() => router.replace('/cabinet')} />
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Feather name={icon} size={15} color={colors.primary} />
      </View>
      <View style={styles.detailCopy}>
        <Txt variant="caption" tone="muted" numberOfLines={1}>
          {label}
        </Txt>
        <Txt variant="bodyStrong" numberOfLines={2} style={styles.detailValue}>
          {value}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: layout.gutter,
    paddingBottom: space.xs,
  },
  headerTitle: { flex: 1, minWidth: 0 },
  body: {
    paddingHorizontal: layout.gutter,
    paddingTop: space.md,
  },

  sent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginBottom: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.successTint,
    padding: space.sm,
  },
  sentIcon: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.success,
  },
  sentText: { flex: 1, minWidth: 0 },

  heading: { marginTop: space.xs },
  headingText: { marginTop: space.xs, maxWidth: 400 },
  form: { marginTop: space.xl, gap: space.sm },
  ticketInput: { letterSpacing: 1.6 },
  action: { marginTop: space.xxs },

  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginTop: space.md,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerTint,
    padding: space.sm,
  },
  errorText: { flex: 1, minWidth: 0 },

  resultBlock: { marginTop: space.lg },
  summary: { padding: space.lg },
  summaryBloom: { position: 'absolute', top: -44, right: -48 },
  ticketNumber: { marginTop: space['3xs'], letterSpacing: 0.4 },
  summaryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginTop: space.sm,
  },
  categoryName: { flex: 1, minWidth: 0 },
  summaryRail: { marginTop: space.md },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  detailIcon: {
    ...squircle,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xs + 2,
    backgroundColor: colors.primaryTint,
  },
  detailCopy: { flex: 1, minWidth: 0 },
  detailValue: { marginTop: 1 },
  detailDivider: { marginVertical: space.md },

  ruleWrap: { alignItems: 'center', marginVertical: space.lg },
  timelineLabel: { marginBottom: space.md },

  reply: {
    marginTop: space.xs,
    borderRadius: radius.md,
    backgroundColor: colors.accentTint,
    padding: space.md,
  },
});
