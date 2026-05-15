---
name: literal-prompting
description: Pattern doc for writing prompts, skill docs, and CLAUDE.md rules that hold up under Opus 4.7's literal instruction following. Load when rewriting any doc that a model is expected to follow as instructions.
type: reference
---

# Literal Prompting Pattern (Opus 4.7)

Opus 4.7 follows explicit instructions faithfully and will not silently generalize, infer unstated intent, or "read between the lines." Anthropic's 4.7 release notes call this out directly:

> "More literal instruction following, particularly at lower effort levels. The model will not silently generalize an instruction from one item to another, and will not infer requests you didn't make."

The same release also notes:

> "Fewer tool calls by default, using reasoning more. Raising effort increases tool usage."
> "Fewer subagents spawned by default. Steerable through prompting."
> "Response length calibrates to perceived task complexity rather than defaulting to a fixed verbosity."

Skill docs, CLAUDE.md, agent prompts, and task guidance written for 4.6 (or earlier) often relied on the model inferring intent. That no longer works reliably. This doc is the pattern.

## LOAD THIS WHEN

- Rewriting any `.claude/skills/**/SKILL.md`
- Rewriting `CLAUDE.md` or any file under `.claude/prompts/`
- Writing a new agent wrapper template, queue task guidance, or system prompt
- Reviewing a task body before it is queued as agent work
- Auditing a doc because an agent "didn't do what the doc said"

## SKIP THIS DOC WHEN

- Writing narrative paragraphs that explain WHY a system exists
- Writing creative prompts (storytelling, dialogue) — these must stay loose
- Writing user-facing copy (blog posts, emails, marketing)

The goal is to tighten DECISION-MAKING language, not EXPLANATORY language.

---

## The 9 Rules

### Rule 1 — HARD VERBS, NOT SOFT

Replace "prefer", "avoid", "try to", "should", "it's a good idea to" with `ALWAYS`, `NEVER`, `MUST`, `DO NOT`. If something is actually optional, mark it `OPTIONAL:` explicitly.

4.7 treats "prefer X" as a weak signal. It will not rank soft verbs against each other; it picks whichever feels most recently stated.

**Before:**
```
- ALWAYS prefer code-finder over Explore for code search
```
**After:**
```
- For code search, USE code-finder. DO NOT use Explore for code.
```

### Rule 2 — EXPLICIT TRIGGERS, NOT IMPLIED

Every skill, doc, and rule must state WHEN it applies. Replace "this is important" with `LOAD WHEN:` or `APPLIES WHEN:` followed by an enumerated condition list. Vague activation is invisible to a literal model.

**Before:**
```
This skill is for read-only analysis.
```
**After:**
```
LOAD WHEN: user asks for a code audit, a code review task is claimed, or a file under src/ is flagged for refactoring.
APPLIES WHEN: you are in read-only mode. DO NOT edit files from this skill — surface findings instead.
```

### Rule 3 — DECISION TREES WITH NO OVERLAP

Replace "figure out which one fits" with an `IF ... → ... / ELSE IF ... → ...` table where every condition routes to exactly ONE action. If two branches can match, order them and say "first match wins."

**Before:**
```
Use the appropriate doc based on what you are changing.
```
**After:**
```
IF file matches src/backend/handlers/**   → READ docs/backend.md
ELSE IF file matches src/frontend/**       → READ docs/frontend.md
ELSE IF file matches *.sql                 → READ docs/database.md
ELSE                                       → run a codemap scan
First match wins. DO NOT combine branches.
```

### Rule 4 — ANTI-PATTERNS STATED EXPLICITLY (with one exception)

For FORBIDDEN BEHAVIOR, enumerate what the wrong thing IS. Literal models need the bad behavior listed by name.

**Before:**
```
Be careful with SQL files.
```
**After:**
```
NEVER commit SQL migration files to scripts/database/migrations/.
NEVER commit view definitions, stored procedures, or one-off DDL to git.
Run SQL via the project's query tool from temp/{session_id}/ instead.
```

**EXCEPTION — voice/tone guidance:** Anthropic's 4.7 guidance notes positive examples of the voice you want work better than negative "Don't do this" instructions for STYLE. Rule 4 applies to behavioral prohibitions (security, data integrity, workflow). For stylistic guidance, use positive voice examples.

**Style — wrong approach:**
```
Don't be flowery. Don't use purple prose. Don't be verbose.
```
**Style — right approach:**
```
Target voice: short clauses. One vivid noun per sentence. Verbs do the work.
"The hammer fell. The sound carried three blocks."
```

### Rule 5 — ENTRY/EXIT CONDITIONS PER STEP

For any multi-step workflow, each step gets ENTRY (what must be true to start) and EXIT (what proves it is done). Replace "verify it works" with a specific, runnable check.

