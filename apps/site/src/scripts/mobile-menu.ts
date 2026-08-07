// Vanilla TS mobile menu controller.
// Looks for [data-mobile-menu-trigger] and [data-mobile-menu-panel].
// Toggles aria-expanded, hidden state, and body scroll lock.
// ESC closes; click a link closes; resize past md unlocks scroll.

const TRIGGER_SELECTOR = "[data-mobile-menu-trigger]";
const PANEL_SELECTOR = "[data-mobile-menu-panel]";
const CLOSE_SELECTOR = "[data-mobile-menu-close]";

function setOpen(trigger: HTMLElement, panel: HTMLElement, open: boolean): void {
  trigger.setAttribute("aria-expanded", String(open));
  panel.setAttribute("aria-hidden", String(!open));
  panel.classList.toggle("translate-x-full", !open);
  panel.classList.toggle("translate-x-0", open);
  document.body.classList.toggle("overflow-hidden", open);
}

function init(): void {
  const trigger = document.querySelector<HTMLElement>(TRIGGER_SELECTOR);
  const panel = document.querySelector<HTMLElement>(PANEL_SELECTOR);
  if (!trigger || !panel) return;

  trigger.addEventListener("click", () => {
    const isOpen = trigger.getAttribute("aria-expanded") === "true";
    setOpen(trigger, panel, !isOpen);
  });

  panel.querySelectorAll<HTMLElement>(CLOSE_SELECTOR).forEach((btn) => {
    btn.addEventListener("click", () => setOpen(trigger, panel, false));
  });

  panel.querySelectorAll<HTMLAnchorElement>("a").forEach((a) => {
    a.addEventListener("click", () => setOpen(trigger, panel, false));
  });

  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape") setOpen(trigger, panel, false);
  });

  const mq = window.matchMedia("(min-width: 768px)");
  mq.addEventListener("change", (e: MediaQueryListEvent) => {
    if (e.matches) setOpen(trigger, panel, false);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Marks this file as a module. Without a top-level import or export,
// TypeScript treats it as a global script, so the `init` declared in each of
// these files collides with the others ("Duplicate function implementation").
// They are already loaded as modules at runtime via `import "..."` in a
// <script> block, so this only tells the type-checker what is already true.
export {};
