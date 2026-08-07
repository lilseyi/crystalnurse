import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@crystalcare/convex";
import {
  ALLOWED_EMAIL_DOMAINS,
  MEMBER_ROLES,
  MEMBER_ROLE_DESCRIPTIONS,
  MEMBER_ROLE_LABELS,
  type MemberRole,
} from "@crystalcare/shared";
import {
  Badge,
  Button,
  Card,
  ChipSelect,
  Empty,
  Loading,
  Page,
  PageTitle,
  Row,
  SectionHeading,
  TextField,
} from "../../components/ui";
import { colors, spacing } from "../../theme";

/** Access, connections, and signing out. */
export function SettingsScreen() {
  const me = useQuery(api.functions.members.me, {});
  const isOwner = me?.role === "owner";

  return (
    <Page>
      <PageTitle
        title="Settings"
        subtitle={me ? `Signed in as ${me.email}` : undefined}
      />

      <AccessCard isOwner={isOwner} myEmail={me?.email} />
      {isOwner ? <InviteCard /> : null}
      <ConnectionsCard isOwner={isOwner} />
      <AccountCard />
    </Page>
  );
}

function AccessCard({
  isOwner,
  myEmail,
}: {
  isOwner: boolean;
  myEmail?: string;
}) {
  const members = useQuery(api.functions.members.list, {});
  const remove = useMutation(api.functions.members.remove);

  return (
    <Card>
      <SectionHeading>Who has access</SectionHeading>
      <Text style={styles.note}>
        Only {ALLOWED_EMAIL_DOMAINS.map((domain) => `@${domain}`).join(" and ")}{" "}
        addresses can sign in, and only the people listed here can see anything.
      </Text>
      {members === undefined ? (
        <Loading />
      ) : members.length === 0 ? (
        <Empty message="Nobody yet." />
      ) : (
        members.map((member) => (
          <Row key={member._id}>
            <View style={styles.grow}>
              <Text style={styles.rowTitle}>{member.name ?? member.email}</Text>
              <Text style={styles.rowMeta}>
                {member.name ? member.email : null}
                {member.userId ? "" : " · invited, hasn't signed in yet"}
              </Text>
            </View>
            <Badge
              label={MEMBER_ROLE_LABELS[member.role as MemberRole]}
              tone={member.role === "owner" ? "brand" : "neutral"}
            />
            {isOwner && member.email !== myEmail ? (
              <Button
                label="Remove"
                variant="secondary"
                onPress={() => void remove({ memberId: member._id })}
              />
            ) : null}
          </Row>
        ))
      )}
    </Card>
  );
}

function InviteCard() {
  const invite = useMutation(api.functions.members.invite);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<MemberRole>("manager");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email.trim()) {
      setError("An email address is required.");
      return;
    }
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      await invite({ email, name: name.trim() || undefined, role });
      setMessage(`${email.trim()} can now sign in with their own email code.`);
      setEmail("");
      setName("");
    } catch (e: any) {
      setError(e?.data?.message ?? "Couldn't grant access.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <SectionHeading>Give someone access</SectionHeading>
      <Text style={styles.note}>
        There's no invitation email. Adding an address here is what grants
        access — then tell them to open the portal and sign in with it.
      </Text>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder={`someone@${ALLOWED_EMAIL_DOMAINS[0]}`}
      />
      <TextField
        label="Name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        placeholder="optional"
      />
      <ChipSelect
        label="Role"
        options={MEMBER_ROLES}
        labels={MEMBER_ROLE_LABELS}
        value={role}
        onChange={setRole}
      />
      <Text style={styles.note}>{MEMBER_ROLE_DESCRIPTIONS[role]}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}
      <Button label="Grant access" onPress={submit} busy={busy} />
    </Card>
  );
}

/**
 * Connections — the whole point of which is that adding one never requires a
 * developer. Paste a key here and any future section can use it.
 */
function ConnectionsCard({ isOwner }: { isOwner: boolean }) {
  const connections = useQuery(api.functions.connections.list, {});
  const save = useMutation(api.functions.connections.save);
  const remove = useMutation(api.functions.connections.remove);

  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!label.trim() || !value.trim()) {
      setError("A name and a value are both required.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      // Derive the machine name from the label unless one was typed, so nobody
      // has to think about naming conventions to save a key.
      await save({
        key: key.trim() || label.trim(),
        label: label.trim(),
        value: value.trim(),
        isSecret: true,
      });
      setLabel("");
      setKey("");
      setValue("");
      setAdding(false);
    } catch (e: any) {
      setError(e?.data?.message ?? "Couldn't save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <View style={styles.cardHeader}>
        <SectionHeading>Connections</SectionHeading>
        {isOwner ? (
          <Button
            label={adding ? "Cancel" : "Add a connection"}
            variant="secondary"
            onPress={() => setAdding((open) => !open)}
          />
        ) : null}
      </View>
      <Text style={styles.note}>
        Keys and passwords for other services. Add one here and any part of the
        portal can use it — you don't need to edit a file or redeploy anything.
        Saved values are hidden after you save them; to change one, save it again.
      </Text>

      {adding ? (
        <View style={styles.form}>
          <TextField
            label="Name"
            value={label}
            onChangeText={setLabel}
            placeholder="Google Sheets API key"
          />
          <TextField
            label="Value"
            value={value}
            onChangeText={setValue}
            placeholder="paste the key here"
            autoCapitalize="none"
            secureTextEntry
          />
          <TextField
            label="Reference name"
            value={key}
            onChangeText={setKey}
            autoCapitalize="none"
            placeholder="optional"
            hint="What code calls this. Leave blank and it's made from the name."
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Save connection" onPress={submit} busy={busy} />
        </View>
      ) : null}

      {connections === undefined ? (
        <Loading />
      ) : connections.length === 0 ? (
        <Empty message="Nothing connected yet." />
      ) : (
        connections.map((connection) => (
          <Row key={connection._id}>
            <View style={styles.grow}>
              <Text style={styles.rowTitle}>{connection.label}</Text>
              <Text style={styles.rowMeta}>
                {connection.key} · {connection.preview}
              </Text>
            </View>
            {isOwner ? (
              <Button
                label="Remove"
                variant="secondary"
                onPress={() => void remove({ connectionId: connection._id })}
              />
            ) : null}
          </Row>
        ))
      )}
    </Card>
  );
}

function AccountCard() {
  const { signOut } = useAuthActions();
  return (
    <Card>
      <SectionHeading>Account</SectionHeading>
      <Button label="Sign out" variant="secondary" onPress={() => void signOut()} />
    </Card>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: "600", color: colors.ink },
  rowMeta: { fontSize: 13, color: colors.muted },
  note: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  error: { color: colors.danger, fontSize: 14 },
  success: { color: colors.success, fontSize: 14 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  form: {
    gap: spacing.md,
    backgroundColor: colors.sandSoft,
    borderRadius: 10,
    padding: spacing.lg,
  },
});
