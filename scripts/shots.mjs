#!/usr/bin/env node
// CORE (lead-owned). Screenshots an engine in the studio so agents can judge
// realism without a human looking. Needs the dev server running.
//
//   npm run shots -- v8                   # writes shots/v8-*.png
//   npm run shots -- i4 http://localhost:3000
//
// First time only: npx playwright install chromium

import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const [engine = "v8", base = "http://localhost:3000"] = process.argv.slice(2);
const url = `${base}/engines?engine=${engine}`;
mkdirSync("shots", { recursive: true });

const views = [
  { name: "desktop-assembled", viewport: { width: 1280, height: 900 }, explode: 0 },
  { name: "desktop-exploded", viewport: { width: 1280, height: 900 }, explode: 100 },
  { name: "desktop-xray", viewport: { width: 1280, height: 900 }, explode: 60, select: "Crankshaft" },
  { name: "mobile-assembled", viewport: { width: 390, height: 844 }, explode: 0, mobile: true },
  { name: "mobile-exploded", viewport: { width: 390, height: 844 }, explode: 100, mobile: true },
];

// Software WebGL so it works on any machine, GPU or not.
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const problems = new Set();
for (const v of views) {
  const page = await browser.newPage({ viewport: v.viewport, deviceScaleFactor: v.mobile ? 2 : 1 });
  page.on("console", (m) => m.type() === "error" && problems.add(m.text()));
  page.on("pageerror", (e) => problems.add(e.message));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector("canvas", { timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Running" }).click(); // freeze motion
  await page.locator("input[type=range]").first().fill(String(v.explode));
  await page.waitForTimeout(800);
  if (v.select) {
    await page.getByRole("button", { name: v.select, exact: true }).last().click();
    await page.waitForTimeout(600);
  }
  const file = `shots/${engine}-${v.name}.png`;
  await page.screenshot({ path: file });
  console.log("wrote " + file);
  await page.close();
}
await browser.close();
if (problems.size) {
  console.log("\nConsole errors:\n  " + [...problems].join("\n  "));
  process.exit(1);
}
