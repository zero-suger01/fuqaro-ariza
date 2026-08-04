import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { fill, useI18n } from '@/i18n';
import {
  Button,
  Drift,
  EmblemMark,
  Field,
  IconButton,
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

export type AuthMode = 'login' | 'register';

export type AuthScreenProps = {
  mode: AuthMode;
  setMode: (value: AuthMode) => void;
  firstName: string;
  setFirstName: (value: string) => void;
  lastName: string;
  setLastName: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  otp: string;
  setOtp: (value: string) => void;
  otpPending: boolean;
  cancelOtp: () => void;
  submitting: boolean;
  error: string;
  submit: () => void;
  confirmOtp: () => void;
};

export function AuthScreen(props: AuthScreenProps) {
  const { mode, setMode, otpPending, submitting, error } = props;
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  const title = otpPending
    ? t.auth.otpTitle
    : mode === 'login'
      ? t.auth.title
      : t.auth.registerTitle;
  const subtitle = otpPending
    ? fill(t.auth.otpSubtitle, { phone: props.phone })
    : mode === 'login'
      ? t.auth.subtitle
      : t.auth.registerSubtitle;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + space['2xl'] }}
        >
          <NightPanel
            round="3xl"
            pattern="full"
            gilded
            style={[styles.hero, { paddingTop: insets.top + space.sm }]}
            overlay={
              <Drift style={styles.bloom} amplitude={7} duration={12000}>
                <SuzaniBloom size={260} color={palette.white} accent={palette.brass[200]} opacity={0.15} />
              </Drift>
            }
          >
            <View>
              <IconButton
                icon="arrow-left"
                tone="dark"
                label={t.common.back}
                onPress={() => router.back()}
              />

              <Reveal index={1} style={styles.emblem}>
                <EmblemMark size={46} color={palette.white} accent={palette.brass[300]} />
              </Reveal>

              <Reveal index={2}>
                <Txt variant="display" tone="onDark" maxFontSizeMultiplier={1.25}>
                  {title}
                </Txt>
                <Txt variant="body" tone="onDarkSoft" style={styles.subtitle}>
                  {subtitle}
                </Txt>
              </Reveal>
            </View>
          </NightPanel>

          <Reveal index={2} delay={80} style={styles.sheetWrap}>
            <View style={[squircle, styles.sheet, elevation.float]}>
              {otpPending ? <OtpForm {...props} /> : <CredentialsForm {...props} />}

              {error ? (
                <View style={styles.error}>
                  <Feather name="alert-circle" size={15} color={colors.danger} />
                  <Txt variant="caption" tone="danger" style={styles.errorText}>
                    {error}
                  </Txt>
                </View>
              ) : null}

              {otpPending ? (
                <>
                  <Button
                    label={t.auth.confirm}
                    icon="check"
                    loading={submitting}
                    onPress={props.confirmOtp}
                    style={styles.submit}
                  />
                  <Touchable
                    onPress={props.cancelOtp}
                    accessibilityRole="button"
                    style={styles.switchAction}
                  >
                    <Txt variant="caption" tone="secondary">
                      {t.auth.back}
                    </Txt>
                  </Touchable>
                </>
              ) : (
                <>
                  <Button
                    label={mode === 'login' ? t.auth.signIn : t.auth.signUp}
                    trailingIcon="arrow-right"
                    loading={submitting}
                    onPress={props.submit}
                    style={styles.submit}
                  />
                  <Touchable
                    onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
                    accessibilityRole="button"
                    style={styles.switchAction}
                  >
                    <Txt variant="caption" tone="primary">
                      {mode === 'login' ? t.auth.toRegister : t.auth.toLogin}
                    </Txt>
                  </Touchable>
                </>
              )}

              <View style={styles.trust}>
                <Feather name="lock" size={12} color={colors.textFaint} />
                <Txt variant="caption" tone="faint" numberOfLines={2} style={styles.trustText}>
                  {t.auth.trust}
                </Txt>
              </View>
            </View>
          </Reveal>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function CredentialsForm({
  mode,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  phone,
  setPhone,
  password,
  setPassword,
}: AuthScreenProps) {
  const { t } = useI18n();
  return (
    <View style={styles.fields}>
      {mode === 'register' ? (
        <>
          <Field
            label={t.auth.firstName}
            icon="user"
            value={firstName}
            onChangeText={setFirstName}
            autoComplete="given-name"
            textContentType="givenName"
          />
          <Field
            label={t.auth.lastName}
            icon="users"
            value={lastName}
            onChangeText={setLastName}
            autoComplete="family-name"
            textContentType="familyName"
          />
        </>
      ) : null}

      <Field
        label={t.auth.phone}
        icon="phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        placeholder="+998 90 123 45 67"
      />

      <Field
        label={t.auth.password}
        icon="lock"
        hint={t.auth.passwordHint}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
      />
    </View>
  );
}

function OtpForm({ otp, setOtp }: AuthScreenProps) {
  const { t } = useI18n();
  return (
    <View style={styles.fields}>
      <Field
        label={t.auth.otpCode}
        icon="message-circle"
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        maxLength={6}
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        placeholder="000000"
        inputStyle={styles.otpInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  hero: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingHorizontal: layout.gutter,
    paddingBottom: space['4xl'],
  },
  bloom: { position: 'absolute', top: -70, right: -86 },
  emblem: { marginTop: space['2xl'] },
  subtitle: { marginTop: space.xs, maxWidth: 340 },

  sheetWrap: { paddingHorizontal: layout.gutter, marginTop: -space['2xl'] },
  sheet: {
    borderRadius: radius['2xl'],
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderColor: colors.hairline,
    padding: space.lg,
  },
  fields: { gap: space.md },
  otpInput: { letterSpacing: 8, fontSize: 20 },
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
  submit: { marginTop: space.lg },
  switchAction: {
    minHeight: layout.tapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.xxs,
  },
  trust: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxs,
    marginTop: space.xs,
  },
  trustText: { flexShrink: 1 },
});
