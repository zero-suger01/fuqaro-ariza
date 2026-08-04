import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/theme';

export type CabinetTab = 'home' | 'complaints' | 'new' | 'profile';

const items: { key: CabinetTab; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'home', label: 'Bosh sahifa', icon: 'home' },
  { key: 'complaints', label: 'Murojaatlar', icon: 'file-text' },
  { key: 'new', label: 'Yangi', icon: 'plus' },
  { key: 'profile', label: 'Profil', icon: 'user' },
];

export function BottomNav({ active, onChange }: { active: CabinetTab; onChange?: (tab: CabinetTab) => void }) {
  return <View style={styles.shell}>{items.map((item) => {
    const selected = active === item.key;
    return <Pressable key={item.key} style={styles.item} onPress={() => item.key === 'new' ? router.push('/complaint') : onChange?.(item.key)} accessibilityRole="button" accessibilityLabel={item.label}>
      <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}><Feather name={item.icon} size={20} color={selected ? colors.white : colors.muted} /></View>
      <Text style={[styles.label, selected && styles.labelSelected]}>{item.label}</Text>
    </Pressable>;
  })}</View>;
}

const styles = StyleSheet.create({
  shell: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 24, paddingHorizontal: 5, paddingTop: 8, paddingBottom: 9, shadowColor: '#0B3439', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  item: { flex: 1, alignItems: 'center', gap: 3, minHeight: 54, justifyContent: 'center' },
  iconWrap: { width: 36, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  iconWrapSelected: { backgroundColor: colors.teal },
  label: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  labelSelected: { color: colors.tealDark },
});
