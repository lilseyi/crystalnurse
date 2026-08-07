# ADR-001: Where protected health information stops

**Status:** Accepted
**Date:** 2026-08-07

## Context

Crystal Care Nursing provides skilled and non-skilled home health care. Its
operations naturally involve information about the people it cares for.

Under HIPAA, protected health information (PHI) is health information that
identifies an individual. For a home health agency this is broader than it first
appears: a client's **name and address alone are PHI**, because the fact that
someone receives home health care is itself health information. There's no
"just the contact details" carve-out.

Handling PHI in a software system brings requirements that don't apply to
ordinary business software — among them a signed Business Associate Agreement
with every vendor that stores or processes it, access controls and audit logging,
encryption, breach notification, and a retention policy.

The portal currently runs on:

- **Convex** — database and backend
- **Cloudflare Pages** — serves the portal
- **Resend** — sends sign-in codes
- **GitHub** — source code and deployment

**Convex does not offer a BAA on its standard plans.** Neither does Resend's
standard tier. As things stand, this stack is not configured to hold PHI, and no
amount of application code changes that.

## Decision

**The portal holds business and employment information. It does not hold
information identifying a person receiving care.**

Fine to build now:

- Staff and caregiver records, roles, employment status
- Licenses, certifications, expiry tracking
- Shift schedules, hours, timesheets, payroll preparation
- Referral *sources* (which hospital, which agency) as organisations
- Mileage, supplies, equipment, vendors
- Anything about running the business

Not without the work in the next section:

- Client or patient names, addresses, phone numbers
- Care plans, visit notes, assessments, diagnoses, medications
- Anything linking a named individual to receiving care — including a schedule
  entry naming the client being visited

This is why `shifts`-style records, if added, should carry a route or area label
("Potomac — north") rather than a client. It isn't squeamishness; it's the line.

## What crossing the line requires

Not "never" — "not by accident". Before any PHI enters this system:

1. **Vendor agreements.** A BAA with every vendor that touches the data. In
   practice this means moving to Convex's enterprise terms if available, or
   moving the PHI-holding parts to a BAA-covered platform (AWS, GCP and Azure
   all sign BAAs).
2. **Access control per record**, not just per user. Role-based access exists
   today; PHI needs "who may see *this* client".
3. **Audit logging.** Who read what, when. Required, and the current schema has
   nowhere to put it.
4. **Encryption and retention.** Encrypted at rest and in transit, with a
   defined retention and destruction policy.
5. **A risk assessment and workforce training.** Required by the Security Rule,
   and not a software task.
6. **Breach notification procedures**, written down before they're needed.

Steps 1 and 3 are the ones that force real architectural change. The rest are
policy work that has to happen anyway.

## Consequences

- The schema stays free of client identity, and every table added should be
  checked against this document.
- `apps/convex/schema.ts` carries a scope note pointing here, and `CLAUDE.md`
  instructs agents to raise this with the owner before modelling patient data.
  A non-developer asking for "a clients list" will get a flag, not a silent
  compliance problem.
- If the agency needs client records in software before this work is done, the
  right answer is a purpose-built EHR that already carries the compliance
  posture — not this portal. Scheduling and staff operations can stay here.
- Revisit if: the agency commits to a compliance program, a BAA-covered hosting
  path is chosen, or a regulatory requirement forces the question.

## References

- 45 CFR §160.103 — definition of protected health information
- 45 CFR §164.308 — administrative safeguards (risk assessment, training)
- 45 CFR §164.312 — technical safeguards (access control, audit controls)
- HHS guidance on Business Associate Agreements
