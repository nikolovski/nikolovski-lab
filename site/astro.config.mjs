// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://nikolovski.ai",
  markdown: {
    // Leave ```mermaid blocks as plain code; components/Mermaid.astro renders them in the browser.
    syntaxHighlight: { type: "shiki", excludeLangs: ["mermaid", "math"] },
  },
});
