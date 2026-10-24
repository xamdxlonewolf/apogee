# Apogee

Apogee is an agent skill for Oracle APEX and Oracle Database work. It sends APEX work to the installed apex skill and database work to the installed db skill. Before editing, it compares those installs with [oracle/skills](https://github.com/oracle/skills) on `main`.

## Install the skill

From the project where you want Apogee, run:

```bash
npx skills add xamdxlonewolf/apogee
```

Add `-g` to install it for every project on that machine. The skill id is `apogee`. Invoke it with `/apogee`.

Say `/apogee beast-mode` before the task when you want that task to follow the installed poteto-mode playbook. Plain `/apogee` does not load poteto-mode. Beast mode also needs the poteto-mode skill installed.

The same command works for the agents the skills CLI supports, including Cursor, Claude Code, and Codex. To copy the files yourself, point the harness at `skills/apogee`.

Installing Apogee does not install the Oracle skills. Install those from the upstream repository.

```bash
npx skills add oracle/skills/apex
npx skills add oracle/skills/db
```

## Check freshness

Run the script from the `skills/apogee` directory. Pass the installed skill directories.

```bash
node scripts/check-freshness.mjs --apex "<apex-dir>" --db "<db-dir>"
```

The command prints JSON. `continue_work` false means stop and show `facts`. The script does not download new skills. Run `npx skills update` only when you decide to update.

## Add path rules

Create `apogee.json` in the project you want to protect. `skills/apogee/examples/apogee.json` shows `deny_globs`. Apogee does not ship those globs as policy. Omit the file when you have no extra bans.
