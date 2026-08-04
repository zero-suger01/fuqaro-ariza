import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/theme';

export type CabinetTab = 'home' | 'complaints' | 'new' | 'notifications' | 'settings';
const items: { key: CabinetTab; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'home', label: 'Bosh sahifa', icon: 'home' },
  { key: 'complaints', label: 'Murojaatlar', icon: 'file-text' },
  { key: 'new', label: 'Yangi murojaat', icon: 'plus' },
  { key: 'notifications', label: 'Bildirishnomalar', icon: 'bell' },
  { key: 'settings', label: 'Sozlamalar', icon: 'settings' },
];

export function BottomNav({ active, onChange }: { active: CabinetTab; onChange?: (tab: CabinetTab) => void }) {
  return <View style={styles.shell}>{items.map((item) => {
    const selected = active === item.key;
    return <Pressable key={item.key} style={[styles.item, item.key === 'new' && styles.newItem]} onPress={() => item.key === 'new' ? router.push('/complaint') : onChange?.(item.key)} accessibilityRole="button" accessibilityLabel={item.label}>
      <View style={[styles.iconWrap, selected && styles.iconWrapSelected, item.key === 'new' && styles.newIcon]}><Feather name={item.icon} size={item.key === 'new' ? 25 : 19} color={item.key === 'new' ? colors.white : selected ? colors.teal : colors.muted} /></View>
      <Text style={[styles.label, selected && styles.labelSelected, item.key === 'new' && styles.newLabel]}>{item.key === 'new' ? 'Yangi' : item.label}</Text>
    </Pressable>;
  })}</View>;
}

const styles = StyleSheet.create({
  shell: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 27, paddingHorizontal: 4, paddingTop: 8, paddingBottom: 8, shadowColor: '#0B3439', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 7 },
  item: { flex: 1, alignItems: 'center', gap: 3, minHeight: 57, justifyContent: 'center' },
  newItem: { marginTop: -19 },
  iconWrap: { width: 38, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  iconWrapSelected: { backgroundColor: colors.mint },
  newIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.teal, borderWidth: 5, borderColor: colors.background, shadowColor: colors.teal, shadowOpacity: 0.3, shadowRadius: 9, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
  label: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  labelSelected: { color: colors.tealDark },
  newLabel: { color: colors.tealDark, fontSize: 10, fontWeight: '800' },
});
