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
      contentContainerStyle={styles.scrollContent}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.inner}>
        <View style={styles.introduction}>
          <Text style={styles.eyebrow}>{copy.personalLabel.toLocaleUpperCase()}</Text>
          <Text accessibilityRole="header" style={styles.greeting}>{copy.greeting.replace('{name}', name)}</Text>
          <Text style={styles.supporting}>{copy.supporting}</Text>
        </View>

        <NewRequestHero onPress={onNewRequest} />
        <View style={styles.overview}>
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
              <Feather name="arrow-right" size={16} color={colorTokens.primary} aria-hidden />
            </Pressable>
          ) : null}
        </View>

        {complaints.length > 0 ? (
          <View style={styles.requests}>
            {complaints.slice(0, 3).map((complaint) => (
              <RequestCard
                key={complaint.id}
                complaint={complaint}
                onPress={() => onOpenRequest(complaint)}
              />
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
  scrollContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  inner: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  introduction: {
    marginBottom: spacing.xl,
  },
  eyebrow: {
    ...typography.label,
    color: colorTokens.primary,
    letterSpacing: 1.25,
  },
  greeting: {
    ...typography.pageTitle,
    color: colorTokens.textPrimary,
    marginTop: spacing.xs,
  },
  supporting: {
    ...typography.body,
    maxWidth: 480,
    color: colorTokens.textSecondary,
    marginTop: spacing.xs,
  },
  overview: {
    marginTop: spacing.sm,
  },
  sectionHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xxl,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    flex: 1,
    color: colorTokens.textPrimary,
  },
  viewAll: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  pressed: {
    opacity: 0.68,
  },
  viewAllText: {
    ...typography.button,
    color: colorTokens.primary,
  },
  requests: {
    gap: spacing.sm,
  },
});
