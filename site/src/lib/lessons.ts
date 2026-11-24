import { getCollection } from "astro:content";

// Drafts show in `npm run dev` and stay off the production build.
export async function publishedLessons() {
  const all = await getCollection("lessons", ({ data }) => import.meta.env.DEV || !data.draft);
  return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export const formatDate = (d: Date) =>
  d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
