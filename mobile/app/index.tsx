import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { getSupport, type SupportContact } from '@/api';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { useI18n } from '@/i18n';
import {
  Button,
  Card,
  Divider,
  Drift,
  EmblemMark,
  GildedRule,
  GirihStar,
  IkatBand,
  NightPanel,
  Reveal,
  SuzaniBloom,
  Touchable,
  Txt,
  colors,
  elevation,
  layout,
  palette,
  radius,
  space,
  squircle,
} from '@/design';

export default function LandingScreen() {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const { t } = useI18n();
  const [support, setSupport] = useState<SupportContact | null>(null);

  useEffect(() => {
    getSupport().then(setSupport).catch(() => undefined);
  }, []);

  const heroHeight = Math.max(452, height * 0.6);
  const compact = width < 360;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}
      >
        <NightPanel
          round="3xl"
          pattern="full"
          gilded
          style={[styles.hero, { minHeight: heroHeight, paddingTop: insets.top + space.md }]}
          overlay={
            <Drift style={styles.bloom} amplitude={9}>
              <SuzaniBloom
                size={Math.min(330, width * 0.92)}
                color={palette.white}
                accent={palette.brass[200]}
                opacity={0.16}
              />
            </Drift>
          }
        >
          <View style={styles.heroInner}>
            <Reveal from={-14}>
              <View style={styles.brandRow}>
                <View style={styles.brandMark}>
                  <EmblemMark size={30} color={palette.white} accent={palette.brass[300]} />
                </View>
                <View style={styles.brandCopy}>
                  <Txt variant="title3" tone="onDark" numberOfLines={1}>
                    {t.brand}
                  </Txt>
                  <Txt variant="caption" tone="onDarkFaint" numberOfLines={1}>
                    {t.region}
                  </Txt>
                </View>
              </View>
            </Reveal>

            <Reveal index={1} style={styles.langWrap}>
              <LanguageSwitch />
            </Reveal>

            <View style={styles.heroSpacer} />

            <Reveal index={2}>
              <View style={styles.badge}>
                <GirihStar size={12} color={palette.brass[300]} />
                <Txt variant="caption" tone="onDarkSoft" numberOfLines={1}>
                  {t.landing.badge}
                </Txt>
              </View>
            </Reveal>

            <Reveal index={3}>
              <Txt
                variant={compact ? 'display' : 'displayXl'}
                tone="onDark"
                style={styles.title}
                maxFontSizeMultiplier={1.2}
              >
                {t.landing.title}
              </Txt>
            </Reveal>

            <Reveal index={4}>
              <Txt variant="bodyLg" tone="onDarkSoft" style={styles.subtitle} maxFontSizeMultiplier={1.4}>
                {t.landing.subtitle}
              </Txt>
            </Reveal>

            <Reveal index={5} style={styles.rule}>
              <GildedRule width={Math.min(240, width - layout.gutter * 4)} color={palette.brass[300]} />
            </Reveal>
          </View>
        </NightPanel>

        <Reveal index={5} delay={90} style={styles.actionsWrap}>
          <Card lift="float" round="2xl" padded="md">
            <Button
              label={t.landing.submit}
              trailingIcon="arrow-up-right"
              onPress={() => router.push('/complaint')}
              accessibilityHint={t.landing.submitHint}
              haptic="medium"
            />
            <Txt variant="caption" tone="muted" center style={styles.actionHint}>
              {t.landing.submitHint}
            </Txt>

            <Button
              label={t.landing.track}
              variant="outline"
              icon="search"
              size="md"
              onPress={() => router.push('/track')}
              style={styles.secondaryAction}
            />

            <Divider style={styles.actionsDivider} />

            <Touchable
              onPress={() => router.push('/cabinet')}
              accessibilityRole="button"
              accessibilityLabel={t.landing.cabinet}
              accessibilityHint={t.landing.cabinetHint}
              style={styles.cabinetRow}
            >
              <View style={styles.cabinetIcon}>
                <Feather name="user" size={17} color={colors.primary} />
              </View>
              <View style={styles.cabinetCopy}>
                <Txt variant="bodyStrong" numberOfLines={1}>
                  {t.landing.cabinet}
                </Txt>
                <Txt variant="caption" tone="muted" numberOfLines={1}>
                  {t.landing.cabinetHint}
                </Txt>
              </View>
              <Feather name="chevron-right" size={19} color={colors.textMuted} />
            </Touchable>
          </Card>
        </Reveal>

        <Reveal index={6} delay={90}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={244 + space.sm}
            snapToAlignment="start"
            contentContainerStyle={styles.features}
          >
            {t.landing.features.map((feature) => (
              <Card key={feature.title} round="xl" padded="md" lift="rest" tone="alt" style={styles.featureCard}>
                <View style={styles.featureIcon}>
                  <Feather
                    name={feature.icon as keyof typeof Feather.glyphMap}
                    size={18}
                    color={colors.accentInk}
                  />
                </View>
                <Txt variant="title3" style={styles.featureTitle} numberOfLines={2}>
                  {feature.title}
                </Txt>
                <Txt variant="caption" tone="secondary" numberOfLines={3}>
                  {feature.text}
                </Txt>
              </Card>
            ))}
          </ScrollView>
        </Reveal>

        <Reveal index={7} delay={90} style={styles.section}>
          <Card round="2xl" padded="lg" tone="tint" lift="rest">
            <View style={styles.helpHead}>
              <View style={styles.helpIcon}>
                <Feather name="life-buoy" size={18} color={colors.onDark} />
              </View>
              <View style={styles.helpCopy}>
                <Txt variant="title3">{t.landing.helpTitle}</Txt>
                <Txt variant="caption" tone="secondary" style={styles.helpText}>
                  {t.landing.helpText}
                </Txt>
              </View>
            </View>

            <View style={styles.helpActions}>
              <Button
                label={support?.phone || t.landing.call}
                variant="primary"
                size="md"
                icon="phone"
                onPress={() => support?.phone && Linking.openURL(`tel:${support.phone}`)}
                disabled={!support?.phone}
                style={styles.helpButton}
              />
              {support?.telegram_url ? (
                <Button
                  label={t.landing.telegram}
                  variant="outline"
                  size="md"
                  icon="send"
                  onPress={() => Linking.openURL(support.telegram_url as string)}
                  style={styles.helpButton}
                />
              ) : null}
            </View>
          </Card>
        </Reveal>

        <View style={styles.footer}>
          <IkatBand
            width={Math.min(300, width - layout.gutter * 2)}
            height={30}
            color={palette.turquoise[300]}
            accent={palette.brass[300]}
            opacity={0.6}
            repeat={5}
          />
          <Txt variant="caption" tone="faint" center style={styles.footerText}>
            {t.brand} · {t.region}
          </Txt>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  hero: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingHorizontal: layout.gutter,
    paddingBottom: space['4xl'],
  },
  heroInner: { flex: 1 },
  bloom: {
    position: 'absolute',
    top: -54,
    right: -108,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  brandMark: {
    ...squircle,
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  brandCopy: { flex: 1, minWidth: 0 },
  langWrap: { marginTop: space.lg, alignSelf: 'flex-start', minWidth: 210 },
  heroSpacer: { flex: 1, minHeight: space['3xl'] },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: space.sm,
    paddingVertical: 7,
  },
  title: { marginTop: space.lg },
  subtitle: { marginTop: space.sm, maxWidth: 420 },
  rule: { marginTop: space.lg },

  actionsWrap: {
    marginTop: -space['3xl'],
    paddingHorizontal: layout.gutter,
  },
  actionHint: { marginTop: space.xs },
  secondaryAction: { marginTop: space.sm },
  actionsDivider: { marginVertical: space.md },
  cabinetRow: {
    minHeight: layout.tapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  cabinetIcon: {
    ...squircle,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.primaryTint,
  },
  cabinetCopy: { flex: 1, minWidth: 0 },

  features: {
    gap: space.sm,
    paddingHorizontal: layout.gutter,
    paddingTop: space.xl,
    paddingBottom: space.xxs,
  },
  featureCard: { width: 244 },
  featureIcon: {
    ...squircle,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.accentTint,
    marginBottom: space.sm,
  },
  featureTitle: { marginBottom: space['3xs'] },

  section: { paddingHorizontal: layout.gutter, paddingTop: space.lg },
  helpHead: { flexDirection: 'row', gap: space.sm },
  helpIcon: {
    ...squircle,
    ...elevation.action,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  helpCopy: { flex: 1, minWidth: 0 },
  helpText: { marginTop: space['3xs'] },
  helpActions: { flexDirection: 'row', gap: space.xs, marginTop: space.md },
  helpButton: { flex: 1, minWidth: 0 },

  footer: {
    alignItems: 'center',
    paddingTop: space['2xl'],
    gap: space.xs,
  },
  footerText: { letterSpacing: 0.2 },
});
