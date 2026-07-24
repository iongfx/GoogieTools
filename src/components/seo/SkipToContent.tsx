/**
 * Lets keyboard users jump past navigation (accessibility + better UX).
 * Becomes visible only when focused.
 */
export function SkipToContent() {
  return (
    <a href="#main-content" className="skip-link">
      Skip to main content
    </a>
  );
}
