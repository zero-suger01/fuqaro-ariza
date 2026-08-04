import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Touchable, Txt, colors, radius, space, squircle } from '@/design';

type EvidenceTileProps = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  count?: number;
  active?: boolean;
  recording?: boolean;
  onPress: () => void;
};

/** Attachment affordance: reads as "empty slot" until something lands in it. */
export function EvidenceTile({
  icon,
  label,
  count,
  active = false,
  recording = false,
  onPress,
}: EvidenceTileProps) {
  const tint = recording ? colors.danger : active ? colors.primary : colors.textSecondary;

  return (
    <Touchable
      onPress={onPress}
      haptic={recording ? 'warning' : 'light'}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={[
        squircle,
        styles.tile,
        active && styles.tileActive,
        recording && styles.tileRecording,
      ]}
    >
      <View style={[styles.icon, active && styles.iconActive, recording && styles.iconRecording]}>
        <Feather name={icon} size={18} color={recording || active ? colors.onDark : colors.primary} />
      </View>

      <Txt
        variant="caption"
        numberOfLines={2}
        maxFontSizeMultiplier={1.3}
        center
        style={{ color: tint }}
      >
        {label}
      </Txt>

      {count && count > 0 ? (
        <View style={styles.count}>
          <Txt variant="overline" tone="onDark">
            {count}
          </Txt>
        </View>
      ) : null}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 0,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.hairlineStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: space.xs,
    paddingVertical: space.sm,
  },
  tileActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  tileRecording: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerTint,
  },
  icon: {
    ...squircle,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.primaryTint,
  },
  iconActive: { backgroundColor: colors.primary },
  iconRecording: { backgroundColor: colors.danger },
  count: {
    position: 'absolute',
    top: space.xs,
    right: space.xs,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.accent,
    paddingHorizontal: 5,
  },
});
