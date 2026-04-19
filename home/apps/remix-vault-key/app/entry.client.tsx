import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";
import { createRoot } from "react-dom/client";

startTransition(() => {
  createRoot(document).render(
    <StrictMode>
      <RemixBrowser />
    </StrictMode>
  );
});
