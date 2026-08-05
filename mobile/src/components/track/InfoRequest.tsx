import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { submitCitizenInfo, type MediaAttachment } from '@/api';
import { useI18n } from '@/i18n';
import {
  Button,
  Card,
  Field,
  Txt,
  colors,
  radius,
  space,
  squircle,
  tap,
} from '@/design';

const MAX_IMAGES = 5;

/**
 * Xodim so'ragan qo'shimcha ma'lumotga javob.
 *
 * Bu sikl backendda, web'da va Telegram botda allaqachon bor edi; mobil
 * ilova esa faqat holatni ko'rsatardi. Ya'ni fuqaro «hujjat kerak» degan
 * xabarni telefonida o'qib, javob berish uchun boshqa kanal qidirishga
 * majbur bo'lardi — holbuki kamera va galereya aynan shu qurilmada.
 *
 * Iliq (warning) rang ataylab: bu yagona joy bo'lib, u yerda TO'SIQ
 * fuqaroning o'zida — murojaat uning javobisiz oldinga siljimaydi.
 */
export function InfoRequest({
  ticket,
  question,
  alreadyProvided,
  onSent,
}: {
  ticket: string;
  question: string | null;
  /** Javob allaqachon yuborilgan — takror so'ramaymiz. */
  alreadyProvided: boolean;
  onSent: () => void;
}) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [images, setImages] = useState<MediaAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

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
      ...result.assets.slice(0, MAX_IMAGES - current.length).map((asset) => ({
        uri: asset.uri,
        name: asset.fileName || `hujjat-${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      })),
    ]);
  }, [images.length, t]);

  const send = useCallback(async () => {
    if (!text.trim()) {
      setError(t.track.infoEmpty);
      return;
    }
    setSending(true);
    setError('');
    try {
      await submitCitizenInfo({ ticket, text: text.trim(), images });
      tap('success');
      setSent(true);
      setText('');
      setImages([]);
      onSent();
    } catch (sendError) {
      tap('error');
      setError(sendError instanceof Error ? sendError.message : t.track.infoFailed);
    } finally {
      setSending(false);
    }
  }, [ticket, text, images, onSent, t]);

  if (sent || alreadyProvided) {
    return (
      <Card round="2xl" padded="lg" tone="alt" lift="rest" style={styles.doneCard}>
        <View style={styles.doneIcon}>
          <Feather name="check" size={16} color={colors.onDark} />
        </View>
        <Txt variant="bodyStrong" tone="success" style={styles.doneText}>
          {t.track.infoSent}
        </Txt>
      </Card>
    );
  }

  return (
    <Card round="2xl" padded="lg" lift="card" bordered={false} style={styles.card}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <Feather name="help-circle" size={18} color={colors.warning} />
        </View>
        <Txt variant="title3" style={styles.title}>
          {t.track.infoTitle}
        </Txt>
      </View>

      {question ? (
        <View style={styles.question}>
          <Txt variant="body" style={styles.questionText}>
            {question}
          </Txt>
        </View>
      ) : null}

      <Txt variant="caption" tone="secondary" style={styles.hint}>
        {t.track.infoHint}
      </Txt>

      <Field
        multiline
        value={text}
        onChangeText={setText}
        placeholder={t.track.infoPlaceholder}
        containerStyle={styles.field}
      />

      <Button
        label={images.length > 0 ? `${t.track.infoPhoto} (${images.length})` : t.track.infoPhoto}
        icon="camera"
        variant={images.length > 0 ? 'ghost' : 'outline'}
        size="md"
        onPress={pickImages}
        style={styles.photo}
      />

      {error ? (
        <View style={styles.error}>
          <Feather name="alert-circle" size={14} color={colors.danger} />
          <Txt variant="caption" tone="danger" style={styles.errorText}>
            {error}
          </Txt>
        </View>
      ) : null}

      <Button
        label={t.track.infoSend}
        trailingIcon="send"
        loading={sending}
        onPress={send}
        style={styles.send}
        haptic="none"
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.warningTint,
    borderWidth: 1.5,
    borderColor: `${colors.warning}33`,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  icon: {
    ...squircle,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  title: { flex: 1, minWidth: 0 },
  question: {
    ...squircle,
    marginTop: space.md,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  questionText: { color: colors.text },
  hint: { marginTop: space.sm },
  field: { marginTop: space.sm },
  photo: { marginTop: space.sm },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs,
    marginTop: space.sm,
  },
  errorText: { flex: 1, minWidth: 0 },
  send: { marginTop: space.md },

  doneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  doneIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: colors.success,
  },
  doneText: { flex: 1, minWidth: 0 },
});
