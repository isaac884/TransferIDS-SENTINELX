import { existsSync } from "node:fs";

const pages = ["index", "dashboard", "intake", "incidents", "response", "insights", "learning-queue", "reports", "settings"];
const missing = pages.map((page) => `frontend/${page}.html`).filter((path) => !existsSync(path));
if (missing.length) {
  console.error(`Missing frontend pages:\n${missing.join("\n")}`);
  process.exit(1);
}

console.log("Frontend runtime skeleton check passed");
