// useSharedValueArray — helper that allocates a fixed-size array of Reanimated
// SharedValue<number>s. The `count` argument MUST be a compile-time constant at
// every call site so React Hook call order stays stable across renders (the
// rules-of-hooks constraint).
//
// Extracted after plan 3 Task 11 review (M3): both useElementAnimations and
// useShapeAnimations RN hooks were duplicating this 5-liner verbatim.
// Centralizing eliminates the copy-paste and makes the hook-rules disable
// comment live in one place.

import { useSharedValue, type SharedValue } from 'react-native-reanimated';

export function useSharedValueArray(count: number): SharedValue<number>[] {
  const svs: SharedValue<number>[] = [];
  // eslint-disable-next-line react-hooks/rules-of-hooks
  for (let i = 0; i < count; i++) svs.push(useSharedValue(0));
  return svs;
}
