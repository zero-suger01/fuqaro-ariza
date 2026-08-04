import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/theme';
import Constants from 'expo-constants';
import { I18nProvider } from '@/i18n';

export default function RootLayout() {
  if (Constants.appOwnership !== 'expo') {
    import('expo-notifications').then((Notifications) => Notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
    })).catch(() => undefined);
  }
  return (
    <>
      <StatusBar style="dark" />
      <I18nProvider><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} /></I18nProvider>
    </>
  );
}
