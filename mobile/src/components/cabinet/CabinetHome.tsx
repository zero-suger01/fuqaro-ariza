import { Feather } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AuthUser, CitizenComplaint } from '@/api';
import { useI18n } from '@/i18n';
import { EmptyRequests } from '@/design-system/components/EmptyRequests';
import { NewRequestHero } from '@/design-system/components/NewRequestHero';
import { RequestCard } from '@/design-system/components/RequestCard';
import { StatisticsOverview } from '@/design-system/components/StatisticsOverview';
import { getCabinetDesignCopy } from '@/design-system/copy';
import { colorTokens, spacing, typography } from '@/design-system/tokens';

type CabinetHomeProps = {
  user: AuthUser;
  complaints: CitizenComplaint[];
  onNewRequest: () => void;
  onViewAll: () => void;
  onOpenRequest: (complaint: CitizenComplaint) => void;
};

export function CabinetHome({ user, complaints, onNewRequest, onViewAll, onOpenRequest }: CabinetHomeProps) {
  const { language } = useI18n();
  const copy = getCabinetDesignCopy(language);
  const name = user.first_name?.trim() || copy.citizenFallback;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.inner}>
        <View style={styles.greetingBlock}>
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
            style={styles.greeting}
          >
            {copy.greeting.replace('{name}', name)}
          </Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={styles.supporting}>
            {copy.supporting}
          </Text>
        </View>

        <NewRequestHero onPress={onNewRequest} />

        <View style={styles.statistics}>
          <StatisticsOverview statuses={complaints.map((complaint) => complaint.status_simple)} />
        </View>

        <View style={styles.sectionHeader}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>{copy.recentRequests}</Text>
          {complaints.length > 0 ? (
            <Pressable
              onPress={onViewAll}
              accessibilityRole="button"
              style={({ pressed }) => [styles.viewAll, pressed && styles.pressed]}
            >
              <Text style={styles.viewAllText}>{copy.allRequests}</Text>
              <Feather name="chevron-right" size={16} color={colorTokens.primary} aria-hidden />
            </Pressable>
          ) : null}
        </View>

        {complaints.length > 0 ? (
          <View style={styles.requests}>
            {complaints.slice(0, 3).map((complaint) => (
              <RequestCard key={complaint.id} complaint={complaint} onPress={() => onOpenRequest(complaint)} />
            ))}
          </View>
        ) : (
          <EmptyRequests onPress={onNewRequest} />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.xxs,
    paddingBottom: spacing.lg,
  },
  inner: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  greetingBlock: {
    marginBottom: spacing.sm,
  },
  greeting: {
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '600',
    letterSpacing: -0.35,
    color: colorTokens.textPrimary,
  },
  supporting: {
    ...typography.supporting,
    color: colorTokens.textSecondary,
    marginTop: spacing.xxs,
  },
  statistics: {
    marginTop: spacing.sm,
  },
  sectionHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    minWidth: 0,
    flex: 1,
    color: colorTokens.textPrimary,
  },
  viewAll: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingLeft: spacing.xs,
  },
  viewAllText: {
    ...typography.button,
    color: colorTokens.primary,
  },
  pressed: {
    opacity: 0.64,
  },
  requests: {
    gap: spacing.sm,
  },
});
