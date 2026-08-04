import { useCallback, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { Txt } from './Txt';
import { colors, fonts, motion, radius, space, squircle, type } from '../tokens';

export type FieldProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  hint?: string;
  error?: string;
  icon?: keyof typeof Feather.glyphMap;
  /** Right-hand adornment — a unit, a counter, a clear button. */
  trailing?: React.ReactNode;
  multiline?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

/**
 * Text entry with a focus ring that animates rather than snaps, and an error
 * state that recolours the whole frame so it is impossible to miss on a phone
 * held at arm's length.
 */
export function Field({
  label,
  hint,
  error,
  icon,
  trailing,
  multiline,
  containerStyle,
  inputStyle,
  onFocus,
  onBlur,
  ...props
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  const progress = useDerivedValue(() =>
    withTiming(error ? 2 : focused ? 1 : 0, { duration: motion.duration.fast }),
  );

  const frame = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      progress.value,
      [0, 1, 2],
      [colors.hairlineStrong, colors.primary, colors.danger],
    ),
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1, 2],
      [colors.surface, colors.surface, colors.dangerTint],
    ),
  }));

  const handleFocus = useCallback<NonNullable<TextInputProps['onFocus']>>(
    (event) => {
      setFocused(true);
      onFocus?.(event);
    },
    [onFocus],
  );

  const handleBlur = useCallback<NonNullable<TextInputProps['onBlur']>>(
    (event) => {
      setFocused(false);
      onBlur?.(event);
    },
    [onBlur],
  );

  return (
    <View style={containerStyle}>
      {label ? (
        <Txt variant="caption" tone="secondary" style={styles.label}>
          {label}
        </Txt>
      ) : null}

      <Animated.View
        style={[
          squircle,
          styles.frame,
          multiline && styles.frameMultiline,
          frame,
          focused && !error && styles.focusRing,
        ]}
      >
        {icon ? (
          <Feather
            name={icon}
            size={18}
            color={error ? colors.danger : focused ? colors.primary : colors.textMuted}
            style={multiline ? styles.iconTop : undefined}
          />
        ) : null}

        <TextInput
          {...props}
          multiline={multiline}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.primary}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={[styles.input, multiline && styles.inputMultiline, inputStyle]}
        />

        {trailing}
      </Animated.View>

      {error ? (
        <View style={styles.message}>
          <Feather name="alert-circle" size={13} color={colors.danger} />
          <Txt variant="caption" tone="danger" style={styles.messageText}>
            {error}
          </Txt>
        </View>
      ) : hint ? (
        <Txt variant="caption" tone="muted" style={styles.hint}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: space.xs,
    marginLeft: space['3xs'],
  },
  frame: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: space.md,
  },
  frameMultiline: {
    minHeight: 156,
    alignItems: 'flex-start',
    paddingVertical: space.md,
  },
  focusRing: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 2,
  },
  iconTop: {
    marginTop: 3,
  },
  input: {
    ...type.bodyLg,
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontFamily: fonts.medium,
    paddingVertical: space.sm,
  },
  inputMultiline: {
    paddingTop: 0,
    minHeight: 124,
  },
  message: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs,
    marginTop: space.xs,
    marginLeft: space['3xs'],
  },
  messageText: {
    flex: 1,
  },
  hint: {
    marginTop: space.xs,
    marginLeft: space['3xs'],
  },
});
