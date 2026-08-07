# Building out the portal

For whoever runs Crystal Care. You don't need to know how to code to read this.

## What you have

Two things live in this project:

- **crystalnurse.com** — the public website. Already done.
- **admin.crystalnurse.com** — the admin portal. Working, but empty.

The portal knows how to do three things: let the right people sign in, keep
other people out, and hold keys for connecting to other services. It doesn't yet
hold any of your information. That's the part you add.

## How you add to it

You talk to it. Specifically, you open Claude Code in this folder and describe
what you want.

```bash
cd ~/Code/crystalnurse
claude
```

Then say what you want in ordinary English:

> Add a Clients section. Each client has a name, a phone number, an address,
> who referred them, and a status of prospective, active, or discharged. I need
> to add them, edit them, and search by name.

It'll write the code and tell you when it's ready. Refresh the portal and the
new section is in the sidebar.

If it isn't right, say so:

> The status options are wrong. They should be inquiry, assessment, active, and
> closed. And I need a field for the date they started.

Nothing you do here is permanent. Every change is recorded and can be undone.

## Asking for a change vs. making it live

These are two separate steps, on purpose.

**When you ask for a change**, it gets built and put up for review — but the
real site and the real portal don't change yet. You'll get a link to look at
what was done. Nothing your clients or staff see has moved.

**When you're happy with it, say so:**

> Make it live

or "publish it", "ship it", "put it up" — any of those. *Then* it goes out, and
the website and portal update themselves a few minutes later.

The gap between the two is deliberate. It means you can ask for something,
look at it, change your mind, and ask again — without anything half-finished
ever appearing on crystalnurse.com.

If you want something to go straight out, just say both at once:

> Fix the phone number on the contact page and make it live.

## What makes a good request

The thing Claude can't guess is **how your business actually works**. So be
specific about that, and don't worry about anything else.

Good:

> I keep a spreadsheet for caregiver certifications. Columns are: caregiver
> name, certification type (CNA, CPR, TB test, background check), the date it
> was issued, and the date it expires. I need to see at a glance who's about to
> expire, and I want a warning 30 days ahead.

Less useful:

> Add a certifications table with an index.

The first one describes your work. The second one describes a database, which
is the part you're allowed to not care about.

### Things worth mentioning when you ask

- **What each record has** — the columns of your spreadsheet.
- **Which fields are a fixed list of choices**, and what the choices are.
- **Who should see it.** Everyone? Only you?
- **What should happen automatically.** "Warn me", "email me every Monday",
  "flag anything over 30 days old".

## Connecting to other services

If a new section needs to talk to something outside — Google Sheets, a mailing
list, an accounting tool — that service will give you a key (a long string of
letters and numbers).

**Don't paste it into a chat or a file.** Put it in the portal:
**Settings → Connections → Add a connection**. Give it a name you'll recognise,
paste the value, save. Then tell Claude Code the name you used:

> Use the "Google Sheets API key" connection I added in Settings.

Once saved, the value is hidden — you'll only see the last four characters. To
change it, save it again. See [CONNECTIONS.md](./CONNECTIONS.md).

## Who can get in

Two locks, and both have to open:

1. The email address ends in **@crystalnurse.com**. Nothing else can sign in,
   ever.
2. The address has been **added under Settings → Who has access**.

To let someone in: Settings → Give someone access → their email and a role.
There's no invitation email — adding them *is* the invitation. Tell them to open
admin.crystalnurse.com and sign in with that address; they'll get a six-digit
code by email.

Roles:

- **Owner** — everything, including managing access and connections.
- **Manager** — can add and change records, can't manage access.
- **Viewer** — can look, can't change anything.

## One thing to be careful about

This is a healthcare business, and information about the people you care for —
their names, addresses, conditions, even the fact that they're a client — is
protected by law in a way that staff and business information is not. Putting
that kind of information into this system brings real legal obligations with it.

It's not a "never". It's a "decide it on purpose". Before you ask for anything
holding patient details, ask:

> Is what I'm about to add regulated health information? What would it mean for
> this system?

Claude Code has been told to raise this with you. The reasoning is written down
in [ADR-001](./architecture/ADR-001-phi-boundary.md) if you want the detail.

## When something breaks

Say what you saw:

> I clicked Save on the client form and nothing happened.

That's enough. You don't need to find the cause — describing what you did and
what happened is the useful part.
