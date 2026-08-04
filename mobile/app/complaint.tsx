import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getNeighborhoods,
  submitComplaint,
  type MediaAttachment,
  type Neighborhood,
} from '@/api';
import { EvidenceTile } from '@/components/wizard/EvidenceTile';
import { StepRibbon } from '@/components/wizard/StepRibbon';
import { fill, useI18n } from '@/i18n';
import {
  Button,
  Card,
  Field,
  IconButton,
  Reveal,
  StarLoader,
  Touchable,
  Txt,
  colors,
  layout,
  radius,
  space,
  squircle,
  tap,
} from '@/design';

const DRAFT_KEY = 'emurojaat_complaint_draft';
const TOTAL_STEPS = 3;
const MAX_IMAGES = 5;
const MAX_DESCRIPTION = 2000;

function mediaFromAsset(asset: ImagePicker.ImagePickerAsset, fallbackType: string): MediaAttachment {
  const extension = asset.fileName?.split('.').pop() || fallbackType.split('/').pop() || 'bin';
  return {
    uri: asset.uri,
    name: asset.fileName || `murojaat-${Date.now()}.${extension}`,
    type: asset.mimeType || fallbackType,
  };
}

export default function ComplaintScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  const [step, setStep] = useState(1);
  const [description, setDescription] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+998');
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [neighborhoodId, setNeighborhoodId] = useState('');
  const [query, setQuery] = useState('');
  const [images, setImages] = useState<MediaAttachment[]>([]);
  const [video, setVideo] = useState<MediaAttachment | null>(null);
  const [audio, setAudio] = useState<MediaAttachment | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [neighborhoodLoading, setNeighborhoodLoading] = useState(true);
  /** Kept apart from `error` so a step-2 failure never shouts on step 1. */
  const [neighborhoodError, setNeighborhoodError] = useState('');

  const filtered = useMemo(
    () =>
      neighborhoods
        .filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()))
        .slice(0, 8),
    [neighborhoods, query],
  );

  useEffect(() => {
    getNeighborhoods()
      .then(setNeighborhoods)
      .catch(() => setNeighborhoodError(t.wizard.neighborhoodsFailed))
      .finally(() => setNeighborhoodLoading(false));
    // Fetched once on mount; re-running on a language change would re-request
    // the list for nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY).then((value) => {
      if (!value) return;
      try {
        const draft = JSON.parse(value);
        setDescription(draft.description || '');
        setFullName(draft.fullName || draft.firstName || '');
        setPhone(draft.phone || '+998');
        setNeighborhoodId(draft.neighborhoodId || '');
        setQuery(draft.query || '');
        setStep(draft.step || 1);
      } catch {
        // A corrupt draft is not worth surfacing — start clean.
      }
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ description, fullName, phone, neighborhoodId, query, step }),
    ).catch(() => undefined);
  }, [description, fullName, phone, neighborhoodId, query, step]);

  const pickImages = useCallback(async () => {
    setError('');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return setError(t.wizard.permissionPhoto);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
      quality: 0.85,
    });
    if (result.canceled) return;
    setImages((current) => [
      ...current,
      ...result.assets
        .slice(0, MAX_IMAGES - current.length)
        .map((asset) => mediaFromAsset(asset, 'image/jpeg')),
    ]);
  }, [images.length, t]);

  const pickVideo = useCallback(async () => {
    setError('');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return setError(t.wizard.permissionVideo);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: 120,
      quality: 0.7,
    });
    if (!result.canceled) setVideo(mediaFromAsset(result.assets[0], 'video/mp4'));
  }, [t]);

  const toggleRecording = useCallback(async () => {
    setError('');
    if (recording) {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (uri) setAudio({ uri, name: `ovoz-${Date.now()}.m4a`, type: 'audio/mp4' });
      return;
    }
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) return setError(t.wizard.permissionAudio);
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const created = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    setRecording(created.recording);
  }, [recording, t]);

  const useCurrentLocation = useCallback(async () => {
    setError('');
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return setError(t.wizard.permissionLocation);
    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setLocation({ latitude: current.coords.latitude, longitude: current.coords.longitude });
    tap('success');
  }, [t]);

  const goBack = () => {
    if (step > 1) {
      tap('light');
      setError('');
      setStep(step - 1);
      return;
    }
    router.back();
  };

  const advance = () => {
    setError('');
    if (step === 1 && description.trim().length < 10) return setError(t.wizard.tooShort);
    if (step === 2 && neighborhoodLoading) return setError(t.wizard.loadingNeighborhoods);
    if (step === 2 && !neighborhoodId) return setError(t.wizard.pickNeighborhood);
    tap('medium');
    setStep(step + 1);
  };

  const send = async () => {
    setError('');
    // The backend keeps first and last name apart, so one field is split on
    // the first space: everything after it is the surname.
    const [first = '', ...rest] = fullName.trim().split(/\s+/);
    if (!first || phone.replace(/\D/g, '').length !== 12) {
      return setError(t.wizard.contactInvalid);
    }
    setLoading(true);
    try {
      const result = await submitComplaint({
        description,
        firstName: first,
        lastName: rest.join(' '),
        phone: phone.replace(/\s/g, ''),
        neighborhoodId,
        ...location,
        images,
        video,
        audio,
      });
      await AsyncStorage.removeItem(DRAFT_KEY);
      tap('success');
      router.replace({ pathname: '/track', params: { ticket: result.ticket_number, sent: '1' } });
    } catch (sendError) {
      tap('error');
      setError(sendError instanceof Error ? sendError.message : t.wizard.sendFailed);
    } finally {
      setLoading(false);
    }
  };

  const titles = [t.wizard.step1Title, t.wizard.step2Title, t.wizard.step3Title];
  const texts = [t.wizard.step1Text, t.wizard.step2Text, t.wizard.step3Text];

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { paddingTop: insets.top + space.xs }]}>
          <View style={styles.headerRow}>
            <IconButton icon="arrow-left" label={t.common.back} onPress={goBack} />
            <Txt variant="bodyStrong" numberOfLines={1} style={styles.headerTitle}>
              {t.wizard.title}
            </Txt>
            <View style={styles.stepPill}>
              <Txt variant="overline" tone="primary" caps numberOfLines={1}>
                {fill(t.wizard.stepOf, { step, total: TOTAL_STEPS })}
              </Txt>
            </View>
          </View>
          <StepRibbon step={step} total={TOTAL_STEPS} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.body}
        >
          <Reveal key={`title-${step}`}>
            <Txt variant="display" maxFontSizeMultiplier={1.25}>
              {titles[step - 1]}
            </Txt>
            <Txt variant="body" tone="secondary" style={styles.stepText}>
              {texts[step - 1]}
            </Txt>
          </Reveal>

          {step === 1 ? (
            <Reveal key="step1" index={1} style={styles.stepBody}>
              <Field
                multiline
                value={description}
                onChangeText={(value) => setDescription(value.slice(0, MAX_DESCRIPTION))}
                placeholder={t.wizard.step1Placeholder}
                hint={`${description.length} / ${MAX_DESCRIPTION}`}
                maxLength={MAX_DESCRIPTION}
              />

              <View style={styles.evidenceHead}>
                <Txt variant="overline" tone="muted" caps>
                  {t.wizard.evidence}
                </Txt>
                <Txt variant="caption" tone="faint" style={styles.evidenceHint}>
                  {t.wizard.evidenceHint}
                </Txt>
              </View>

              <View style={styles.evidenceRow}>
                <EvidenceTile
                  icon="image"
                  label={t.wizard.photo}
                  count={images.length}
                  active={images.length > 0}
                  onPress={pickImages}
                />
                <EvidenceTile
                  icon="video"
                  label={video ? t.wizard.videoAdded : t.wizard.video}
                  active={!!video}
                  onPress={pickVideo}
                />
                <EvidenceTile
                  icon={recording ? 'square' : 'mic'}
                  label={recording ? t.wizard.recording : audio ? t.wizard.audioAdded : t.wizard.audio}
                  active={!!audio}
                  recording={!!recording}
                  onPress={toggleRecording}
                />
              </View>
            </Reveal>
          ) : null}

          {step === 2 ? (
            <Reveal key="step2" index={1} style={styles.stepBody}>
              <Field
                icon="search"
                value={query}
                onChangeText={setQuery}
                placeholder={t.wizard.searchPlaceholder}
                autoCorrect={false}
              />

              {neighborhoodLoading ? (
                <View style={styles.listLoading}>
                  <StarLoader size={34} label={t.common.loading} />
                </View>
              ) : filtered.length === 0 ? (
                // The load-failure banner below already explains an empty list.
                neighborhoodError ? null : (
                  <Card round="md" padded="md" tone="alt" lift="none">
                    <Txt variant="caption" tone="muted" center>
                      {t.wizard.noMatches}
                    </Txt>
                  </Card>
                )
              ) : (
                <View style={styles.options}>
                  {filtered.map((item) => {
                    const selected = item.id === neighborhoodId;
                    return (
                      <Touchable
                        key={item.id}
                        onPress={() => {
                          tap('select');
                          setNeighborhoodId(item.id);
                          setQuery(item.name);
                        }}
                        haptic="none"
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={item.name}
                        scale={0.99}
                        style={[squircle, styles.option, selected && styles.optionSelected]}
                      >
                        <Feather
                          name={selected ? 'check-circle' : 'map-pin'}
                          size={17}
                          color={selected ? colors.primary : colors.textMuted}
                        />
                        <Txt variant="bodyStrong" numberOfLines={2} style={styles.optionLabel}>
                          {item.name}
                        </Txt>
                      </Touchable>
                    );
                  })}
                </View>
              )}

              <Button
                label={location ? t.wizard.locationAdded : t.wizard.useLocation}
                icon={location ? 'check' : 'navigation'}
                variant={location ? 'ghost' : 'outline'}
                size="md"
                onPress={useCurrentLocation}
                style={styles.locationButton}
              />
            </Reveal>
          ) : null}

          {step === 3 ? (
            <Reveal key="step3" index={1} style={styles.stepBody}>
              <Field
                label={t.wizard.fullName}
                hint={t.wizard.fullNameHint}
                icon="user"
                value={fullName}
                onChangeText={setFullName}
                autoComplete="name"
                textContentType="name"
                placeholder={t.wizard.fullNamePlaceholder}
              />
              <Field
                label={t.auth.phone}
                icon="phone"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                placeholder="+998 90 123 45 67"
              />
            </Reveal>
          ) : null}

          {error || (step === 2 && neighborhoodError) ? (
            <View style={styles.error}>
              <Feather name="alert-circle" size={15} color={colors.danger} />
              <Txt variant="caption" tone="danger" style={styles.errorText}>
                {error || neighborhoodError}
              </Txt>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
          <Button
            label={step < TOTAL_STEPS ? t.wizard.continueLabel : t.wizard.send}
            trailingIcon={step < TOTAL_STEPS ? 'arrow-right' : 'send'}
            loading={loading}
            onPress={step < TOTAL_STEPS ? advance : send}
            haptic="none"
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  header: {
    gap: space.md,
    paddingHorizontal: layout.gutter,
    paddingBottom: space.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  headerTitle: { flex: 1, minWidth: 0 },
  stepPill: {
    ...squircle,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.primaryTint,
    paddingHorizontal: space.sm,
  },
  body: {
    paddingHorizontal: layout.gutter,
    paddingTop: space.lg,
    paddingBottom: space['2xl'],
  },
  stepText: { marginTop: space.xs, maxWidth: 400 },
  stepBody: { gap: space.md, marginTop: space.xl },

  evidenceHead: { marginTop: space.xs },
  evidenceHint: { marginTop: 3 },
  evidenceRow: { flexDirection: 'row', gap: space.xs },

  listLoading: { alignItems: 'center', paddingVertical: space.xl },
  options: { gap: space.xs },
  option: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  optionLabel: { flex: 1, minWidth: 0 },
  locationButton: { marginTop: space.xxs },

  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginTop: space.lg,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerTint,
    padding: space.sm,
  },
  errorText: { flex: 1, minWidth: 0 },

  dock: {
    borderTopWidth: StyleSheet.hairlineWidth * 1.5,
    borderTopColor: colors.hairline,
    backgroundColor: colors.surface,
    paddingHorizontal: layout.gutter,
    paddingTop: space.md,
  },
});
