---
name: apogee
description: >-
  Routes Oracle APEX and Oracle Database work to the installed apex and db
  skills, then checks those installs against github.com/oracle/skills before
  editing. Use when the user invokes /apogee or asks Apogee to build, change,
  review, or validate an APEX app, APEXlang, SQL, PL/SQL, SQLcl, or utPLSQL.
  When the user says beast-mode, read beast-mode.md and run the installed
  poteto-mode playbook with the Oracle proof gates.
disable-model-invocation: true
---

# Apogee

Use this skill only when the user invokes `/apogee`. It plans the work. The installed apex skill owns APEX. The installed db skill owns generic SQL, PL/SQL, SQLcl, and utPLSQL. Do not copy either skill into this file.

## Start

1. Find the installed skill directories. Look in the skill paths this session already loaded, then in the project and user skill folders. The apex directory contains `apexlang/SKILL.md`, or is the `apexlang` directory. The db directory contains `SKILL.md` plus category directories such as `agent/` and `sqlcl/`.
2. Run this script from the `apogee` skill directory. Pass only the owner this task needs. A database task with no APEX work omits `--apex`. An APEX task with no generic database work omits `--db`.

```bash
node scripts/check-freshness.mjs --apex "<apex-dir>" --db "<db-dir>"
```

3. Read the JSON. Use `status` and `continue_work`.

| status | Action |
| --- | --- |
| `current` | Continue. |
| `unreachable` | Say the freshness check failed. Do not call the install current. Continue the task. |
| `drifted` | Show `facts`. Stop. Do not edit the project. Do not update skills. Do not import. |
| `missing` | Name the missing skill. Stop that owner's work. |

4. Run `npx skills update` only after a later user instruction to update. The turn that found drift does not update.
5. After an update, run the freshness script again before editing. Until that update, follow the skill that is installed.

The script compares the installed tree with `https://github.com/oracle/skills` `main`. Ignore GitHub releases, git tags, and marketplace version `1.0.0`.

## Beast mode

If the user says `beast-mode` or `beast mode` in this request, read [beast-mode.md](beast-mode.md) and follow it. Any other `/apogee` request stays on the steps in this file. Beast mode applies to that request only.

## Route

Open the installed skill's `SKILL.md` and follow that file.

- APEX pages, APEXlang, APEX import, and APEX runtime checks belong to the apex skill.
- Generic SQL, PL/SQL, SQLcl, and utPLSQL belong to the db skill.
- A task that needs both owners still keeps each change inside the skill that owns it.

## Boundaries

When the project being changed has `apogee.json`, apply its `deny_globs` before editing a file.

```bash
node scripts/check-freshness.mjs --config apogee.json --path "<file>"
```

Exit code 2 means the path is denied. Stop and name the matching glob. A missing `apogee.json` denies nothing. `skills/apogee/examples/apogee.json` shows the file shape. It is not the default policy.

When the APEX version is below 26.1, do not edit an `apex` export folder or a root `f<id>.sql` file unless the user explicitly tells you to edit that file. When the version is unknown, ask before editing those paths. When the version is 26.1 or newer, follow the installed apex skill for export paths.

## Preference controller

Leave the oracle-preference-controller off unless the user opts in. Opt-in means the user asks for it, or a skill named `opc` is already installed. Then read that skill and follow it. Do not install it. Do not copy its rules here. It reads `oracle_project_config.toml`. Its repository is `https://github.com/xamdxlonewolf/oracle-preference-controller`.

## Proof

Use the proof gate in the skill that owns the change.

For APEX work, run the live check that the installed apex skill names. A parse, a local lint, or a screenshot does not finish the task. If that skill blocks completion because live evidence is missing, stop with that block.

Do not import in the freshness turn. Do not import after a live check unless the user asked to import. A later message that says to import is that request.

For database work, read the database state the db skill names. Report the statement you ran and the value you read.

## Do not

- Do not edit poteto-mode. Plain Apogee does not load it. Beast mode reads it.
- Do not vendor apex or db skill text.
- Do not require a Cursor subagent, Custom Mode, or `/loop`.
- Do not use `control-ui` or `control-cli` as the proof.
- Do not write a `.cursor/skills/` verification skill from this mode.
