# Whisper — Terracotta Design System
## React Native Color & Component Strategy

---

## 1. Installation

```bash
# Gradient backgrounds and buttons
npx expo install expo-linear-gradient

# Multi-layer shadows (replaces CSS box-shadow stacking)
npm install react-native-shadow-2

# Spring animations, press states, hover-equivalent gestures
npm install react-native-reanimated
npm install react-native-gesture-handler
```

Add to `babel.config.js`:
```js
plugins: ['react-native-reanimated/plugin']
```

---

## 2. Theme Token File

Create `src/theme/colors.ts`. This is your single source of truth — never hardcode a color anywhere else.

```ts
// src/theme/colors.ts

const terracotta = {
  // ── ACCENT (same in both modes — the brand constant) ──
  accent:        '#C4622A',
  accentHover:   '#D4742A',  // +10% brightness — use for pressed highlight
  accentPress:   '#A84E1E',  // -10% brightness — use for pressed state background
  accentShadow:  '#6A2808',  // bottom edge shadow — always ~40% darker than accent
  accentGlow:    'rgba(196, 98, 42, 0.28)',
};

export const darkTheme = {
  // ── BACKGROUNDS ──
  bgBase:        '#160A06',  // root screen background
  bgSurface:     '#241208',  // cards, sheets, panels
  bgRaised:      '#301808',  // modals, popovers, input fields

  // ── ACCENT ──
  ...terracotta,

  // ── TEXT ──
  textPrimary:   '#F0C090',  // headings
  textSecondary: '#9A6040',  // body, labels
  textMuted:     '#5A3020',  // placeholders, captions

  // ── BORDERS ──
  borderSubtle:  'rgba(190, 80, 30, 0.18)',
  borderMedium:  'rgba(190, 80, 30, 0.32)',

  // ── CANDLE FEATURE ──
  candleFlameTop:    '#FFA040',
  candleFlameBottom: '#FF3500',
  candleBody:        '#7A5030',
  candleBodyDark:    '#402010',

  // ── VOICE RING ──
  voiceRingCore: '#D07040',
  voiceRingGlow: 'rgba(208, 112, 64, 0.3)',

  // ── PATH NODES ──
  nodeDefault:   '#301808',
  nodeBorder:    'rgba(190, 80, 30, 0.45)',
  nodeActive:    '#C4622A',
  nodeConnector: 'rgba(180, 70, 20, 0.25)',
};

export const lightTheme = {
  // ── BACKGROUNDS ──
  bgBase:        '#F5EAE0',
  bgSurface:     '#EDD5C0',
  bgRaised:      '#E4C4A8',

  // ── ACCENT ──
  ...terracotta,
  accentShadow:  '#7A3010',  // slightly adjusted for light mode legibility

  // ── TEXT ──
  textPrimary:   '#6B2D14',
  textSecondary: '#9A6040',
  textMuted:     '#C4A080',

  // ── BORDERS ──
  borderSubtle:  'rgba(160, 70, 30, 0.15)',
  borderMedium:  'rgba(160, 70, 30, 0.28)',

  // ── CANDLE FEATURE ──
  candleFlameTop:    '#FFB040',
  candleFlameBottom: '#FF4000',
  candleBody:        '#C87848',
  candleBodyDark:    '#9A5028',

  // ── VOICE RING ──
  voiceRingCore: '#B84820',
  voiceRingGlow: 'rgba(184, 72, 32, 0.25)',

  // ── PATH NODES ──
  nodeDefault:   '#F0D0B8',
  nodeBorder:    '#B84820',
  nodeActive:    '#B84820',
  nodeConnector: 'rgba(160, 60, 20, 0.2)',
};

export type Theme = typeof darkTheme;
```

---

## 3. Theme Context

```tsx
// src/theme/ThemeContext.tsx
import React, { createContext, useContext, useState } from 'react';
import { darkTheme, lightTheme, Theme } from './colors';

type ThemeContextType = {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: darkTheme,
  isDark: true,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDark, setIsDark] = useState(true);
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme: () => setIsDark(p => !p) }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
```

Wrap your root in `App.tsx`:
```tsx
export default function App() {
  return (
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer>
          {/* your navigator */}
        </NavigationContainer>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}
```

---

## 4. Background Gradient

The screen background transitions from `bgBase` → `bgSurface` → `bgRaised` diagonally. This creates depth — never use a flat background color.

```tsx
// src/components/ScreenBackground.tsx
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export const ScreenBackground = ({ children }: { children: React.ReactNode }) => {
  const { theme } = useTheme();

  return (
    <LinearGradient
      colors={[theme.bgBase, theme.bgBase, theme.bgSurface, theme.bgRaised]}
      locations={[0, 0.4, 0.75, 1]}  // hold bgBase for 40% before transitioning
      start={{ x: 0, y: 0 }}
      end={{ x: 0.6, y: 1 }}          // diagonal — feels like natural light
      style={StyleSheet.absoluteFill}
    >
      {children}
    </LinearGradient>
  );
};
```

