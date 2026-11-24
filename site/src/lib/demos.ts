import { getCollection, getEntry } from "astro:content";

export async function allDemos() {
  return (await getCollection("demos")).sort((a, b) => a.id.localeCompare(b.id));
}

export async function demoParts(id: string) {
  const [task, without, withSkill] = await Promise.all(
    ["task", "without", "with"].map((p) => getEntry("demoParts", `${id}/${p}`)),
  );
  if (!task || !without || !withSkill) throw new Error(`demos/${id} is missing task.md, without.md or with.md`);
  return { task, without, withSkill };
}
