import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { CONTENT_MAX_WIDTH, colors, radius, spacing } from "../theme";

/**
 * The small set of pieces every page is built from.
 *
 * Deliberately minimal. When you need something new, add it here rather than
 * styling inside a page — that's what keeps ten pages looking like one portal
 * instead of ten.
 */

/** Wraps a page's contents and caps the width. Use this on every page. */
export function Page({ children }: { children: ReactNode }) {
  return <View style={styles.page}>{children}</View>;
}

/** For screens that render OUTSIDE the sidebar (sign-in, no access). */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      <View style={styles.screenColumn}>{children}</View>
    </ScrollView>
  );
}

export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.pageTitle}>
      <View style={styles.flex}>
        <Text style={styles.h1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionHeading}>{children}</Text>;
}

export function Row({
  children,
  onPress,
}: {
  children: ReactNode;
  onPress?: () => void;
}) {
  if (!onPress) return <View style={styles.row}>{children}</View>;
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
    >
      {children}
    </Pressable>
  );
}

export type Tone = "neutral" | "brand" | "success" | "warning" | "danger";

const TONE_STYLES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.sand, fg: colors.muted },
  brand: { bg: colors.brand50, fg: colors.brand700 },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
};

export function Badge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  const { bg, fg } = TONE_STYLES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  busy,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  busy?: boolean;
}) {
  const isDisabled = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.buttonSecondary,
        variant === "danger" && styles.buttonDanger,
        pressed && styles.buttonPressed,
        isDisabled && styles.buttonDisabled,
      ]}
    >
      {busy ? (
        <ActivityIndicator
          color={variant === "secondary" ? colors.deep : colors.white}
        />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === "secondary" && styles.buttonTextSecondary,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  hint?: string;
  keyboardType?: "default" | "email-address" | "number-pad" | "phone-pad";
  autoCapitalize?: "none" | "words";
  secureTextEntry?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        autoCorrect={false}
      />
    </View>
  );
}

/**
 * Option picker built from pressable chips.
 *
 * Deliberately not a dropdown library: chips behave identically on web and on a
 * phone, need no dependency, and show every option at once — which is what you
 * want for short lists.
 */
export function ChipSelect<T extends string>({
  label,
  options,
  labels,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.chips}>
        {options.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {labels[option]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Monospaced block for something meant to be copied, like a prompt. */
export function CodeBlock({ children }: { children: string }) {
  return (
    <View style={styles.code}>
      <Text selectable style={styles.codeText}>
        {children}
      </Text>
    </View>
  );
}

/** Shown while a query is still loading. */
export function Loading() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={colors.brand} />
    </View>
  );
}

/** Shown when there's nothing to show — always say what to do next. */
export function Empty({ message }: { message: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: CONTENT_MAX_WIDTH, gap: spacing.lg },

  screen: { flex: 1, backgroundColor: colors.paper },
  screenContent: { padding: spacing.xl, alignItems: "center" },
  screenColumn: { width: "100%", maxWidth: 520, gap: spacing.lg },

  flex: { flex: 1 },
  pageTitle: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  h1: { fontSize: 26, fontWeight: "700", color: colors.deep },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 2 },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.muted,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.sandSoft,
  },
  rowPressed: { backgroundColor: colors.sandSoft },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeText: { fontSize: 12, fontWeight: "600" },
  button: {
    backgroundColor: colors.deep,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  buttonSecondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDanger: { backgroundColor: colors.danger },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: colors.white, fontSize: 15, fontWeight: "600" },
  buttonTextSecondary: { color: colors.deep },

  field: { gap: spacing.xs },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.ink },
  fieldHint: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipSelected: { backgroundColor: colors.deep, borderColor: colors.deep },
  chipText: { fontSize: 13, color: colors.muted, fontWeight: "600" },
  chipTextSelected: { color: colors.white },

  code: {
    backgroundColor: colors.sandSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  codeText: {
    fontFamily: "Courier",
    fontSize: 13,
    lineHeight: 20,
    color: colors.ink,
  },

  centered: { paddingVertical: spacing.xxl, alignItems: "center" },
  empty: { paddingVertical: spacing.xl, alignItems: "center" },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: "center" },
});
