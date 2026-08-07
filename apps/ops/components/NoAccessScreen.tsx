import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@crystalcare/convex";
import { Button, Card, Screen } from "./ui";
import { colors, spacing } from "../theme";

/**
 * Shown to a signed-in user who hasn't been invited.
 *
 * It doubles as the first-run screen: while nobody owns the deployment yet,
 * "Claim ownership" succeeds. Once an owner exists it always fails, and this
 * becomes a plain "ask for an invite" page.
 */
export function NoAccessScreen() {
  const claimOwnership = useMutation(api.functions.members.claimOwnership);
  const { signOut } = useAuthActions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setError(null);
    setBusy(true);
    try {
      await claimOwnership({});
    } catch (e: any) {
      setError(
        e?.data?.message ??
          "Crystal Care Ops already has an owner. Ask them to invite you.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.title}>You're signed in, but not on the team yet</Text>
        <Text style={styles.body}>
          Crystal Care Ops is invite-only. Ask an owner to add your email address,
          then sign in again.
        </Text>
        <View style={styles.divider} />
        <Text style={styles.body}>
          Setting this up for the first time? If nobody owns this workspace yet,
          you can claim it.
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Claim ownership" onPress={claim} busy={busy} />
        <Button label="Sign out" variant="secondary" onPress={() => void signOut()} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "700", color: colors.deep },
  body: { fontSize: 15, color: colors.muted, lineHeight: 22 },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  error: { color: colors.danger, fontSize: 14 },
});
