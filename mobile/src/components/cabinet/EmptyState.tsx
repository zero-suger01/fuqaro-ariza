import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  Button,
  Card,
  Drift,
  SuzaniBloom,
  Txt,
  colors,
  palette,
  radius,
  space,
  squircle,
} from '@/design';

type EmptyStateProps = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * Empty states carry the suzani medallion rather than a generic grey box —
 * the moment a citizen has nothing yet is exactly when the product should feel
 * like it belongs to them.
 */
export function EmptyState({ icon, title, text, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Card round="2xl" padded="xl" tone="alt" lift="rest" style={styles.card}>
      <Drift style={styles.bloom} amplitude={5} duration={12000}>
        <SuzaniBloom size={230} color={palette.turquoise[400]} accent={palette.brass[400]} opacity={0.1} />
      </Drift>

      <View style={styles.icon}>
        <Feather name={icon} size={22} color={colors.primary} />
      </View>

      <Txt variant="title2" center style={styles.title}>
        {title}
      </Txt>
      <Txt variant="body" tone="secondary" center style={styles.text}>
        {text}
      </Txt>

      {actionLabel && onAction ? (
        <Button label={actionLabel} icon="edit-3" size="md" onPress={onAction} style={styles.action} />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    alignItems: 'center',
  },
  bloom: {
    position: 'absolute',
    top: -66,
    right: -70,
  },
  icon: {
    ...squircle,
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primaryTint,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderColor: colors.hairline,
  },
  title: { marginTop: space.md },
  text: { marginTop: space.xs, maxWidth: 320 },
  action: { marginTop: space.lg, alignSelf: 'stretch' },
});
