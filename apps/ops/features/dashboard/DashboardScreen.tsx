import { StyleSheet, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import {
  Card,
  CodeBlock,
  Page,
  PageTitle,
  SectionHeading,
} from "../../components/ui";
import { colors, spacing } from "../../theme";

/**
 * The dashboard, empty on purpose.
 *
 * This page is the on-ramp: it exists to tell whoever opens the portal what to
 * do next. As soon as there's something real to show, replace the contents of
 * this file — the guidance below has done its job by then.
 */

const EXAMPLE_PROMPTS = [
  {
    title: "A list of something",
    prompt:
      'Add a "Clients" section to the Crystal Care Ops portal. Each client has a name, phone number, address, referral source, and a status of prospective, active, or discharged. I need to be able to add, edit, and delete them, and search by name.',
  },
  {
    title: "A spreadsheet you already keep",
    prompt:
      "I keep a spreadsheet of caregiver certifications with columns for name, certification type, and expiry date. Build that into the portal, and warn me when something is within 30 days of expiring.",
  },
  {
    title: "Something that runs on its own",
    prompt:
      "Every Monday morning, email me a summary of anything that needs attention this week. Use the connection I've set up in Settings.",
  },
];

export function DashboardScreen() {
  return (
    <Page>
      <PageTitle
        title="Dashboard"
        subtitle="Nothing here yet — that's on purpose."
      />

      <Card>
        <View style={styles.leadRow}>
          <View style={styles.leadIcon}>
            <Feather name="feather" size={18} color={colors.brand700} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.leadTitle}>
              This portal is an empty building with the power switched on
            </Text>
            <Text style={styles.body}>
              Signing in works. Deciding who else gets in works. Connecting it to
              other services works. What it doesn't have yet is any of{" "}
              <Text style={styles.bodyStrong}>your</Text> information — no
              clients, no schedules, no spreadsheets. You add those by asking for
              them.
            </Text>
          </View>
        </View>
      </Card>

      <Card>
        <SectionHeading>How to add a section</SectionHeading>
        <Text style={styles.body}>
          Open this project in Claude Code and describe what you want in plain
          English. Be specific about the pieces of information you keep — that's
          the part it can't guess.
        </Text>
        <Steps
          steps={[
            "Open a terminal in the crystalnurse folder and run: claude",
            "Describe the section you want, the way you'd explain it to a new hire.",
            "It writes the code, and the change shows up in this portal.",
            "If it isn't right, say what's wrong and ask again. Nothing here is permanent.",
          ]}
        />
      </Card>

      <Card>
        <SectionHeading>Things you could ask for</SectionHeading>
        <Text style={styles.body}>
          Copy one of these and change it to match how you actually work.
        </Text>
        {EXAMPLE_PROMPTS.map((example) => (
          <View key={example.title} style={styles.example}>
            <Text style={styles.exampleTitle}>{example.title}</Text>
            <CodeBlock>{example.prompt}</CodeBlock>
          </View>
        ))}
      </Card>

      <Card>
        <SectionHeading>Two things worth knowing</SectionHeading>
        <Text style={styles.body}>
          <Text style={styles.bodyStrong}>Keys and passwords go in Settings.</Text>{" "}
          If a section needs to talk to something outside — a Google Sheet, a
          mailing list — add the key under Settings → Connections. You shouldn't
          need to touch a config file to connect something.
        </Text>
        <Text style={styles.body}>
          <Text style={styles.bodyStrong}>Patient information is different.</Text>{" "}
          Names, addresses and conditions of people receiving care are protected
          by law, and storing them here changes what this system has to do to
          stay compliant. Before you ask for anything that holds patient details,
          read <Text style={styles.mono}>docs/architecture/ADR-001-phi-boundary.md</Text>{" "}
          — or just ask Claude Code "is what I'm about to add regulated?"
        </Text>
      </Card>
    </Page>
  );
}

function Steps({ steps }: { steps: string[] }) {
  return (
    <View style={styles.steps}>
      {steps.map((step, index) => (
        <View key={step} style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>{index + 1}</Text>
          </View>
          <Text style={[styles.body, styles.flex]}>{step}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  leadRow: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  leadIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand50,
    alignItems: "center",
    justifyContent: "center",
  },
  leadTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.deep,
    marginBottom: spacing.sm,
  },
  body: { fontSize: 15, lineHeight: 23, color: colors.muted },
  bodyStrong: { color: colors.ink, fontWeight: "700" },
  mono: { fontFamily: "Courier", fontSize: 14, color: colors.ink },

  steps: { gap: spacing.md },
  step: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.sand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepNumberText: { fontSize: 12, fontWeight: "700", color: colors.muted },

  example: { gap: spacing.xs },
  exampleTitle: { fontSize: 14, fontWeight: "700", color: colors.ink },
});
