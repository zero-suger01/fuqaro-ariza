import { ScrollView, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { AuthUser } from '@/api';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { useI18n } from '@/i18n';
import {
  Card,
  Divider,
  GildedRule,
  Reveal,
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

type SettingsPanelProps = {
  user: AuthUser;
  contentPadding: number;
  onOpenNotifications: () => void;
  onSignOut: () => void;
};

export function SettingsPanel({
  user,
  contentPadding,
  onOpenNotifications,
  onSignOut,
}: SettingsPanelProps) {
  const { t } = useI18n();
  const initials = `${user.first_name?.[0] || 'F'}${user.last_name?.[0] || ''}`.toLocaleUpperCase();

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, { paddingBottom: contentPadding }]}
    >
      <Reveal>
        <Card round="2xl" padded="md" lift="card" style={styles.profile}>
          <View style={styles.profileRow}>
            <View style={[styles.avatar, elevation.action]}>
              <LinearGradient
                colors={[palette.turquoise[400], palette.turquoise[700]]}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Txt variant="title2" tone="onDark">
                {initials}
              </Txt>
            </View>
            <View style={styles.profileCopy}>
              <Txt variant="title3" numberOfLines={2} maxFontSizeMultiplier={1.4}>
                {user.fullname}
              </Txt>
              <Txt variant="mono" tone="secondary" numberOfLines={1} style={styles.phone}>
                {user.phone}
              </Txt>
              <View style={styles.verified}>
                <Feather name="check-circle" size={12} color={colors.success} />
                <Txt variant="caption" tone="success" numberOfLines={1}>
                  {t.cabinet.verified}
                </Txt>
              </View>
            </View>
          </View>

          <View style={styles.rule}>
            <GildedRule width={200} color={palette.brass[300]} opacity={0.8} />
          </View>
        </Card>
      </Reveal>

      <Reveal index={1}>
        <Txt variant="overline" tone="muted" caps style={styles.groupLabel}>
          {t.cabinet.settingsGroup}
        </Txt>

        <Card round="xl" padded={false} lift="rest" tone="alt">
          <View style={styles.languageRow}>
            <View style={styles.rowIcon}>
              <Feather name="globe" size={16} color={colors.primary} />
            </View>
            <Txt variant="bodyStrong" numberOfLines={1} style={styles.rowTitle}>
              {t.cabinet.language}
            </Txt>
          </View>
          <View style={styles.languageSwitch}>
            <LanguageSwitch tone="light" />
          </View>

          <Divider style={styles.divider} />

          <SettingsRow
            icon="bell"
            title={t.cabinet.notifications}
            onPress={onOpenNotifications}
          />

          <Divider style={styles.divider} />

          <SettingsRow icon="info" title={t.cabinet.about} value={t.cabinet.version} />
        </Card>
      </Reveal>

      <Reveal index={2}>
        <Touchable
          onPress={onSignOut}
          haptic="warning"
          accessibilityRole="button"
          accessibilityLabel={t.cabinet.signOut}
          style={styles.signOut}
        >
          <Feather name="log-out" size={16} color={colors.danger} />
          <Txt variant="bodyStrong" tone="danger">
            {t.cabinet.signOut}
          </Txt>
        </Touchable>
      </Reveal>
    </ScrollView>
  );
}

function SettingsRow({
  icon,
  title,
  value,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  value?: string;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View style={styles.rowIcon}>
        <Feather name={icon} size={16} color={colors.primary} />
      </View>
      <Txt variant="bodyStrong" numberOfLines={1} style={styles.rowTitle}>
        {title}
      </Txt>
      {value ? (
        <Txt variant="caption" tone="muted" numberOfLines={1}>
          {value}
        </Txt>
      ) : null}
      {onPress ? <Feather name="chevron-right" size={17} color={colors.textFaint} /> : null}
    </>
  );

  if (!onPress) return <View style={styles.row}>{content}</View>;

  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      scale={0.985}
      style={styles.row}
    >
      {content}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: space.xs,
    paddingHorizontal: layout.gutter,
  },
  profile: { overflow: 'hidden' },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  avatar: {
    ...squircle,
    width: 58,
    height: 58,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  profileCopy: { flex: 1, minWidth: 0 },
  phone: { marginTop: 2 },
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs,
    marginTop: space.xxs,
  },
  rule: { alignItems: 'center', marginTop: space.md },

  groupLabel: { marginTop: space.xl, marginBottom: space.xs, marginLeft: space.xxs },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
  },
  languageRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
  },
  languageSwitch: {
    paddingHorizontal: space.md,
    paddingBottom: space.sm,
    paddingTop: space.xs,
  },
  rowIcon: {
    ...squircle,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xs + 2,
    backgroundColor: colors.primaryTint,
  },
  rowTitle: { flex: 1, minWidth: 0 },
  divider: { marginHorizontal: space.md },

  signOut: {
    minHeight: layout.tapTarget,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginTop: space.xl,
    paddingHorizontal: space.xs,
  },
});
