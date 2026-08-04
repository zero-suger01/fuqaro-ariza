import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type AuthUser,
  type CitizenComplaint,
  getMe,
  getMyComplaints,
  loginCitizen,
  logoutCitizen,
  registerCitizen,
  requestCitizenOtp,
  verifyCitizenOtp,
} from '@/api';
import { BottomNav, type CabinetTab } from '@/components/BottomNav';
import { CabinetHome } from '@/components/cabinet/CabinetHome';
import { EmptyRequests } from '@/design-system/components/EmptyRequests';
import { NotificationEmptyState } from '@/design-system/components/NotificationEmptyState';
import { RequestCard } from '@/design-system/components/RequestCard';
import { SettingsRow } from '@/design-system/components/SettingsRow';
import { getCabinetDesignCopy } from '@/design-system/copy';
import { colorTokens, componentShapes, radii, shadows, spacing, typography } from '@/design-system/tokens';
import { languages, useI18n } from '@/i18n';

type AuthProps = {
  mode: 'login' | 'register';
  setMode: (value: 'login' | 'register') => void;
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
  setOtpPending: (value: boolean) => void;
  submitting: boolean;
  error: string;
  submit: () => void;
  confirmOtp: () => void;
};

export default function CabinetScreen() {
  const { width } = useWindowDimensions();
  const { language, setLanguage } = useI18n();
  const copy = getCabinetDesignCopy(language);
  const pagePadding = width < 360 ? spacing.md : spacing.lg;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [complaints, setComplaints] = useState<CitizenComplaint[]>([]);
  const [tab, setTab] = useState<CabinetTab>('home');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('+998');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpPending, setOtpPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const current = await getMe();
      if (current.kind !== 'citizen') throw new Error();
      setUser(current);
      setComplaints(await getMyComplaints());
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function registerPush() {
    if (Constants.appOwnership === 'expo') return;
    try {
      const Notifications = await import('expo-notifications');
      if ((await Notifications.requestPermissionsAsync()).status !== 'granted') return;
      const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || Constants.expoConfig?.extra?.eas?.projectId;
      const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
      const access = await AsyncStorage.getItem('emurojaat_token');
      if (!access) return;
      await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://ariza.xron.uz'}/api/citizen/push-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access}` },
        body: JSON.stringify({ token, platform: Platform.OS }),
      });
    } catch {
      // Push is optional and must not block the cabinet.
    }
  }

  async function submit() {
    setError('');
    const normalized = phone.replace(/\s/g, '');
    if (normalized.replace(/\D/g, '').length !== 12 || password.length < 6 || (mode === 'register' && !firstName.trim())) {
      setError('Telefon, parol va ismni to‘g‘ri kiriting.');
      return;
    }
    setSubmitting(true);
    try {
      const current = mode === 'login'
        ? await loginCitizen(normalized, password)
        : await registerCitizen({ first_name: firstName.trim(), last_name: lastName.trim(), phone: normalized, password });
      if (mode === 'register') {
        try {
          await requestCitizenOtp(normalized);
          setOtpPending(true);
        } catch (requestError) {
          if ((requestError as Error & { status?: number }).status !== 404) throw requestError;
          setUser(current);
          setComplaints(await getMyComplaints());
          await registerPush();
        }
      } else {
        setUser(current);
        setComplaints(await getMyComplaints());
        await registerPush();
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Kirishda xatolik yuz berdi.');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmOtp() {
    setError('');
    if (!/^\d{6}$/.test(otp)) {
      setError('6 xonali kodni kiriting.');
      return;
    }
    setSubmitting(true);
    try {
      await verifyCitizenOtp(phone.replace(/\s/g, ''), otp);
      setUser(await getMe());
      setComplaints(await getMyComplaints());
      await registerPush();
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : 'Kod noto‘g‘ri yoki muddati o‘tgan.');
    } finally {
      setSubmitting(false);
    }
  }

  async function signOut() {
    await logoutCitizen();
    setUser(null);
    setComplaints([]);
    setTab('home');
  }

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
        <ActivityIndicator accessibilityLabel="Yuklanmoqda" color={colorTokens.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        {...{
          mode,
          setMode,
          firstName,
          setFirstName,
          lastName,
          setLastName,
          phone,
          setPhone,
          password,
          setPassword,
          otp,
          setOtp,
          otpPending,
          setOtpPending,
          submitting,
          error,
          submit,
          confirmOtp,
        }}
      />
    );
  }

  const openRequest = (complaint: CitizenComplaint) => {
    router.push({ pathname: '/track', params: { ticket: complaint.ticket_number } });
  };

  const currentLanguage = languages.find((item) => item.code === language) ?? languages[0];
  const cycleLanguage = () => {
    const currentIndex = languages.findIndex((item) => item.code === language);
    setLanguage(languages[(currentIndex + 1) % languages.length].code);
  };
  const initials = `${user.first_name?.[0] || 'F'}${user.last_name?.[0] || ''}`.toLocaleUpperCase();
  const screenTitle = tab === 'complaints'
    ? copy.requestsTitle
    : tab === 'notifications'
      ? copy.notificationsTitle
      : tab === 'settings'
        ? copy.settingsTitle
        : copy.appBarTitle;

  const home = (
    <CabinetHome
      user={user}
      complaints={complaints}
      onNewRequest={() => router.push('/complaint')}
      onViewAll={() => setTab('complaints')}
      onOpenRequest={openRequest}
    />
  );

  const list = (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        {complaints.length > 0 ? (
          <View style={styles.requestList}>
            {complaints.map((complaint) => (
              <RequestCard key={complaint.id} complaint={complaint} onPress={() => openRequest(complaint)} />
            ))}
          </View>
        ) : (
          <EmptyRequests onPress={() => router.push('/complaint')} />
        )}
      </View>
    </ScrollView>
  );

  const settings = (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <View
          accessible
          accessibilityRole="summary"
          accessibilityLabel={`${user.fullname}. ${user.phone}. ${copy.verifiedLabel}`}
          style={styles.profileCard}
        >
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{initials}</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text numberOfLines={2} maxFontSizeMultiplier={1.5} style={styles.profileName}>{user.fullname}</Text>
            <Text numberOfLines={1} maxFontSizeMultiplier={1.4} style={styles.profilePhone}>{user.phone}</Text>
            <View style={styles.verifiedRow}>
              <Feather name="check-circle" size={12} color={colorTokens.primary} aria-hidden />
              <Text numberOfLines={1} maxFontSizeMultiplier={1.4} style={styles.verifiedText}>{copy.verifiedLabel}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.groupLabel}>{copy.settingsSection}</Text>
        <View style={styles.settingsGroup}>
          <SettingsRow icon="globe" title={copy.languageSetting} value={currentLanguage.label} onPress={cycleLanguage} />
          <SettingsRow icon="bell" title={copy.notificationsSetting} onPress={() => setTab('notifications')} />
          <SettingsRow icon="info" title={copy.aboutSetting} value={copy.versionLabel} last />
        </View>
        <Pressable
          onPress={signOut}
          accessibilityRole="button"
          accessibilityLabel={copy.logout}
          hitSlop={4}
          style={({ pressed }) => [styles.logoutAction, pressed && styles.logoutPressed]}
        >
          <Feather name="log-out" size={16} color={colorTokens.danger} aria-hidden />
          <Text style={styles.logoutText}>{copy.logout}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );

  const notifications = (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <View style={styles.notificationState}>
          <NotificationEmptyState onViewRequests={() => setTab('complaints')} />
        </View>
      </View>
    </ScrollView>
  );

  const body = tab === 'home' ? home : tab === 'complaints' ? list : tab === 'notifications' ? notifications : settings;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <View style={[styles.topbar, { paddingHorizontal: pagePadding }]}>
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.84}
          maxFontSizeMultiplier={1.4}
          style={styles.topbarTitle}
        >
          {screenTitle}
        </Text>
        {tab === 'home' ? (
          <View accessible accessibilityRole="text" accessibilityLabel={copy.systemStatus} style={styles.online}>
            <View style={styles.onlineDot} aria-hidden />
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.86}
              maxFontSizeMultiplier={1.3}
              style={styles.onlineText}
            >
              {copy.systemStatus}
            </Text>
          </View>
        ) : tab === 'complaints' ? (
          <View accessible accessibilityRole="text" style={styles.countBadge}>
            <Text numberOfLines={1} maxFontSizeMultiplier={1.4} style={styles.count}>
              {copy.requestCount.replace('{count}', String(complaints.length))}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.flex, { paddingHorizontal: pagePadding }]}>{body}</View>
      <BottomNav active={tab} onChange={setTab} />
    </SafeAreaView>
  );
}

