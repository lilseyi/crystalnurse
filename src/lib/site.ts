import { asset } from "./asset";

// Single source of truth for site-wide identity, navigation, and contact data.
// Contact numbers vary by department on the original site — kept faithfully here.

export const site = {
  name: "Crystal Care Nursing",
  legalName: "Crystal Care Nursing, LLC",
  tagline: "Nurses that serve",
  license: "RSA License #: R4979",
  established: 2017,
  // Primary line advertised across the site.
  phone: { display: "301-494-1116", href: "tel:+13014941116" },
  cell: { display: "240-384-8999", href: "tel:+12403848999" },
  email: "contact@crystalnurse.com",
  formspreeId: "xrenrvgk", // Formspree form → contact@crystalnurse.com
  applyUrl: "https://tally.so/r/wdPbbo",
};

export const navLinks = [
  { label: "Home", href: asset("/") },
  { label: "Services", href: asset("/services") },
  { label: "About", href: asset("/about") },
  { label: "Apply", href: site.applyUrl, external: true },
  { label: "Resources", href: asset("/resources") },
  { label: "Contact", href: asset("/contact") },
];

export const offices = [
  { region: "Maryland", lines: ["11813 Charen Lane", "Potomac, MD 20854"] },
  { region: "Washington, DC", lines: ["1629 K St", "Washington, DC 20006"] },
];

export const resourceLinks = [
  { label: "U.S. Dept. of Health & Human Services", href: "https://www.hhs.gov" },
  { label: "National Institutes of Health", href: "https://www.nih.gov" },
  { label: "National Institute on Aging", href: "https://www.nia.nih.gov" },
  { label: "Centers for Disease Control", href: "https://www.cdc.gov" },
];
