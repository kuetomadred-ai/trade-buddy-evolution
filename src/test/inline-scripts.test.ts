import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(path.join(process.cwd(), "public/plotos/index.html"), "utf8");
const inlineScripts = Array.from(page.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))
  .filter((match) => !/\bsrc\s*=/i.test(match[1]))
  .map((match) => match[2].trim())
  .filter(Boolean);

describe("embedded application scripts", () => {
  it("contains at least one inline script", () => {
    expect(inlineScripts.length).toBeGreaterThan(0);
  });

  it("parses every inline script without executing application code", () => {
    inlineScripts.forEach((source, index) => {
      expect(() => new Function(source), `inline script ${index + 1}`).not.toThrow();
    });
  });

  it("loads the local Supabase SDK before using the CDN fallback", () => {
    const vendor = readFileSync(
      path.join(process.cwd(), "public/plotos/vendor/supabase.js"),
      "utf8",
    );
    expect(vendor).toContain("createClient");
    expect(page).toContain("s.src='./vendor/supabase.js'");
    expect(page).toContain(
      "s2.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js'",
    );
  });

  it("initializes cloud auth at boot without demo-mode bypass", () => {
    expect(page).toContain("cloudInit().then(function(){return seed()})");
    expect(page).not.toContain("PREVIEW_DEMO");
  });

  it("keeps auth usable and removes signup-screen disclosures", () => {
    expect(page).toContain("var landingHtml=PORTAL_ADMIN?");
    expect(page).toContain("function pre(){return CLOUD.ok?cloudPull():Promise.resolve()}");
    expect(page).not.toMatch(/\bvar pre=/);
    expect(page).toContain('id="demoBtn">Open platform');
    expect(page).not.toContain("Account activation is reviewed by staff.");
    expect(page).not.toContain("SERVER-SIDE PAPER TRADING");
    expect(page).not.toContain("Sign in for paper trading");
    expect(page).toContain("if(!r.data.user||!r.data.session)");
    expect(page).toContain(
      "Wait '+wait[1]+' seconds before requesting another confirmation email.",
    );
    expect(page).toContain("function runAuthButton(button,request,onSuccess)");
    expect(page).toContain("SIMULATED BALANCE");
    expect(page).not.toContain("Paper trading runs on the server; sign in.");
    expect(page).not.toContain('<footer class="lp-foot">');
  });
});
