import { useCallback, useEffect, useState } from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getMe,
  getMyComplaints,
  loginCitizen,
  logoutCitizen,
  registerCitizen,
  requestCitizenOtp,
  verifyCitizenOtp,
  type AuthUser,
  type CitizenComplaint,
} from '@/api';
import { BottomNav, type CabinetTab } from '@/components/BottomNav';
import { AuthScreen, type AuthMode } from '@/components/cabinet/AuthScreen';
import { CabinetHome } from '@/components/cabinet/CabinetHome';
import { EmptyState } from '@/components/cabinet/EmptyState';
import { RequestCard } from '@/components/cabinet/RequestCard';
import { SettingsPanel } from '@/components/cabinet/SettingsPanel';
import { fill, useI18n } from '@/i18n';
import {
  Badge,
  EmblemMark,
  Reveal,
  StarLoader,
  Txt,
  colors,
  layout,
  palette,
  space,
} from '@/design';

export default function CabinetScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [complaints, setComplaints] = useState<CitizenComplaint[]>([]);
  const [tab, setTab] = useState<CabinetTab>('home');
  const [mode, setMode] = useState<AuthMode>('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('+998');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpPending, setOtpPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const current = await getMe();
      if (current.kind !== 'citizen') throw new Error('not a citizen account');
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

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setComplaints(await getMyComplaints());
    } catch {
      // Keep the last good list rather than blanking the screen on a blip.
    } finally {
      setRefreshing(false);
    }
  }, []);

  async function registerPush() {
    if (Constants.appOwnership === 'expo') return;
    try {
      const Notifications = await import('expo-notifications');
      if ((await Notifications.requestPermissionsAsync()).status !== 'granted') return;
      const projectId =
        process.env.EXPO_PUBLIC_EAS_PROJECT_ID || Constants.expoConfig?.extra?.eas?.projectId;
      const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
      const access = await AsyncStorage.getItem('emurojaat_token');
      if (!access) return;
      await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || 'https://ariza.xron.uz'}/api/citizen/push-tokens`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access}` },
          body: JSON.stringify({ token, platform: Platform.OS }),
        },
      );
    } catch {
      // Push is optional and must not block the cabinet.
    }
  }

  async function submit() {
    setError('');
    const normalized = phone.replace(/\s/g, '');
    if (
      normalized.replace(/\D/g, '').length !== 12 ||
      password.length < 6 ||
      (mode === 'register' && !firstName.trim())
    ) {
      setError(t.auth.invalid);
      return;
    }
    setSubmitting(true);
    try {
      const current =
        mode === 'login'
          ? await loginCitizen(normalized, password)
          : await registerCitizen({
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              phone: normalized,
              password,
            });
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
      setError(submitError instanceof Error ? submitError.message : t.auth.failed);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmOtp() {
    setError('');
    if (!/^\d{6}$/.test(otp)) {
      setError(t.auth.otpInvalid);
      return;
    }
    setSubmitting(true);
    try {
      await verifyCitizenOtp(phone.replace(/\s/g, ''), otp);
      setUser(await getMe());
      setComplaints(await getMyComplaints());
      await registerPush();
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : t.auth.failed);
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
      <View style={styles.loading}>
        <StatusBar style="dark" />
        <StarLoader size={46} label={t.common.loading} />
        <Txt variant="caption" tone="muted">
          {t.common.loading}
        </Txt>
      </View>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        mode={mode}
        setMode={setMode}
        firstName={firstName}
        setFirstName={setFirstName}
        lastName={lastName}
        setLastName={setLastName}
        phone={phone}
        setPhone={setPhone}
        password={password}
        setPassword={setPassword}
        otp={otp}
        setOtp={setOtp}
        otpPending={otpPending}
        cancelOtp={() => {
          setOtpPending(false);
          setOtp('');
        }}
        submitting={submitting}
        error={error}
        submit={submit}
        confirmOtp={confirmOtp}
      />
    );
  }

  const openRequest = (complaint: CitizenComplaint) =>
    router.push({ pathname: '/track', params: { ticket: complaint.ticket_number } });

  const newRequest = () => router.push('/complaint');

  // The nav floats over content, so every scroller reserves its footprint.
  const contentPadding = layout.navHeight + space['3xl'] + Math.max(insets.bottom, space.sm);

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
  );

  const screens: Record<CabinetTab, React.ReactNode> = {
    home: (
      <CabinetHome
        user={user}
        complaints={complaints}
        contentPadding={contentPadding}
        refreshControl={refreshControl}
        onNewRequest={newRequest}
        onViewAll={() => setTab('complaints')}
        onOpenRequest={openRequest}
      />
    ),
    complaints: (
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        contentContainerStyle={[styles.page, { paddingBottom: contentPadding }]}
      >
        {complaints.length > 0 ? (
          <View style={styles.list}>
            {complaints.map((complaint, index) => (
              <Reveal key={complaint.id} index={index}>
                <RequestCard complaint={complaint} onPress={() => openRequest(complaint)} />
              </Reveal>
            ))}
          </View>
        ) : (
          <Reveal>
            <EmptyState
              icon="inbox"
              title={t.cabinet.emptyTitle}
              text={t.cabinet.emptyText}
              actionLabel={t.cabinet.emptyAction}
              onAction={newRequest}
            />
          </Reveal>
        )}
      </ScrollView>
    ),
    new: null,
    notifications: (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.page, { paddingBottom: contentPadding }]}
      >
        <Reveal>
          <EmptyState
            icon="bell"
            title={t.cabinet.alertsEmptyTitle}
            text={t.cabinet.alertsEmptyText}
            actionLabel={t.cabinet.myRequests}
            onAction={() => setTab('complaints')}
          />
        </Reveal>
      </ScrollView>
    ),
    settings: (
      <SettingsPanel
        user={user}
        contentPadding={contentPadding}
        onOpenNotifications={() => setTab('notifications')}
        onSignOut={signOut}
      />
    ),
  };

  const headings: Record<CabinetTab, string> = {
    home: t.brand,
    complaints: t.cabinet.myRequests,
    new: t.cabinet.heroTitle,
    notifications: t.cabinet.alertsTitle,
    settings: t.cabinet.settingsTitle,
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View style={[styles.header, { paddingTop: insets.top + space.xs }]}>
        {tab === 'home' ? (
          <View style={styles.mark}>
            <EmblemMark size={26} color={colors.primaryDeep} accent={palette.brass[400]} />
          </View>
        ) : null}

        <Txt
          variant="title2"
          accessibilityRole="header"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
          style={styles.headerTitle}
        >
          {headings[tab]}
        </Txt>

        {tab === 'home' ? (
          <Badge
            label={t.cabinet.online}
            color={colors.success}
            background={colors.successTint}
            dot
            style={styles.headerBadge}
          />
        ) : tab === 'complaints' ? (
          <Badge
            label={fill(t.cabinet.countSuffix, { count: complaints.length })}
            color={colors.primary}
            background={colors.primaryTint}
          />
        ) : null}
      </View>

      <View style={styles.body}>{screens[tab]}</View>

      <BottomNav active={tab} onChange={setTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    backgroundColor: colors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: layout.gutter,
    paddingBottom: space.xs,
  },
  mark: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, minWidth: 0 },
  headerBadge: { maxWidth: '46%' },
  body: { flex: 1 },
  page: {
    paddingTop: space.xs,
    paddingHorizontal: layout.gutter,
  },
  list: { gap: space.sm },
});
