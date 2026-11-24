---
name: "improve-prompt"
description: "Rewrites a user's prompt into a clear, complete, target-ready prompt for any AI tool (Claude, ChatGPT/Codex, Cursor, Gemini, image or video models). Use when the user asks to improve, rewrite, sharpen or fix a prompt. Also use when a request is vague enough that the result would likely miss: offer to improve it first, and rewrite only if the user says yes. Asks clarifying questions, states its assumptions, returns only the rewritten prompt, and never runs it without the user's OK."
---

# Improve Prompt

Turns a rough prompt into one that gets the right result on the first try, for whatever tool the user will paste it into.

## When to use
1. **Explicit:** the user asks to improve, rewrite, tighten or fix a prompt, or runs `/improve-prompt`.
2. **Offered:** the user gives a request that is too vague to do well (see <vagueness_check>). Do not rewrite it unasked. Ask once, in one line:
   > "This is open to a few readings. Want me to sharpen the prompt first?"
   If they say no, do the task as asked. Don't offer again for the same request.

## Rules
- Never execute the improved prompt. Hand it back and wait for the user's OK.
- Never change the user's intent. Improve clarity, not the goal.
- Ask before assuming. Any assumption you still make goes in the assumptions list.
- Output only what <output_format> describes. No commentary, no "here's what I changed".
- Keep the user's language (English prompt in, English prompt out, and so on).

<vagueness_check>
A prompt is vague when two or more of these are missing and can't be found in the conversation, files or repo:
- **Goal:** what a good result is for (decision, code change, draft, image).
- **Audience or consumer:** who or what reads the output.
- **Scope:** what's in and out, how much, how long.
- **Inputs:** the data, files, code or context the task depends on.
- **Format:** the shape of the output (code, table, list, file, image size).
- **Constraints:** stack, tone, length, style, must/must-not.
- **Success criteria:** how the user will judge it.
</vagueness_check>

## Process

### 1. Identify the target
Work out which tool the prompt is for. If it isn't stated or obvious, ask. Adapt to it using <target_guides>.

### 2. Find the gaps
Run <vagueness_check>. Look in the conversation, attached files and repo before asking for anything.

### 3. Ask first
Ask the clarifying questions that would change the prompt most. 3 to 5 at most, numbered, each answerable in a few words. Offer likely options inline where it helps ("Audience: engineers, execs or customers?").
If the user says "just do it" or skips a question, proceed and record the assumption.

### 4. Rewrite
Build the prompt from these parts, in this order, dropping any that don't apply to the target:
1. **Role / context:** who the model is acting as and the situation it's in.
2. **Task:** one clear instruction, verb first.
3. **Inputs:** the material to work from, clearly delimited (XML tags for Claude, fenced blocks or headed sections elsewhere).
4. **Constraints:** must / must-not, scope, stack, tone, length.
5. **Output format:** exact shape of the result.
6. **Success criteria:** what "done well" means, so the model can check itself.
7. **Examples:** only if the user gave them or the format is hard to describe.

Prefer specific over general, positive instructions ("write in plain sentences") over negative ones ("don't use jargon"), and the reason behind a constraint when it isn't obvious.

### 5. Hand back
Return the result per <output_format>, then stop and wait. If the user asks for changes, revise and hand back again. Run the prompt only when they say so.

<target_guides>
- **Claude:** XML tags for inputs and sections; state the role and reason behind constraints; ask for thinking before answering on hard reasoning tasks; put long documents before the question.
- **ChatGPT / GPT models:** Markdown headings for sections; explicit output format; delimit inputs with fenced blocks.
- **Coding agents (Claude Code, Codex, Cursor, Copilot):** name files, functions and paths; state the stack and versions; say how to verify (tests to run, commands, expected behavior); state what must not change; one task per prompt.
- **Gemini:** clear sections, explicit format, examples where the format is unusual.
- **Image models (Midjourney, DALL-E, Stable Diffusion, Flux, Imagen):** subject, setting, composition and camera, lighting, style or medium, color palette, mood, aspect ratio. Use the tool's own syntax for parameters (for example `--ar 16:9` in Midjourney) and negative prompts where the tool supports them.
- **Video models (Sora, Veo, Runway):** subject, action over time, camera movement, shot length, style, setting, sound if supported.
- **Other or unknown:** a plain structured prompt using the parts in step 4.
</target_guides>

<output_format>
**Assumptions** (omit if none)
- One line per assumption you made because a question went unanswered.

**Improved prompt**
```
<the rewritten prompt, ready to paste>
```

Then one line: "Want me to run it, or change anything?"
</output_format>

## Example

User: "write a blog post about our new feature"

Ask:
1. Which feature, and what does it do for the user?
2. Who reads the blog: customers, developers or prospects?
3. Length and tone: short and punchy, or a detailed walkthrough?
4. Which tool will you run this in?

User answers: "Bulk CSV import for contacts in our CRM. Small-business customers. ~600 words, friendly. Claude."

Return:

**Assumptions**
- Ends with a call to action to try the feature.

**Improved prompt**
```
You are a product marketer writing for a CRM company's blog. The readers are small-business owners who manage customer contacts themselves and aren't technical.

<feature>
Bulk CSV import: users upload a CSV of contacts and the CRM maps the columns and imports them in one step, instead of adding contacts one at a time.
</feature>

Write a blog post announcing this feature.

Constraints:
- About 600 words.
- Friendly, plain language. Explain any term a non-technical reader might not know.
- Lead with the problem it solves (hours lost adding contacts by hand), then the feature, then a short how-to in 3 to 5 steps.
- End with a one-line call to action to try it.

Output: a title, then the post in Markdown with short sections.

A good post makes a busy owner want to try the import today and know exactly how.
```

Want me to run it, or change anything?
