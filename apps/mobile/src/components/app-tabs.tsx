import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[(scheme ?? 'light') as 'light' | 'dark'];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      {/* NativeTabs.Trigger.Label/.Icon not available in expo-router v6 */}
      <NativeTabs.Trigger name="index" />
      <NativeTabs.Trigger name="explore" />
    </NativeTabs>
  );
}
