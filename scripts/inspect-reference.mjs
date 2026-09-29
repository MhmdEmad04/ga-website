import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

await mkdir(".cache/reference", { recursive: true });
const browser = await chromium.launch({ channel: "msedge" });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto("https://garbalia.com/", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: ".cache/reference/homepage.png", fullPage: false });
  console.log(JSON.stringify(await page.evaluate(() => ({
    title: document.title,
    background: getComputedStyle(document.body).backgroundColor,
    headings: [...document.querySelectorAll("h1,h2")].slice(0, 10).map((item) => item.textContent),
    links: [...document.querySelectorAll('a[href*="canta"]')].slice(0, 8).map((item) => ({ text: item.textContent, href: item.href })),
  })), null, 2));
} finally { await browser.close(); }
