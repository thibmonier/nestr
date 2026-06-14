/** Primitives UI Nestr (RN) dérivées du design system desktop. */
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { useTheme, type Palette } from "../theme";

type ButtonVariant = "primary" | "ghost" | "danger";

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { palette: p } = useTheme();
  const isPrimary = variant === "primary";
  const isDanger = variant === "danger";
  const bg = isPrimary ? p.accent : isDanger ? "transparent" : "transparent";
  const fg = isPrimary ? p.onAccent : isDanger ? p.danger : p.accentText;
  const border = isPrimary ? p.accent : isDanger ? p.danger : p.border;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bg,
          borderColor: border,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <Text style={[styles.btnLabel, { color: fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  const { palette: p } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: p.card, borderColor: p.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Badge({
  text,
  bg,
  fg,
}: {
  text: string;
  bg: string;
  fg: string;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{text}</Text>
    </View>
  );
}

export function Field({
  label,
  ...rest
}: { label?: string } & TextInputProps) {
  const { palette: p } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text style={[styles.fieldLabel, { color: p.textMuted }]}>{label}</Text>
      ) : null}
      <TextInput
        placeholderTextColor={p.textSubtle}
        {...rest}
        style={[
          styles.input,
          {
            backgroundColor: p.card,
            borderColor: p.border,
            color: p.textBody,
          },
          rest.style,
        ]}
      />
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { palette: p } = useTheme();
  return (
    <View style={[styles.segment, { backgroundColor: p.sunken, borderColor: p.border }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[
              styles.segmentItem,
              active && { backgroundColor: p.card },
            ]}
          >
            <Text
              style={{
                color: active ? p.accentText : p.textMuted,
                fontWeight: active ? "600" : "500",
                fontSize: 13,
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  const { palette: p } = useTheme();
  return (
    <View style={styles.empty}>
      <Text style={[styles.emptyTitle, { color: p.textMuted }]}>{title}</Text>
      {hint ? (
        <Text style={[styles.emptyHint, { color: p.textSubtle }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

type PrioKey = keyof Palette["prio"];

export function prioStyle(p: Palette, prio: string): { bg: string; fg: string } {
  const key: PrioKey = ["urgent", "high", "medium", "low"].includes(prio)
    ? (prio as PrioKey)
    : "low";
  return p.prio[key];
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  btnLabel: { fontSize: 15, fontWeight: "600" },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 11, fontWeight: "600" },
  fieldLabel: { fontSize: 13, fontWeight: "500" },
  input: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  segment: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: "center",
  },
  empty: { alignItems: "center", paddingVertical: 48, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: "600" },
  emptyHint: { fontSize: 13, textAlign: "center" },
});
