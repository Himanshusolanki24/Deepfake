import { chromium } from "playwright";

const base = "http://localhost:3001";
const routes = ["/", "/analyze", "/history", "/batch", "/evidence", "/compare?a=VID-2026-00182&b=IMG-2026-00014", "/api", "/settings", "/reports", "/analysis/VID-2026-00182", "/analysis/IMG-2026-00014", "/analysis/AUD-2026-00071", "/analysis/VID-2026-00182/report"];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`[console] ${msg.text().slice(0, 160)}`);
  });
  page.on("pageerror", (err) => errors.push(`[pageerror] ${err.message.slice(0, 160)}`));

  for (const route of routes) {
    errors.length = 0;
    await page.goto(base + route, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    const metrics = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      winW: window.innerWidth,
      bodyBg: getComputedStyle(document.body).backgroundColor,
      sidebar: document.querySelector("aside"),
      header: document.querySelector("header"),
      main: document.querySelector("main"),
    }));
    const hOverflow = metrics.scrollW > metrics.winW;
    console.log(
      route.padEnd(45),
      "xOverflow:", hOverflow ? "❌" : "ok",
      "sidebar:", metrics.sidebar ? "ok" : "MISSING",
      "header:", metrics.header ? "ok" : "MISSING",
      "errors:", errors.length ? "❌ " + errors.join(" | ") : "none"
    );
  }

  // Mobile checks
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/", "/analyze", "/analysis/VID-2026-00182"]) {
    errors.length = 0;
    await page.goto(base + route, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    const m = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      winW: window.innerWidth,
      mobileNav: document.querySelector("nav[aria-label=Mobile]")?.children.length ?? 0,
    }));
    console.log(
      ("M " + route).padEnd(45),
      "xOverflow:", m.scrollW > m.winW ? "❌" : "ok",
      "bottomNav items:", m.mobileNav,
      "errors:", errors.length ? "❌ " + errors.join(" | ") : "none"
    );
  }

  // Tablet check
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  const t = await page.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, winW: window.innerWidth }));
  console.log("Tablet 768 xOverflow:", t.scrollW > t.winW ? "❌" : "ok");

  await browser.close();
})();