**Why `locations: [0, 0.4, 0.75, 1]`?** Holding the base color for the first 40% before transitioning reads as ambient light, not a cheap gradient. Most developers transition too early.

For **cards**, use a smaller version:
```tsx
<LinearGradient
  colors={[theme.bgSurface, theme.bgRaised]}
  start={{ x: 0, y: 0 }}
  end={{ x: 0.5, y: 1 }}
  style={styles.card}
>
  {children}
</LinearGradient>
```

This makes cards look lighter than the page behind them — the brain reads it as a raised surface under ambient light.

---

## 5. Elevated Primary Button

React Native only supports one shadow layer natively. Use `react-native-shadow-2` for the bloom glow and fake the hard bottom edge with a positioned view.

```tsx
// src/components/buttons/PrimaryButton.tsx
import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Shadow } from 'react-native-shadow-2';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeContext';
import { springs } from '../../theme/springs';

const AnimatedView = Animated.createAnimatedComponent(View);

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export const PrimaryButton = ({ label, onPress, disabled }: Props) => {
  const { theme } = useTheme();
  const pressed = useSharedValue(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      // Sinks DOWN on press — simulates pushing a physical block into the surface
      { translateY: withSpring(pressed.value ? 4 : 0, springs.bouncy) },
      { scale: withSpring(pressed.value ? 0.97 : 1, springs.bouncy) },
    ],
  }));

  return (
    <View style={{ position: 'relative' }}>

      {/* Hard bottom edge — the "thickness" of the button block */}
      {/* Stays in place while the button above sinks into it on press */}
      <View style={[
        styles.bottomEdge,
        { backgroundColor: theme.accentShadow }
      ]} />

      {/* Soft glow bloom beneath the button */}
      <Shadow
        distance={12}
        startColor={theme.accentGlow}
        endColor="transparent"
        offset={[0, 6]}
        style={{ borderRadius: 16 }}
      >
        <AnimatedView style={animatedStyle}>
          <Pressable
            onPressIn={() => { pressed.value = true; }}
            onPressOut={() => { pressed.value = false; }}
            onPress={onPress}
            disabled={disabled}
          >
            {/* Gradient fill — lighter top fakes a lit surface */}
            <LinearGradient
              colors={[theme.accentHover, theme.accentPress]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[styles.gradient, { opacity: disabled ? 0.5 : 1 }]}
            >
              <Text style={styles.label}>{label}</Text>
            </LinearGradient>
          </Pressable>
        </AnimatedView>
      </Shadow>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomEdge: {
    position: 'absolute',
    bottom: -4,       // shift down to peek below the button
    left: 0, right: 0,
    height: '100%',
    borderRadius: 16,
  },
  gradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  label: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
```

**The three elevation layers explained:**

| Layer | How it's built | What the eye sees |
|---|---|---|
| Hard bottom edge | `position: absolute`, `bottom: -4`, darker color, same border-radius | Physical thickness — the button looks like a block |
| Soft glow | `react-native-shadow-2` with accent color at 28% opacity | The button "glows" onto the surface below it |
| Gradient fill | `expo-linear-gradient`, lighter top → darker bottom | Light hitting the face of the button — adds surface depth |

When the button is pressed, `translateY: 4` moves only the gradient + label down, while the bottom edge stays put — the button visually sinks into its own shadow.

---

## 6. Press Animation — Spring Config

```ts
// src/theme/springs.ts

export const springs = {
  // Bouncy — button press, node unlock, candle light
  bouncy: {
    damping: 10,
    stiffness: 180,
    mass: 0.7,
  },
  // Snappy — tab switches, panel slides
  snappy: {
    damping: 18,
    stiffness: 280,
    mass: 0.5,
  },
  // Gentle — theme toggle, background fades
  gentle: {
    damping: 20,
    stiffness: 120,
    mass: 1.0,
  },
};
```

**On mobile there is no hover.** The full interaction maps to:

| Web CSS state | React Native equivalent |
|---|---|
| `:hover` enter | `onPressIn` |
| `:hover` hold | between `onPressIn` and `onPressOut` |
| `:active` | same as above |
| click | `onPress` (fires on finger release) |
| `:hover` leave | `onPressOut` |

Animation flow: **finger down → button sinks (`translateY +4`, `scale 0.97`) → finger lifts → spring overshoots slightly past 0 → settles.** The overshoot is what makes it feel alive. It comes from `damping: 10` — lower damping = more bounce.

---

## 7. Four Button Roles in React Native

### Role 1 — PRIMARY
One per screen. Elevated, spring animation, gradient fill.

```tsx
<PrimaryButton label="Start today's call 🕯️" onPress={handleCall} />
// Visual: gradient fill + glow shadow + bottom edge + spring press-down
```

---

### Role 2 — SECONDARY
Supporting action. No elevation. Semi-transparent fill + border.