**Before:**
```
Step 3: Verify the build passes.
```
**After:**
```
Step 3 — Build verification
ENTRY: All code edits for the task are saved to disk.
ACTION: Run the project's build command (e.g., npm run build).
EXIT: Exit code 0. If non-zero, DO NOT proceed to Step 4; report failure.
```

### Rule 6 — ONE SOURCE OF TRUTH PER RULE

If `CLAUDE.md` says "use X" and a skill says "use Y" for the same decision, 4.7 picks whichever it read last. Find conflicts. Pick ONE doc as authoritative. Make the other reference it with `SEE: {authoritative doc}` and no local restatement.

When you find a conflict while auditing:
1. Pick the doc closest to the decision point (the skill, not `CLAUDE.md`, usually wins)
2. Delete the restatement from the other doc
3. Replace with a one-line pointer

### Rule 7 — EXPLICIT OUTPUT FORMAT WHEN PARSED

If downstream code parses the agent's output, spell out the exact format. JSON shape, key names, array-of-objects example.

**Before:**
```
Report the files you changed in the result summary.
```
**After:**
```
OUTPUT FORMAT for result summary:
Plain-text prose (≤ 200 words) followed by a JSON array of changed files on its own line:
CHANGED_FILES: [{"file":"path/to/x.ts","action":"edited"},{"file":"path/to/y.ts","action":"created"}]
action ∈ {"edited","created","deleted"}.
```

### Rule 8 — EXPLICIT STEERING FOR REDUCED DEFAULTS

4.7 spawns fewer subagents and makes fewer tool calls by default than 4.6. If a skill, agent, or task benefits from parallelism, fan-out, or aggressive tool use, the doc MUST say so explicitly. "Feel free to" and "consider" do not survive literal reading.

**Before:**
```
You can use subagents if helpful.
```
**After:**
```
Spawn subagents WHEN fanning out across > 3 independent items (e.g., reviewing > 3 files in parallel).
DO NOT spawn subagents for work completable in a single response.
```

### Rule 9 — PREFER FRONTMATTER OVER PROSE

Claude Code skills support structured frontmatter fields. Use them before writing prose rules. Frontmatter is machine-enforced; prose is interpreted.

| Frontmatter field | Replaces prose rule like… |
|---|---|
| `description` (clear when to use) | "This skill is useful for X, Y, Z" |
| `disable-model-invocation: true` | "Only run when the user explicitly asks" |
| `user-invocable: false` | "Do not show this in the / menu" |
| `allowed-tools: [...]` | "Use only Read and Grep" / "Do not use Edit" |
| `model: opus` / `haiku` | "Use Opus for this skill" |
| `effort: medium` / `high` | "Keep it short" / "Think deeply about this" |

Prose rules remain valid for decisions the frontmatter cannot express (conditional logic, workflow order, content structure). Frontmatter first, prose second.

---

## Harness Controls (Use Instead of Prose When Available)

These are knobs Claude Code exposes on Opus 4.7. They COMPLEMENT prompt tightening. If a doc tries to fight the default with prose, switch to a harness control instead.

- **`effort`** — frontmatter field. `medium` (4.7 default) / `high` / `xhigh` / `max`. If a task must stay brief, set `effort: medium` instead of writing "keep it short" 15 times.
- **Per-skill `model` override** — set `model: haiku` for fast read-only skills, `model: opus` for code-change skills. Do not tell the model "be fast" — pick a faster model.

Harness controls are deterministic. Prose is interpreted. When both are available, choose the harness control.

---

## Self-Check Checklist

Run this against any doc you are rewriting for 4.7. Check every box or leave a short note explaining why a rule was intentionally skipped.

- [ ] Every `should` / `prefer` / `try` / `avoid` is either hardened to `MUST` / `ALWAYS` / `NEVER` / `DO NOT`, marked `OPTIONAL:`, or intentionally left soft because it is narrative/creative.
- [ ] Every skill, doc, and rule has an explicit `LOAD WHEN` (or `APPLIES WHEN`) trigger list — or expresses activation via frontmatter.
- [ ] Every routing table has no overlapping conditions; if any exist, the first-match rule is stated.
- [ ] Every `don't X` has the X enumerated by name (not "be careful").
- [ ] Every multi-step workflow has ENTRY + EXIT per step with runnable checks.
- [ ] No rule contradicts another rule in another file. Conflicts resolved to ONE source of truth.
- [ ] Any output parsed by code has the exact format spelled out with an example.
- [ ] Parallelism / tool-use expectations that exceed 4.7's defaults are stated explicitly (Rule 8).
- [ ] Frontmatter is used for activation, allowed tools, model, and effort wherever applicable (Rule 9).
- [ ] Tone / voice guidance uses positive examples, not "don't" lists (Rule 4 exception).
- [ ] Narrative paragraphs (WHY a system exists) were left alone.
