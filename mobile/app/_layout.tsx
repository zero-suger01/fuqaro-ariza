import { Platform, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import Constants from 'expo-constants';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { I18nProvider } from '@/i18n';
import { colors, EmblemMark, NightPanel, StarLoader, palette } from '@/design';

export default function RootLayout() {
  const [fontsReady] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  if (Platform.OS !== 'web' && Constants.appOwnership !== 'expo') {
    import('expo-notifications')
      .then((Notifications) =>
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        }),
      )
      .catch(() => undefined);
  }

  if (!fontsReady) return <BrandSplash />;

  return (
    <GestureHandlerRootView style={styles.root}>
      <I18nProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: 260,
            contentStyle: { backgroundColor: colors.canvas },
          }}
        >
          <Stack.Screen name="index" options={{ animation: 'fade' }} />
          <Stack.Screen name="complaint" options={{ animation: 'slide_from_bottom' }} />
        </Stack>
      </I18nProvider>
    </GestureHandlerRootView>
  );
}

/** Shown only while Manrope loads — branded rather than a blank frame. */
function BrandSplash() {
  return (
    <NightPanel round="xs" pattern="quiet" style={styles.splash}>
      <View style={styles.splashInner}>
        <EmblemMark size={78} color={palette.white} accent={palette.brass[300]} />
        <StarLoader size={30} color="rgba(255,255,255,0.6)" accent={palette.brass[300]} />
      </View>
    </NightPanel>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  splash: { flex: 1, borderRadius: 0 },
  splashInner: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 34,
  },
});
