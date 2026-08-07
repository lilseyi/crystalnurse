import { useEffect } from "react";
import { Redirect, Slot } from "expo-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@crystalcare/convex";
import { AdminShell } from "../../components/AdminShell";
import { NoAccessScreen } from "../../components/NoAccessScreen";
import { Loading } from "../../components/ui";

/**
 * Two gates, in order.
 *
 * 1. Signed in?  Anyone with an allowed email address can pass this one.
 * 2. Invited?    Only someone with a `members` row gets past this one.
 *
 * The second gate matters: a Convex deployment is reachable by anyone who knows
 * its URL, so being signed in is not the same as being allowed in. The backend
 * enforces both checks independently (apps/convex/functions/members.ts) — what
 * happens here only decides which screen you see.
 */
export default function AppLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.functions.members.me, isAuthenticated ? {} : "skip");
  const linkCurrentUser = useMutation(api.functions.members.linkCurrentUser);

  // First sign-in after an invite: attach the account to the invited row, so
  // later lookups use the indexed path instead of re-matching on email.
  useEffect(() => {
    if (me) void linkCurrentUser({}).catch(() => {});
  }, [me, linkCurrentUser]);

  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (me === undefined) return <Loading />;
  if (me === null) return <NoAccessScreen />;

  return (
    <AdminShell userEmail={me.email} userName={me.name}>
      <Slot />
    </AdminShell>
  );
}
