// Progressive-enhancement Ajax submit for the Formspree contact form.
//
// Posts the form via fetch (Accept: application/json) so the visitor stays on
// the page and sees an inline success/error message instead of being redirected
// to Formspree's own thank-you page. If JavaScript is disabled, the form's
// native action/method still submits normally as a fallback.

interface FormspreeError {
  field?: string;
  message: string;
}

function init(): void {
  const form = document.querySelector<HTMLFormElement>("#contact-form");
  if (!form) return;

  const errorBox = form.querySelector<HTMLElement>("[data-form-error]");
  const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const successPanel = document.querySelector<HTMLElement>("[data-form-success]");

  const showError = (message: string): void => {
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.hidden = false;
  };

  form.addEventListener("submit", async (event: SubmitEvent) => {
    event.preventDefault();
    if (errorBox) errorBox.hidden = true;

    const originalLabel = submitBtn?.textContent ?? "Send message";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";
    }

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });

      if (response.ok) {
        form.reset();
        form.hidden = true;
        if (successPanel) {
          successPanel.hidden = false;
          successPanel.focus?.();
        }
        return;
      }

      const payload = (await response.json().catch(() => null)) as
        | { errors?: FormspreeError[] }
        | null;
      const message =
        payload?.errors?.map((e) => e.message).join(" ") ??
        "Something went wrong. Please try again, or give us a call.";
      showError(message);
    } catch {
      showError("Network error. Please check your connection and try again.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
