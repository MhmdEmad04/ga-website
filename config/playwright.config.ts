import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

export default defineConfig({
  testDir: "../tests",
  outputDir: "../test-results",
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3001",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: { channel: process.env.PLAYWRIGHT_CHANNEL ?? (process.platform === "win32" ? "msedge" : undefined) },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], defaultBrowserType: "chromium" } },
  ],
  webServer: {command:'node --import tsx scripts/e2e-server.ts',cwd:path.resolve(__dirname,'..'),url:'http://127.0.0.1:3001',timeout:120000,reuseExistingServer:false},
});
