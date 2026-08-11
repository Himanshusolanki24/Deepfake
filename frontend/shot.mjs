import { chromium } from "playwright";

const base = "http://localhost:3001";
const shots = [
  { path: "/", name: "01-dashboard" },
  { path: "/analyze", name: "02-analyze" },
  { path: "/history", name: "03-history" },
  { path: "/batch", name: "04-batch" },
  { path: "/evidence", name: "05-evidence" },
  { path: "/compare?a=VID-2026-00182&b=IMG-2026-00014", name: "06-compare" },
  { path: "/api", name: "07-api" },
  { path: "/settings", name: "08-settings" },
  { path: "/reports", name: "09-reports" },
  { path: "/analysis/VID-2026-00182", name: "10-analysis-video", wait: 1200 },
  { path: "/analysis/IMG-2026-00014", name: "11-analysis-image", wait: 1200 },
  { path: "/analysis/AUD-2026-00071", name: "12-analysis-audio", wait: 1200 },
  { path: "/analysis/VID-2026-00182/report", name: "13-report", wait: 1200 },
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const s of shots) {
    try {
      await page.goto(base + s.path, { waitUntil: "networkidle" });
      await page.waitForTimeout(s.wait ?? 800);
      await page.screenshot({ path: `/tmp/authentiq-shots/${s.name}.png` });
      console.log("OK", s.name);
    } catch (e) {
      console.log("FAIL", s.name, e.message.split("\n")[0]);
    }
  }
  // mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await page.screenshot({ path: "/tmp/authentiq-shots/14-dashboard-mobile.png" });
  await page.goto(base + "/analyze", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.screenshot({ path: "/tmp/authentiq-shots/15-analyze-mobile.png" });
  await browser.close();
})();
