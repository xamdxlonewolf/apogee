# Apogee

Apogee is an agent skill for Oracle APEX and Oracle Database work. It sends APEX work to the installed apex skill and database work to the installed db skill. Before editing, it compares those installs with [oracle/skills](https://github.com/oracle/skills) on `main`.

## Install the skill

Point the harness at `skills/apogee`. The skill id is `apogee`. Invoke it with `/apogee`.

- Cursor. Link or copy `skills/apogee` to `.cursor/skills/apogee` in a project, or to the personal Cursor skills directory.
- Claude Code. Link or copy `skills/apogee` to `.claude/skills/apogee`.
- Codex and other Agent Skills hosts. Load the `skills/apogee` directory.

Installing Apogee does not install the Oracle skills. Install those from the upstream repository, for example `npx skills add oracle/skills/apex` and `npx skills add oracle/skills/db`.

## Check freshness

Run the script from the `skills/apogee` directory. Pass the installed skill directories.

```bash
node scripts/check-freshness.mjs --apex "<apex-dir>" --db "<db-dir>"
```

The command prints JSON. `continue_work` false means stop and show `facts`. The script does not download new skills. Run `npx skills update` only when you decide to update.

## Add path rules

Create `apogee.json` in the project you want to protect. `skills/apogee/examples/apogee.json` shows `deny_globs`. Apogee does not ship those globs as policy. Omit the file when you have no extra bans.
