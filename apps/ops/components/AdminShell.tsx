import type { ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { usePathname, useRouter } from "expo-router";
import { colors, radius, spacing } from "../theme";

/**
 * The frame every page sits in: navigation down the left, the page on the right.
 *
 * ── Adding a page to the sidebar ────────────────────────────────────────────
 * Add one line to NAV_ITEMS below, and create the matching file in
 * apps/ops/app/(app)/. A `href` of "/clients" means the file
 * apps/ops/app/(app)/clients.tsx. That's the whole wiring.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Below 900px wide (a phone, or a narrow window) the sidebar becomes a row of
 * icons across the top, so the same code works on a laptop and a phone.
 */

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentProps<typeof Feather>["name"];
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "grid" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

const WIDE_BREAKPOINT = 900;

export function AdminShell({
  children,
  userEmail,
  userName,
}: {
  children: ReactNode;
  userEmail?: string;
  userName?: string;
}) {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  return (
    <View style={[styles.shell, isWide ? styles.shellWide : styles.shellNarrow]}>
      <Nav isWide={isWide} userEmail={userEmail} userName={userName} />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
      >
        {children}
      </ScrollView>
    </View>
  );
}

function Nav({
  isWide,
  userEmail,
  userName,
}: {
  isWide: boolean;
  userEmail?: string;
  userName?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View style={[styles.nav, isWide ? styles.navWide : styles.navNarrow]}>
      {isWide ? (
        <View style={styles.brand}>
          <Text style={styles.brandText}>Crystal Care</Text>
        </View>
      ) : null}

      <View style={isWide ? styles.navItems : styles.navItemsRow}>
        {NAV_ITEMS.map((item) => {
          // "/" only matches exactly; anything else matches its own subpages.
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            // A plain Pressable rather than `<Link asChild>`: on react-native-web
            // the Link's anchor wrapper drops the child's style prop, which
            // silently flattened these rows into unstyled stacked text.
            <Pressable
              key={item.href}
              onPress={() => router.navigate(item.href as any)}
              style={({ pressed }) => [
                styles.navItem,
                !isWide && styles.navItemNarrow,
                active && styles.navItemActive,
                pressed && styles.navItemPressed,
              ]}
            >
              {active && isWide ? <View style={styles.activeBar} /> : null}
              <Feather
                name={item.icon}
                size={18}
                color={active ? colors.deep : colors.muted}
              />
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isWide && (userEmail || userName) ? (
        <View style={styles.user}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(userName ?? userEmail ?? "?").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userText}>
            <Text style={styles.userName} numberOfLines={1}>
              {userName ?? userEmail}
            </Text>
            {userName ? (
              <Text style={styles.userEmail} numberOfLines={1}>
                {userEmail}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.paper },
  shellWide: { flexDirection: "row" },
  shellNarrow: { flexDirection: "column" },

  nav: { backgroundColor: colors.white, borderColor: colors.border },
  navWide: {
    width: 232,
    borderRightWidth: 1,
    paddingVertical: spacing.xl,
    justifyContent: "space-between",
  },
  navNarrow: {
    borderBottomWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },

  brand: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  brandText: { fontSize: 19, fontWeight: "700", color: colors.deep },

  navItems: { gap: 2, flex: 1 },
  navItemsRow: { flexDirection: "row", justifyContent: "space-around" },

  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  navItemNarrow: {
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  navItemActive: { backgroundColor: colors.brand50 },
  navItemPressed: { backgroundColor: colors.sandSoft },
  activeBar: {
    position: "absolute",
    left: 0,
    top: 6,
    bottom: 6,
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.deep,
  },
  navLabel: { fontSize: 15, color: colors.muted, fontWeight: "500" },
  navLabelActive: { color: colors.deep, fontWeight: "700" },

  user: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingTop: spacing.lg,
    marginHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.brand100,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.brand700, fontWeight: "700", fontSize: 14 },
  userText: { flex: 1 },
  userName: { fontSize: 13, fontWeight: "600", color: colors.ink },
  userEmail: { fontSize: 12, color: colors.muted },

  content: { flex: 1 },
  contentInner: { padding: spacing.xxl, paddingBottom: 64 },
});