function AuthScreen({
  mode,
  setMode,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  phone,
  setPhone,
  password,
  setPassword,
  otp,
  setOtp,
  otpPending,
  setOtpPending,
  submitting,
  error,
  submit,
  confirmOtp,
}: AuthProps) {
  const form = otpPending ? (
    <>
      <TextInput
        value={otp}
        onChangeText={setOtp}
        style={styles.input}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="SMS kodi"
        placeholderTextColor={colorTokens.textSecondary}
      />
      <Pressable style={styles.primary} onPress={confirmOtp} disabled={submitting} accessibilityRole="button">
        {submitting ? <ActivityIndicator color={colorTokens.white} /> : <><Text style={styles.primaryText}>Tasdiqlash</Text><Feather name="check" size={19} color={colorTokens.white} aria-hidden /></>}
      </Pressable>
      <Pressable onPress={() => { setOtpPending(false); setOtp(''); }} accessibilityRole="button">
        <Text style={styles.switchText}>Orqaga</Text>
      </Pressable>
    </>
  ) : (
    <>
      {mode === 'register' ? <>
        <TextInput value={firstName} onChangeText={setFirstName} style={styles.input} placeholder="Ismingiz" placeholderTextColor={colorTokens.textSecondary} />
        <TextInput value={lastName} onChangeText={setLastName} style={styles.input} placeholder="Familiyangiz (ixtiyoriy)" placeholderTextColor={colorTokens.textSecondary} />
      </> : null}
      <TextInput value={phone} onChangeText={setPhone} style={styles.input} keyboardType="phone-pad" placeholder="+998 90 123 45 67" placeholderTextColor={colorTokens.textSecondary} />
      <TextInput value={password} onChangeText={setPassword} style={styles.input} secureTextEntry placeholder="Parol (kamida 6 belgi)" placeholderTextColor={colorTokens.textSecondary} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.primary} onPress={submit} disabled={submitting} accessibilityRole="button">
        {submitting ? <ActivityIndicator color={colorTokens.white} /> : <><Text style={styles.primaryText}>{mode === 'login' ? 'Kirish' : 'Ro‘yxatdan o‘tish'}</Text><Feather name="arrow-right" size={19} color={colorTokens.white} aria-hidden /></>}
      </Pressable>
      <Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')} accessibilityRole="button">
        <Text style={styles.switchText}>{mode === 'login' ? 'Kabinetim yo‘q — ochish' : 'Kabinetim bor — kirish'}</Text>
      </Pressable>
    </>
  );

  return (
    <SafeAreaView style={styles.authSafe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.authHeader}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Orqaga">
            <Feather name="arrow-left" size={23} color={colorTokens.textPrimary} />
          </Pressable>
          <Text style={styles.topbarTitle}>Fuqaro kabineti</Text>
        </View>
        <ScrollView contentContainerStyle={styles.authBody} keyboardShouldPersistTaps="handled">
          <View style={styles.authIcon}>
            <Feather name={otpPending ? 'message-circle' : 'user'} size={24} color={colorTokens.white} aria-hidden />
          </View>
          <Text style={styles.authTitle}>{otpPending ? 'Telefonni tasdiqlang' : mode === 'login' ? 'Kabinetga kirish' : 'Kabinet ochish'}</Text>
          <Text style={styles.sub}>{otpPending ? `${phone} raqamiga yuborilgan 6 xonali kodni kiriting.` : 'Murojaatlaringiz, javoblar va holatlarni bir joydan ko‘ring.'}</Text>
          {form}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colorTokens.background,
  },
  authSafe: {
    flex: 1,
    backgroundColor: colorTokens.background,
    paddingHorizontal: spacing.lg,
  },
  flex: { flex: 1 },
  loader: { flex: 1 },
  inner: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  topbar: {
    width: '100%',
    maxWidth: 720,
    minHeight: 48,
    flexShrink: 0,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  topbarTitle: {
    ...typography.pageTitle,
    minWidth: 0,
    flex: 1,
    color: colorTokens.textPrimary,
  },
  online: {
    maxWidth: '38%',
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.pill,
    backgroundColor: colorTokens.successSoft,
    paddingHorizontal: spacing.xs,
  },
  onlineText: {
    ...typography.caption,
    flexShrink: 1,
    color: colorTokens.success,
    fontWeight: '600',
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colorTokens.success,
  },
  page: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
  countBadge: {
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colorTokens.primarySoft,
    paddingHorizontal: spacing.sm,
  },
  count: {
    ...typography.label,
    color: colorTokens.primary,
  },
  requestList: { gap: spacing.sm },
  profileCard: {
    ...componentShapes.surface,
    ...shadows.tile,
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxs,
    backgroundColor: colorTokens.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    ...componentShapes.icon,
    flexShrink: 0,
    backgroundColor: colorTokens.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    color: colorTokens.white,
    fontSize: 18,
    fontWeight: '600',
  },
  profileCopy: {
    minWidth: 0,
    flex: 1,
  },
  profileName: {
    ...typography.cardTitle,
    color: colorTokens.textPrimary,
  },
  profilePhone: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '400',
    color: colorTokens.textSecondary,
    marginTop: 1,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  verifiedText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
    color: colorTokens.primary,
  },
  groupLabel: {
    ...typography.label,
    color: colorTokens.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  settingsGroup: {
    ...componentShapes.surface,
    ...shadows.tile,
    overflow: 'hidden',
    backgroundColor: colorTokens.surfaceWarm,
    paddingVertical: spacing.xxs,
  },
  logoutAction: {
    minHeight: 48,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  logoutText: {
    ...typography.button,
    color: colorTokens.danger,
  },
  logoutPressed: {
    opacity: 0.62,
  },
  notificationState: {
    marginTop: spacing.xs,
  },
  authHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  authBody: {
    paddingTop: spacing.giant,
    paddingBottom: spacing.xl,
  },
  authIcon: {
    width: 53,
    height: 53,
    borderRadius: radii.control,
    backgroundColor: colorTokens.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  authTitle: {
    ...typography.display,
    color: colorTokens.textPrimary,
  },
  sub: {
    ...typography.supporting,
    color: colorTokens.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  input: {
    minHeight: 56,
    backgroundColor: colorTokens.surface,
    borderWidth: 1,
    borderColor: colorTokens.border,
    borderRadius: radii.control,
    paddingHorizontal: spacing.md,
    color: colorTokens.textPrimary,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  primary: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radii.control,
    backgroundColor: colorTokens.primary,
    marginTop: spacing.xxs,
  },
  primaryText: {
    ...typography.button,
    color: colorTokens.white,
  },
  error: {
    ...typography.label,
    color: colorTokens.danger,
    marginBottom: spacing.xs,
  },
  switchText: {
    ...typography.label,
    color: colorTokens.primary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
