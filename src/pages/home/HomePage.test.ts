import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ThemeProvider } from "@mui/material";
import { Router } from "wouter";
import { describe, expect, it, vi } from "vitest";
import theme from "../../themes";
import HomePage from "./HomePage";

const auth = vi.hoisted(() => ({ isAuthenticated: false }));
vi.mock("../../stores/authStore", () => ({
  useAuthStore: (selector: (state: typeof auth) => unknown) => selector(auth),
}));

function renderHome(isAuthenticated: boolean) {
  auth.isAuthenticated = isAuthenticated;
  return renderToStaticMarkup(
    createElement(ThemeProvider, {
      theme,
      children: createElement(Router, {
        ssrPath: "/",
        children: createElement(HomePage),
      }),
    }),
  );
}

describe("homepage authentication badges", () => {
  it("shows sign-in badges to guests and uses the Budgetize name", () => {
    const html = renderHome(false);
    expect(html).toContain("Sign in to save");
    expect(html).toContain("Sign-in required");
    expect(html).toContain("Budgetize");
    expect(html).not.toContain("Budgetize Me");
  });

  it("hides both sign-in badges for authenticated users", () => {
    const html = renderHome(true);
    expect(html).not.toContain("Sign in to save");
    expect(html).not.toContain("Sign-in required");
    expect(html).toContain("Level Editor");
    expect(html).toContain("Budgetize");
  });
});
