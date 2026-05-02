import { useContext } from 'react';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';

export function useOptionalBottomTabBarHeight(fallback = 0) {
  const height = useContext(BottomTabBarHeightContext);
  return typeof height === 'number' ? height : fallback;
}
