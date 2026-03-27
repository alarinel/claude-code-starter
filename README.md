# claude-code-starter

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Claude Code](https://img.shields.io/badge/Claude_Code-Compatible-blueviolet.svg)](https://docs.anthropic.com/en/docs/claude-code)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

A minimal, opinionated starter kit for structured Claude Code usage. Drop this into any project and immediately get better results from Claude Code — less token waste, repeatable workflows, and a foundation you can extend.

**This is not a wrapper or framework.** It's a set of configuration files that teach Claude Code how to work with your codebase effectively.

---

## Table of Contents

- [Why This Exists](#why-this-exists)
- [What's Included](#whats-included)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [CLAUDE.md Template](#claudemd-template)
- [Skills](#skills)
  - [Developer Skill](#developer-skill)
  - [Deploy Skill](#deploy-skill)
  - [Creating Your Own Skills](#creating-your-own-skills)
- [Hooks](#hooks)
  - [Session Tracking Hook](#session-tracking-hook)
  - [Creating Your Own Hooks](#creating-your-own-hooks)
- [Configuration](#configuration)
- [Usage Patterns](#usage-patterns)
  - [Starting a Session](#starting-a-session)
  - [Making Code Changes](#making-code-changes)
  - [Deploying](#deploying)
  - [Multi-File Refactors](#multi-file-refactors)
- [Tips and Best Practices](#tips-and-best-practices)
- [Want More?](#want-more)
- [Contributing](#contributing)
- [License](#license)

---

## Why This Exists

Out of the box, Claude Code is powerful but unstructured. Without guidance, it:

- Reads your entire codebase context on every prompt (expensive)
- Doesn't know your project's conventions, build commands, or deployment process
- Can't maintain consistency across conversations
- Has no memory of what it did in previous sessions

A well-structured `CLAUDE.md` and a handful of skills fix all of this. Claude Code becomes a reliable teammate instead of a smart stranger you have to re-onboard every conversation.

This starter kit gives you:

1. **A CLAUDE.md template** that actually reduces token usage instead of inflating it
2. **Two production-tested skills** that handle the most common workflows (code changes and deployment)
3. **A session tracking hook** so you can see what Claude did across conversations
4. **Patterns you can copy** to build your own skills and hooks

---

## What's Included

```
.claude/
├── CLAUDE.md                    # Project instructions (the main file)
├── settings.json                # Claude Code configuration
├── skills/
│   ├── developer/
│   │   └── SKILL.md             # Code change workflow
│   └── deploy/
│       └── SKILL.md             # Deployment workflow
└── hooks/
    └── session-tracking.mjs     # Session start/end logging
```

That's it. No dependencies. No build step. No runtime. Just files that Claude Code reads.

---

## Getting Started

### Prerequisites

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated
- A project you want to use Claude Code with

### Installation

**Option A: Clone into an existing project**

```bash
# From your project root
git clone https://github.com/lincolncole/claude-code-starter .claude-starter-tmp
cp -r .claude-starter-tmp/.claude .
cp .claude-starter-tmp/CLAUDE.md .
rm -rf .claude-starter-tmp
```

**Option B: Start a new project with it**

```bash
git clone https://github.com/lincolncole/claude-code-starter my-project
cd my-project
rm -rf .git
git init
```

**Option C: Just grab the files manually**

Download the `.claude/` directory and `CLAUDE.md` from this repo and drop them into your project root.

### Configuration

After copying the files, you need to customize them for your project:

1. **Edit `CLAUDE.md`** — Replace the placeholder sections with your project's actual details:

```bash
# Open in your editor
code CLAUDE.md
```

Update these sections:
- Project name and description
- Tech stack
- Build commands
- Test commands
- Directory structure overview
- Coding conventions

2. **Edit skill files** — Update `.claude/skills/developer/SKILL.md` and `.claude/skills/deploy/SKILL.md` with your actual build, test, and deploy commands.

3. **Verify it works:**

```bash
claude
# Then type: "What do you know about this project?"
# Claude should reference your CLAUDE.md content
```

---

## Project Structure

Here's what each file does and why it exists:

### `.claude/CLAUDE.md` → The Brain

This is the primary file Claude Code reads at the start of every conversation. It should contain:

- What the project is
- How to build and test it
- Directory layout
- Coding conventions
- What NOT to do (common mistakes)

**Key principle: Keep it focused.** Every token in CLAUDE.md is loaded every single conversation. If your CLAUDE.md is 10,000 tokens, that's 10,000 tokens burned before Claude reads your first message. Aim for under 3,000 tokens. Move detailed instructions into skills.

### `.claude/skills/` → On-Demand Knowledge

Skills are markdown files that Claude loads only when relevant. Instead of cramming deployment instructions into CLAUDE.md (loaded every time), put them in a deploy skill (loaded only when deploying).

### `.claude/hooks/` → Automated Actions

Hooks run automatically at specific lifecycle points — when a conversation starts, when Claude is about to execute a command, after a task completes, etc. They're scripts (Node.js, Python, Bash) that Claude Code executes.

### `.claude/settings.json` → Configuration

Controls permissions, allowed commands, and hook registration.

---

## CLAUDE.md Template

The included `CLAUDE.md` is structured in sections. Here's the architecture and the reasoning behind each section:

```markdown
# Project Name

## Overview
One paragraph. What this project is, what it does, who it's for.

## Tech Stack
Bullet list. Language, framework, database, deployment target.
Claude uses this to choose appropriate patterns and libraries.

## Build & Test
Exact commands. No ambiguity.
- `npm run build` — Compiles TypeScript
- `npm test` — Runs Jest test suite
- `npm run lint` — ESLint check

## Directory Structure
Top-level directories only. Brief description of each.
src/
├── api/        # REST endpoints
├── services/   # Business logic
├── models/     # Database models
└── utils/      # Shared utilities

## Coding Conventions
The rules Claude MUST follow when writing code.
- Use TypeScript strict mode
- Prefer named exports
- Error handling: always use Result types, never throw
- Tests: colocate with source files as *.test.ts

## Do NOT
Explicit list of mistakes to avoid. Claude pays attention to these.
- Do NOT use `any` type
- Do NOT import from barrel files (index.ts)
- Do NOT add new dependencies without asking

## Skills
Available skills and when to use them.
- `/developer` — Load before making any code changes
- `/deploy` — Load before deploying
```

**Why this structure works:**

1. **Overview + Tech Stack** = Claude understands the project in ~100 tokens
2. **Build & Test** = Claude can verify its own work
3. **Directory Structure** = Claude navigates without scanning every folder
4. **Conventions** = Claude matches your style, not generic patterns
5. **Do NOT** = Prevents the most common AI mistakes
6. **Skills** = Claude knows what's available without loading everything

---

## Skills

### Developer Skill

**File:** `.claude/skills/developer/SKILL.md`

This skill defines the workflow Claude follows when making code changes. It ensures Claude doesn't just edit files randomly — it follows a repeatable process.

**What it enforces:**

1. Read the relevant code before changing it
2. Understand the existing patterns in the codebase
3. Make changes that match project conventions
4. Run the build to verify nothing broke
5. Run tests if they exist
6. Report what changed

**Example usage in a conversation:**

```
You: Load the developer skill and refactor the auth middleware to use async/await

Claude: [Loads /developer skill]
        [Reads current auth middleware]
        [Reads related files for patterns]
        [Makes changes]
        [Runs build]
        [Runs tests]
        [Reports: "Changed 3 files, build passes, 12 tests pass"]
```

**Customization points:**

- Build command (line 15)
- Test command (line 18)
- Lint command (line 21)
- Code style rules (section 3)
- Pre-change checklist (section 2)

### Deploy Skill

**File:** `.claude/skills/deploy/SKILL.md`

This skill defines your deployment process so Claude can execute it safely and consistently.

**What it enforces:**

1. Check current git status (clean working tree)
2. Verify the build passes
3. Run the deploy command
4. Verify the deployment succeeded
5. Report the result

**Customization points:**

- Deploy target(s) and commands
- Pre-deploy checks
- Post-deploy verification
- Rollback procedure

### Creating Your Own Skills

Skills are just markdown files. Create a new one:

```bash
mkdir -p .claude/skills/my-skill
```

Then create `.claude/skills/my-skill/SKILL.md`:

```markdown
# My Skill Name

## When to Use
Describe when Claude should load this skill.

## Workflow
Step-by-step process Claude should follow.

### Step 1: Prepare
What to check before starting.

### Step 2: Execute
The actual work to do.

### Step 3: Verify
How to confirm it worked.

## Rules
- Specific constraints for this workflow
- Things to avoid
- Required checks
```

**Good candidates for skills:**

| Skill | Purpose |
|-------|---------|
| `database` | Migration workflow, query patterns, schema conventions |
| `testing` | Test writing standards, coverage requirements, test data setup |
| `api` | Endpoint conventions, request/response patterns, error handling |
| `review` | Code review checklist, what to look for, how to report findings |
| `docs` | Documentation standards, where docs live, update process |
| `debug` | Debugging workflow, log analysis, common failure modes |

---

## Hooks

### Session Tracking Hook

**File:** `.claude/hooks/session-tracking.mjs`

This hook runs at the start and end of every Claude Code conversation. It logs:

- Session start timestamp
- Session end timestamp
- Conversation duration
- Working directory

Logs are written to `.claude/sessions/session-log.jsonl` (gitignored).

**Why this matters:** When you're running multiple Claude sessions, or when you come back after a break, you can see exactly what happened and when. It's the minimum viable observability for AI-assisted development.

**Log format:**

```json
{
  "event": "session_start",
  "timestamp": "2026-03-27T14:30:00.000Z",
  "cwd": "/home/user/my-project",
  "session_id": "abc123"
}
```

### Creating Your Own Hooks

Hooks are scripts registered in `.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "command": "node .claude/hooks/my-hook.mjs",
        "timeout": 5000
      }
    ]
  }
}
```

**Available hook events:**

| Event | When it Fires |
|-------|---------------|
| `PreToolUse` | Before Claude runs a tool (Bash, Read, Write, etc.) |
| `PostToolUse` | After a tool completes |
| `UserPromptSubmit` | When you send a message |
| `TaskCompleted` | When a subagent finishes |
| `Stop` | When Claude finishes responding |

**Example: Block destructive git commands**

```javascript
// .claude/hooks/git-guard.mjs
import { readFileSync } from 'fs';

const input = JSON.parse(readFileSync('/dev/stdin', 'utf8'));

if (input.tool_name === 'Bash') {
  const cmd = input.tool_input?.command || '';
  const blocked = ['git push --force', 'git reset --hard', 'git clean -fd'];

  for (const pattern of blocked) {
    if (cmd.includes(pattern)) {
      console.log(JSON.stringify({
        decision: "block",
        reason: `Blocked destructive command: ${pattern}`
      }));
      process.exit(0);
    }
  }
}

// Allow everything else
console.log(JSON.stringify({ decision: "allow" }));
```

---

## Configuration

### `.claude/settings.json`

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run build)",
      "Bash(npm test)",
      "Bash(npm run lint)",
      "Bash(git status)",
      "Bash(git diff)",
      "Bash(git log)"
    ],
    "deny": [
      "Bash(git push --force)",
      "Bash(rm -rf)"
    ]
  },
  "hooks": {
    "UserPromptSubmit": [
      {
        "command": "node .claude/hooks/session-tracking.mjs",
        "timeout": 5000
      }
    ]
  }
}
```

**Permission patterns:**

- `"Bash(npm run build)"` — Allow this exact command
- `"Bash(npm *)"` — Allow any npm command
- `"Write"` — Allow all file writes without confirmation
- `"Edit"` — Allow all file edits without confirmation

Start restrictive. Add permissions as you discover what your workflow needs. Every permission prompt from Claude is a signal that you should either allow it permanently or understand why it's asking.

---

## Usage Patterns

### Starting a Session

```bash
claude
```

Claude reads your CLAUDE.md automatically. Verify by asking:

```
What skills are available?
```

Claude should list the developer and deploy skills.

### Making Code Changes

```
Load the developer skill and add input validation to the /api/users endpoint
```

Claude will:
1. Load the developer skill
2. Read the current endpoint code
3. Read related validation patterns in your codebase
4. Add validation following your conventions
5. Build to verify
6. Report changes

### Deploying

```
Load the deploy skill and deploy to production
```

Claude will follow your deploy skill's workflow step by step.

### Multi-File Refactors

```
Load the developer skill. Rename the UserService class to AccountService
everywhere it appears — imports, references, tests, file names.
```

This is where structured Claude Code shines. The developer skill ensures Claude:
- Finds all references before changing anything
- Updates imports across the codebase
- Renames test files and updates test descriptions
- Verifies the build passes after all changes

---

## Tips and Best Practices

### Keep CLAUDE.md Under 3,000 Tokens

Every token in CLAUDE.md is loaded every conversation. Move detailed instructions into skills. Your CLAUDE.md should be a routing table, not an encyclopedia.

**Bad:**
```markdown
# CLAUDE.md
[3 pages of deployment instructions]
[2 pages of testing guidelines]
[4 pages of API conventions]
```

**Good:**
```markdown
# CLAUDE.md
## Skills
- `/developer` — Code change workflow (includes testing, conventions)
- `/deploy` — Full deployment process
- `/api` — API design patterns and endpoint conventions
```

### Use "Do NOT" Lists

Claude pays strong attention to negative instructions. If Claude keeps making the same mistake, add it to the "Do NOT" section:

```markdown
## Do NOT
- Do NOT use relative imports — always use path aliases (@/src/...)
- Do NOT add console.log for debugging — use the logger service
- Do NOT create new utility files — extend existing ones in src/utils/
```

### Verify Builds After Every Change

Your developer skill should always end with a build verification step. This catches errors immediately instead of letting them accumulate across a conversation.

### One Skill Per Workflow

Don't create a mega-skill that handles everything. Each skill should own one workflow:

| Approach | Result |
|----------|--------|
| One big skill | Claude loads 5,000 tokens of instructions for every task |
| Focused skills | Claude loads 800 tokens for the specific workflow it needs |

### Use Hooks for Guardrails, Not Logic

Hooks should prevent mistakes and log activity. Don't use them to implement complex business logic — that belongs in your application code.

**Good hook uses:**
- Block dangerous commands
- Log session activity
- Inject context at session start
- Notify on task completion

**Bad hook uses:**
- Run database migrations
- Deploy code
- Generate files

### Iterate on Your CLAUDE.md

Your CLAUDE.md is a living document. Every time Claude does something wrong:

1. Figure out what instruction would have prevented it
2. Add that instruction to CLAUDE.md or the relevant skill
3. Test it in the next conversation

Over time, your CLAUDE.md becomes a highly effective set of instructions tailored to your project.

---

## Want More?

This starter kit covers the fundamentals — a solid CLAUDE.md, two essential skills, and basic session tracking. It's enough to meaningfully improve your Claude Code experience.

If you want the full production system, check out the **[Claude Code Pro Kit](https://llitd.com/claude-code-kit)**.

It's what I use daily on a large production codebase (Java backend, React frontend, MCP server, infrastructure-as-code). Here's what the Pro Kit adds beyond this starter:

| Capability | Starter (this repo) | Pro Kit |
|-----------|---------------------|---------|
| CLAUDE.md template | Basic | Topic-based loading (82% token savings) |
| Skills | 2 (developer, deploy) | 20 (code audit, game testing, book pipeline, blog, etc.) |
| Hooks | 1 (session tracking) | 6 (context injection, git guards, agent detection, etc.) |
| Multi-agent | Not included | Full queue-based orchestration |
| MCP server | Not included | Custom MCP server with 40+ tools |
| Dashboard | Not included | Real-time session monitoring |
| Agent spawning | Not included | Concurrent agent pool with task claiming |
| Build verification | Manual | Automated via IntelliJ bridge |

The Pro Kit is a one-time purchase ($29-$149 depending on tier). No subscriptions.

**[Learn more at llitd.com/claude-code-kit →](https://llitd.com/claude-code-kit)**

---

## FAQ

**Q: Does this work with Claude Code Teams/Enterprise?**
A: Yes. The `.claude/` directory structure is standard across all Claude Code tiers.

**Q: Will this conflict with my existing `.claude/` configuration?**
A: If you already have a `.claude/` directory, merge the files manually rather than overwriting. The settings.json hooks array is additive — you can combine entries.

**Q: Do I need an MCP server for this to work?**
A: No. This starter kit uses only built-in Claude Code features (CLAUDE.md, skills, hooks). No external dependencies.

**Q: How do I update when you release new versions?**
A: Check the [releases page](https://github.com/lincolncole/claude-code-starter/releases) for changelogs. Copy updated files manually — don't overwrite your customized CLAUDE.md.

**Q: Can I use this with other AI coding tools?**
A: The CLAUDE.md format is specific to Claude Code. However, the patterns (structured instructions, workflow skills, lifecycle hooks) apply to any AI coding assistant. You'd need to adapt the file format.

---

## Contributing

Contributions are welcome. The goal is to keep this starter kit **minimal and universally useful**.

**Good contributions:**
- Improvements to the CLAUDE.md template
- Bug fixes in the session tracking hook
- Better documentation
- New example skills that are broadly applicable (testing, database, API)

**Out of scope:**
- Framework-specific configurations (React, Django, Rails, etc.)
- Complex hook logic
- Anything that adds dependencies

### How to Contribute

1. Fork the repo
2. Create a branch (`git checkout -b improve-developer-skill`)
3. Make your changes
4. Test with Claude Code on a real project
5. Submit a PR with a description of what you changed and why

---

## License

MIT License. See [LICENSE](LICENSE) for details.

Use it however you want. Attribution appreciated but not required.

---

Built by [Lincoln Cole](https://llitd.com) — author, developer, and full-time Claude Code user.
