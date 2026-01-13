Study specs/requirements-specification.md
Study specs/execution-plan.md

Run `bd ready` to get the list of ticket to work on.
You can use tool `bv --robot-triage` to get more context which ticket is not in progres and high score.
Find the most important ticket to work assigned it as <ticket-id>.

Follow these steps:

1. Run `/k2:start <ticket-id> --skip-worktree`
2. Send the summary with this bash command `tt -m "<summary>"`, ensure the summary is properly escaped.

Summary Format:

```
Ticket ID: The ticket ID
PR: Link to Pull Request (status of PR)
Total File Changes: Total file being changed.

Summary:
- Bullet points of what's being done,

Follow Up tickets
- New ticket IDs if any new follow up ticket created.

Stats:
- Total time Execution: in x hours xx minutes
- Estimated Token used: Total token being used
```

IMPORTANT:

- Measure the total time of execution and amount of token. Output it.
- Display the Summary and send the notif with tt command.
