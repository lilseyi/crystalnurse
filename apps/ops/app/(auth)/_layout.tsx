import { Redirect, Stack } from "expo-router";
import { useConvexAuth } from "convex/react";

/**
 * Signed-out routes.
 *
 * The redirect away from here is driven by auth state, NOT by the login screen
 * navigating on success. Navigating imperatively after `signIn` resolves races
 * the Convex auth state: `(app)` still sees `isAuthenticated === false` for a
 * beat and bounces straight back to `/login`, which looks like a failed sign-in
 * until you reload. Letting the state drive the redirect removes the race.
 */
export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (!isLoading && isAuthenticated) return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
