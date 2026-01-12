Run `bv --robot-next` to get the next ticket to work on.
Parse the json to get the <ticket-id>.

```
{
  "generated_at": "2026-01-12T10:34:08Z",
  "data_hash": "2af38c06d5ba97a8",
  "id": "eval-t8d",
  "title": "Fix Optimization Modal Targeting",
  "score": 0.14054553399210407,
  "reasons": [
    "✅ Currently unclaimed - available for work",
    "🚨 High priority (P0) - prioritize this work"
  ],
  "unblocks": 0,
  "claim_command": "bd update eval-t8d --status=in_progress",
  "show_command": "bd show eval-t8d"
}
```

Follow these steps:

1. Run `/k2:start <ticket-id> --skip-worktree`
2. Send the summary with this bash command `tt -m "<summary>"`, ensure the summary is properly escaped.

IMPORTANT:

- Measure the total time of execution and amount of token. Output it.
- Display the Summary and send the notif with tt command.
