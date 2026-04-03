# Decapod & File Rewrite Behavior — Investigation Results

## What is Decapod?

**Decapod** is part of the **OpenSpec/OpenClaw** automated validation and specification system. Based on the codebase evidence:

- Listed in `CONTINUE.md` line 64 as a "Pending Task": "OpenSpec + Decapod validation"
- Part of the broader OpenClaw project infrastructure (see git commit author: kypris@openclaw.ai)
- Appears to be a validation/specification tool for software development workflows

## Why Do AGENTS.md and CLAUDE.md Get Rewritten?

### Root Cause

The file rewrites are **NOT directly caused by Decapod**. Instead, they are part of the **"eject" skill workflow** documented in `PLAN.md` (lines 127-140).

### The Eject Workflow

Location: `~/.openclaw/workspace/skills/eject/SKILL.md`

**Purpose**: Create a complete project context package for handoff/local development

**Actions performed**:
1. Identify current project directory
2. Gather all project files
3. **Generate CLAUDE.md** (Claude Code project configuration)
4. **Generate CONTINUE.md** (current state, completed work, next steps)
5. Create zip file for distribution

**Evidence from CONTINUE.md**:
- Line 3: `Generated: 2026-04-03T13:45 CEST`
- Line 4: `Source: OpenClaw session 2026-04-02/03`

These timestamps show that CONTINUE.md is **intentionally regenerated** each session to capture the current project state.

### File Roles

| File | Purpose | Regenerated? |
|------|---------|--------------|
| **CLAUDE.md** | Project config for Claude Code AI sessions | Yes, by eject skill |
| **AGENTS.md** | Source hierarchy and provenance rules | Should be stable, checked into git |
| **CONTINUE.md** | Session handoff notes (current state, next steps) | Yes, per session |

## How to Prevent Unwanted Rewrites

### Strategy 1: Don't Trigger the Eject Skill
- The eject skill runs when you say "eject" or "eject this project"
- Avoid triggering it unless you want a project handoff package

### Strategy 2: Protect Files with Git
- Commit `AGENTS.md` and `CLAUDE.md` to version control
- If they get regenerated, use `git diff` to review changes
- Use `git checkout -- AGENTS.md CLAUDE.md` to restore original versions

### Strategy 3: Customize the Eject Skill
Edit `~/.openclaw/workspace/skills/eject/SKILL.md` to:
- Skip regenerating certain files
- Use different generation rules
- Preserve custom sections in AGENTS.md/CLAUDE.md

### Strategy 4: Accept CONTINUE.md as Ephemeral
- **CONTINUE.md is designed to be regenerated** — don't fight it
- Keep permanent project context in AGENTS.md and CLAUDE.md
- Use CONTINUE.md for session-specific notes and TODOs

## Configuration Files

No Decapod-specific configuration files found in this repository:
- No `.decapod` file
- No `.opsx` file
- No `.openspec` directory
- Behavior is controlled by the eject skill implementation

## Recommended Workflow

1. **Keep in version control**: AGENTS.md, CLAUDE.md, README.md, PLAN.md
2. **Let regenerate freely**: CONTINUE.md (it's a session artifact)
3. **Review before committing**: Check `git diff` after any eject operation
4. **Restore if needed**: `git checkout -- <file>` to undo unwanted changes

## References

- `/tmp/mythras-pdf-decapod/CONTINUE.md` — mentions Decapod as pending validation task
- `/tmp/mythras-pdf-decapod/PLAN.md` — documents eject skill workflow (Phase 3)
- Git history — shows files authored by kypris@openclaw.ai (OpenClaw infrastructure)
