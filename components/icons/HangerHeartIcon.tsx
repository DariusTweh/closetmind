// components/icons/HangerHeartIcon.tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';

export default function HangerHeartIcon({ size = 100, color = '#8abfa3' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Path
        d="M32 4C29.24 4 27 6.24 27 9c0 1.82 1.03 3.4 2.54 4.23.42.22.54.74.29 1.13L24 22H12a2 2 0 0 0-2 2v1c0 1.1.9 2 2 2h40a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2H40l-5.83-7.64a1 1 0 0 1 .28-1.48C35.89 11.56 37 10.03 37 8.25 37 5.35 34.65 3 32 3zm0 24s-5 3.25-5 7c0 2.76 2.24 5 5 5s5-2.24 5-5c0-3.75-5-7-5-7z"
        fill={color}
      />
    </Svg>
  );
}
