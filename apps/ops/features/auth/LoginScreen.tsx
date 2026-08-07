import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  ALLOWED_EMAIL_DOMAINS,
  DISALLOWED_EMAIL_MESSAGE,
  isAllowedEmail,
} from "@crystalcare/shared";
import { KeyboardAwareFormContainer } from "@supa-media/core/forms";
import { colors } from "../../theme";

/**
 * OTP login for Crystal Care Ops.
 *
 * Two steps: request a one-time code for the email, then verify it.
 * Backed by @convex-dev/auth's "email" provider
 * (configured in apps/convex/auth.ts).
 */
export function LoginScreen() {
  const { signIn } = useAuthActions();

  const [step, setStep] = useState<"request" | "verify">("request");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode() {
    // Fail here rather than after a round-trip, so a typo'd personal address
    // gets an explanation instead of a code that never arrives. The backend
    // enforces the same rule independently — this check is only for the
    // message. See apps/convex/functions/members.ts.
    if (!isAllowedEmail(identifier)) {
      setError(DISALLOWED_EMAIL_MESSAGE);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signIn("email", { email: identifier.trim() });
      setStep("verify");
    } catch (e) {
      setError("Couldn't send your code. Check your email and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyCode() {
    setError(null);
    setSubmitting(true);
    try {
      await signIn("email", {
        email: identifier.trim(),
        code: code.trim(),
      });
      // No navigation here on purpose — `(auth)/_layout` redirects once Convex
      // reports the session as authenticated. See the note in that file.
    } catch (e) {
      setError("That code didn't work. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Keeps the code field above the on-screen keyboard on a phone. */}
      <KeyboardAwareFormContainer contentContainerStyle={styles.content}>
        <Text style={styles.title}>Crystal Care Ops</Text>
        <Text style={styles.subtitle}>
          {step === "request"
            ? `Sign in with your @${ALLOWED_EMAIL_DOMAINS[0]} email`
            : `Enter the code sent to ${identifier}`}
        </Text>

        {step === "request" ? (
          <TextInput
            style={styles.input}
            value={identifier}
            onChangeText={setIdentifier}
            placeholder={`you@${ALLOWED_EMAIL_DOMAINS[0]}`}
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            editable={!submitting}
          />
        ) : (
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="123456"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            editable={!submitting}
          />
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={step === "request" ? requestCode : verifyCode}
          disabled={submitting || (step === "request" ? !identifier : !code)}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {step === "request" ? "Send code" : "Verify"}
            </Text>
          )}
        </Pressable>

        {step === "verify" ? (
          <Pressable
            onPress={() => {
              setStep("request");
              setCode("");
              setError(null);
            }}
            disabled={submitting}
          >
            <Text style={styles.link}>Use a different email</Text>
          </Pressable>
        ) : null}
      </KeyboardAwareFormContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  title: { fontSize: 32, fontWeight: "700", marginBottom: 4, color: colors.deep },
  subtitle: { fontSize: 16, color: colors.muted, marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: colors.white,
    color: colors.ink,
  },
  button: {
    backgroundColor: colors.deep,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: "600" },
  link: { color: colors.brand, textAlign: "center", marginTop: 4 },
  error: { color: colors.danger, fontSize: 14 },
});
