# Beast mode

Use this file only when the user says `beast-mode` or `beast mode` in the same request as `/apogee`. Then put that request through the installed poteto-mode playbook. Do not edit the poteto-mode skill. Do not copy its playbooks into this file.

Beast mode is for this request only. The next request is plain Apogee unless the user says beast mode again.

## Find poteto-mode

Find the installed `poteto-mode` skill the same way Apogee finds the apex and db skills. Its directory contains `SKILL.md` and `playbooks/`. If that directory is missing, stop. Say beast mode needs the poteto-mode skill. Do not install it.

## Pick the playbook

| The request | Playbook |
| --- | --- |
| A defect, a failure, or something broken | `playbooks/bug-fix.md` |
| A read-only question about how or why | `playbooks/investigation.md` |
| A new or changed behavior | `playbooks/feature.md` |

Copy that playbook's steps into the todo list before any task-specific todos. A step you cannot run stays in the list as `skip:` and the reason.

## Oracle overrides

Run these in place of the matching poteto-mode step.

1. Run the Apogee freshness script before the playbook's first step. `drifted` or `missing` stops beast mode. Do not edit the project. `unreachable` continues, and you say the freshness check failed.
2. If a skill named `opc` is installed, read it and follow it before design or editing. If it is not installed, leave it off.
3. Read the installed apex or db skill for the facts the playbook's `how` step needs. Do not restate that skill.
4. Reproduce and verify on the Oracle proof in `SKILL.md`. Do not use `control-ui` or `control-cli`. A screenshot is not a pass. Missing live APEX evidence stops the playbook.
5. A subagent step uses `poteto-agent` when this harness has that subagent. Otherwise skip that step and write the change in this session.
6. Skip `/loop` when this harness has no `/loop` command.
7. Investigation writes no code and opens no pull request. Feature and bug fix follow the playbook's pull-request step. If `gh` is missing, skip that step and show the diff.

## Reply

Use the reply shape named at the end of the poteto-mode playbook you ran. Include the freshness `status` and whether `opc` was read.