```tsx
// src/components/buttons/SecondaryButton.tsx
export const SecondaryButton = ({ label, onPress }: Props) => {
  const { theme } = useTheme();
  const pressed = useSharedValue(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(pressed.value ? 0.97 : 1, springs.snappy) }],
    opacity: withSpring(pressed.value ? 0.7 : 1, springs.snappy),
  }));

  return (
    <AnimatedPressable
      onPressIn={() => { pressed.value = true; }}
      onPressOut={() => { pressed.value = false; }}
      onPress={onPress}
      style={[animatedStyle, {
        backgroundColor: `${theme.accent}14`,   // 8% opacity fill
        borderWidth: 2,
        borderColor: theme.borderMedium,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 22,
        alignItems: 'center',
      }]}
    >
      <Text style={{ color: theme.accent, fontWeight: '600', fontSize: 15 }}>
        {label}
      </Text>
    </AnimatedPressable>
  );
};

<SecondaryButton label="View journey" onPress={handleMap} />
```

---

### Role 3 — GHOST
Escape hatches only. Fades on press, no background.

```tsx
// src/components/buttons/GhostButton.tsx
export const GhostButton = ({ label, onPress }: Props) => {
  const { theme } = useTheme();
  const pressed = useSharedValue(false);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withSpring(pressed.value ? 0.4 : 1, springs.gentle),
    transform: [{ scale: withSpring(pressed.value ? 0.95 : 1, springs.gentle) }],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => { pressed.value = true; }}
      onPressOut={() => { pressed.value = false; }}
      onPress={onPress}
      style={[animatedStyle, {
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignItems: 'center',
      }]}
    >
      <Text style={{ color: theme.textMuted, fontWeight: '600', fontSize: 14 }}>
        {label}
      </Text>
    </AnimatedPressable>
  );
};

<GhostButton label="Not now" onPress={handleDismiss} />
```

---

### Role 4 — ICON BUTTON
Circular, compact. For mic toggle, candle on/off, back arrow.

```tsx
// src/components/buttons/IconButton.tsx
export const IconButton = ({ icon, onPress, active = false }: Props) => {
  const { theme } = useTheme();
  const pressed = useSharedValue(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(pressed.value ? 0.88 : 1, springs.bouncy) }],
  }));

  return (
    <Shadow
      distance={active ? 8 : 3}
      startColor={active ? theme.accentGlow : 'rgba(0,0,0,0.18)'}
      style={{ borderRadius: 999 }}
    >
      <AnimatedPressable
        onPressIn={() => { pressed.value = true; }}
        onPressOut={() => { pressed.value = false; }}
        onPress={onPress}
        style={[animatedStyle, {
          width: 48, height: 48,
          borderRadius: 24,
          backgroundColor: active ? theme.accent : theme.bgRaised,
          borderWidth: 1.5,
          borderColor: active ? 'transparent' : theme.borderSubtle,
          alignItems: 'center',
          justifyContent: 'center',
        }]}
      >
        {icon}
      </AnimatedPressable>
    </Shadow>
  );
};
```

---

## 8. Button Hierarchy Rule

```
Per-screen checklist:
  ✅  1  PRIMARY    — the core task (call, save, continue)
  ✅  1–2 SECONDARY — alternative paths (view map, see history)
  ✅  1  GHOST      — escape / low priority (not now, skip)
  ✅  N  ICON       — utility only (mic, candle, back)

  ❌  Never 2 PRIMARY buttons on the same screen
  ❌  Never use GHOST for an action the user needs to complete their task
  ❌  Never put the same label on PRIMARY and SECONDARY
```

---

## 9. Token Quick Reference

| Token | Dark | Light | Use |
|---|---|---|---|
| `bgBase` | `#160A06` | `#F5EAE0` | Screen root background |
| `bgSurface` | `#241208` | `#EDD5C0` | Cards, sheets |
| `bgRaised` | `#301808` | `#E4C4A8` | Modals, inputs |
| `accent` | `#C4622A` | `#C4622A` | Primary CTA — identical both modes |
| `accentShadow` | `#6A2808` | `#7A3010` | Button bottom edge |
| `accentGlow` | `rgba(196,98,42,0.28)` | `rgba(196,98,42,0.2)` | Shadow bloom |
| `textPrimary` | `#F0C090` | `#6B2D14` | Headings |
| `textSecondary` | `#9A6040` | `#9A6040` | Body — same both modes |
| `textMuted` | `#5A3020` | `#C4A080` | Placeholders, ghost labels |
| `borderSubtle` | `rgba(190,80,30,0.18)` | `rgba(160,70,30,0.15)` | Card outlines |

The accent color `#C4622A` is the same in both modes. It's the one constant that ties dark and light together as the same brand.

---

## 10. Recommended File Structure

```
src/
├── theme/
│   ├── colors.ts           ← all tokens (dark + light)
│   ├── springs.ts          ← reanimated spring configs
│   ├── typography.ts       ← font sizes, weights, line heights
│   └── ThemeContext.tsx    ← provider + useTheme hook
├── components/
│   ├── ScreenBackground.tsx
│   └── buttons/
│       ├── PrimaryButton.tsx
│       ├── SecondaryButton.tsx
│       ├── GhostButton.tsx
│       └── IconButton.tsx
```

**Rule:** If you find yourself writing a hex code inside a screen component, it belongs in `colors.ts` instead.
