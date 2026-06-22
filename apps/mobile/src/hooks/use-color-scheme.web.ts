import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web.
 * useSyncExternalStore handles the server/client split cleanly: getServerSnapshot returns the
 * static default, getSnapshot returns the live value, and subscribe wires up Appearance changes.
 */
export function useColorScheme() {
  return useSyncExternalStore(
    (callback) => {
      const sub = Appearance.addChangeListener(callback);
      return () => sub.remove();
    },
    () => Appearance.getColorScheme() ?? 'light',
    () => 'light',
  );
}
