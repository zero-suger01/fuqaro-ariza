import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AuthUser, CitizenComplaint } from '@/api';
import { fill, useI18n } from '@/i18n';
import { EmptyState } from './EmptyState';
import { RequestCard } from './RequestCard';
import { StatBento } from './StatBento';
import {
  Button,
  Drift,
  NightPanel,
  Reveal,
  SuzaniBloom,
  Touchable,
  Txt,
  colors,
  layout,
  palette,
  space,
} from '@/design';

type CabinetHomeProps = {
  user: AuthUser;
  complaints: CitizenComplaint[];
  contentPadding: number;
  refreshControl?: ScrollViewProps['refreshControl'];
  onNewRequest: () => void;
  onViewAll: () => void;
  onOpenRequest: (complaint: CitizenComplaint) => void;
};

export function CabinetHome({
  user,
  complaints,
  contentPadding,
  refreshControl,
  onNewRequest,
  onViewAll,
  onOpenRequest,
}: CabinetHomeProps) {
  const { t } = useI18n();
  const name = user.first_name?.trim() || user.fullname?.trim() || '—';

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      contentContainerStyle={[styles.content, { paddingBottom: contentPadding }]}
    >
      <Reveal>
        <Txt variant="title1" maxFontSizeMultiplier={1.3} style={styles.greeting}>
          {fill(t.cabinet.greeting, { name })}
        </Txt>
        <Txt variant="body" tone="secondary" style={styles.greetingSub}>
          {t.cabinet.greetingSub}
        </Txt>
      </Reveal>

      <Reveal index={1} style={styles.block}>
        <NightPanel
          round="2xl"
          pattern="full"
          gilded
          style={styles.hero}
          overlay={
            <Drift style={styles.heroBloom} amplitude={6} duration={11000}>
              <SuzaniBloom size={190} color={palette.white} accent={palette.brass[200]} opacity={0.17} />
            </Drift>
          }
        >
          <View style={styles.heroInner}>
            <Txt variant="title2" tone="onDark" numberOfLines={1}>
              {t.cabinet.heroTitle}
            </Txt>
            <Txt variant="body" tone="onDarkSoft" style={styles.heroText} numberOfLines={3}>
              {t.cabinet.heroText}
            </Txt>
            <Button
              label={t.cabinet.heroAction}
              variant="gold"
              size="md"
              trailingIcon="arrow-right"
              block={false}
              onPress={onNewRequest}
              style={styles.heroAction}
            />
          </View>
        </NightPanel>
      </Reveal>

      <Reveal index={2} style={styles.block}>
        <StatBento statuses={complaints.map((complaint) => complaint.status_simple)} />
      </Reveal>

      <Reveal index={3} style={styles.block}>
        <View style={styles.sectionHead}>
          <Txt variant="title3" accessibilityRole="header" numberOfLines={1} style={styles.sectionTitle}>
            {t.cabinet.recent}
          </Txt>
          {complaints.length > 0 ? (
            <Touchable
              onPress={onViewAll}
              accessibilityRole="button"
              accessibilityLabel={t.cabinet.seeAll}
              style={styles.seeAll}
            >
              <Txt variant="caption" tone="primary">
                {t.cabinet.seeAll}
              </Txt>
              <Feather name="arrow-right" size={14} color={colors.primary} />
            </Touchable>
          ) : null}
        </View>
      </Reveal>

      {complaints.length > 0 ? (
        <View style={styles.list}>
          {complaints.slice(0, 3).map((complaint, index) => (
            <Reveal key={complaint.id} index={4 + index}>
              <RequestCard complaint={complaint} onPress={() => onOpenRequest(complaint)} />
            </Reveal>
          ))}
        </View>
      ) : (
        <Reveal index={4}>
          <EmptyState
            icon="inbox"
            title={t.cabinet.emptyTitle}
            text={t.cabinet.emptyText}
            actionLabel={t.cabinet.emptyAction}
            onAction={onNewRequest}
          />
        </Reveal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: space.xs,
    paddingHorizontal: layout.gutter,
  },
  greeting: { marginTop: space.xxs },
  greetingSub: { marginTop: space.xxs },
  block: { marginTop: space.lg },
  hero: { padding: space.lg },
  heroInner: { maxWidth: 300 },
  heroBloom: { position: 'absolute', top: -46, right: -52 },
  heroText: { marginTop: space.xxs },
  heroAction: { marginTop: space.md },
  sectionHead: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  sectionTitle: { flex: 1, minWidth: 0 },
  seeAll: {
    minHeight: layout.tapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs,
    paddingLeft: space.xs,
  },
  list: { gap: space.sm, marginTop: space.sm },
});
