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
import { RequestCard } from '@/design-system/components/RequestCard';
import { getCabinetDesignCopy } from '@/design-system/copy';
import { colorTokens, radii, spacing, typography } from '@/design-system/tokens';
import { useI18n } from '@/i18n';

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
  const { language } = useI18n();
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
        <View style={styles.sectionHeader}>
          <View style={styles.flex}>
            <Text style={styles.eyebrow}>FAOLIYAT</Text>
            <Text style={styles.title}>Murojaatlarim</Text>
          </View>
          <Text style={styles.count}>{complaints.length} ta</Text>
        </View>
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
        <Text style={styles.eyebrow}>SHAXSIY MA’LUMOTLAR</Text>
        <Text style={styles.title}>Sozlamalar</Text>
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{(user.first_name || 'F').slice(0, 1).toUpperCase()}</Text>
          </View>
          <Text style={styles.profileName}>{user.fullname}</Text>
          <Text style={styles.profilePhone}>{user.phone}</Text>
        </View>
        <Pressable style={styles.logoutButton} onPress={signOut} accessibilityRole="button">
          <Feather name="log-out" size={18} color={colorTokens.danger} aria-hidden />
          <Text style={styles.logoutText}>Kabinetdan chiqish</Text>
        </Pressable>
      </View>
    </ScrollView>
  );

  const notifications = (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Text style={styles.eyebrow}>AXBOROT</Text>
        <Text style={styles.title}>Bildirishnomalar</Text>
        <View style={styles.notificationEmpty}>
          <Feather name="bell" size={30} color={colorTokens.primary} aria-hidden />
          <Text style={styles.emptyTitle}>Hozircha bildirishnoma yo‘q</Text>
          <Text style={styles.emptyText}>Murojaatingiz holati o‘zgarsa, shu yerda ko‘rasiz.</Text>
        </View>
      </View>
    </ScrollView>
  );

  const body = tab === 'home' ? home : tab === 'complaints' ? list : tab === 'notifications' ? notifications : settings;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safe, { paddingHorizontal: pagePadding }]}>
      <View style={styles.topbar}>
        <Text style={styles.topbarTitle}>{copy.appBarTitle}</Text>
        <View accessible accessibilityRole="text" accessibilityLabel={copy.systemStatus} style={styles.online}>
          <Feather name="check-circle" size={14} color={colorTokens.success} aria-hidden />
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={styles.onlineText}>{copy.systemStatus}</Text>
        </View>
      </View>
      <View style={styles.flex}>{body}</View>
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
    <SafeAreaView style={styles.safe}>
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
    minHeight: 56,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xxs,
    paddingBottom: spacing.xs,
  },
  topbarTitle: {
    ...typography.sectionTitle,
    flex: 1,
    color: colorTokens.textPrimary,
  },
  online: {
    maxWidth: '53%',
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.pill,
    backgroundColor: colorTokens.successSoft,
    paddingHorizontal: spacing.sm,
  },
  onlineText: {
    ...typography.caption,
    flexShrink: 1,
    color: colorTokens.success,
    fontWeight: '700',
  },
  page: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sectionHeader: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  eyebrow: {
    ...typography.label,
    color: colorTokens.primary,
    letterSpacing: 1.2,
  },
  title: {
    ...typography.pageTitle,
    color: colorTokens.textPrimary,
    marginTop: spacing.xs,
  },
  count: {
    ...typography.label,
    color: colorTokens.primary,
    paddingBottom: 5,
  },
  requestList: { gap: spacing.sm },
  profileCard: {
    marginTop: spacing.xl,
    backgroundColor: colorTokens.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colorTokens.border,
    padding: spacing.xl,
    alignItems: 'center',
  },
  profileAvatar: {
    width: 68,
    height: 68,
    borderRadius: radii.card,
    backgroundColor: colorTokens.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    color: colorTokens.primaryDark,
    fontSize: 28,
    fontWeight: '700',
  },
  profileName: {
    ...typography.cardTitle,
    color: colorTokens.textPrimary,
    marginTop: spacing.md,
  },
  profilePhone: {
    ...typography.supporting,
    color: colorTokens.textSecondary,
    marginTop: spacing.xxs,
  },
  logoutButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colorTokens.dangerBorder,
    backgroundColor: colorTokens.dangerSoft,
  },
  logoutText: {
    ...typography.button,
    color: colorTokens.danger,
  },
  notificationEmpty: {
    alignItems: 'center',
    paddingTop: spacing.giant,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.cardTitle,
    color: colorTokens.textPrimary,
    marginTop: spacing.sm,
  },
  emptyText: {
    ...typography.supporting,
    color: colorTokens.textSecondary,
    textAlign: 'center',
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
