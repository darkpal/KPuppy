# KPuppy agent notes

Before changing performance-sensitive code, read
[`docs/PERFORMANCE.md`](docs/PERFORMANCE.md). It is the shared performance
baseline, current status, backlog, verification checklist, and hand-off format
for all agents working on this repository.

For item-card or poster work, also read
[`.cursor/rules/webos-image-rendering.mdc`](.cursor/rules/webos-image-rendering.mdc)
in full before editing. The large item banner uses a deliberately defensive
webOS rendering pipeline. Do not replace it with a normal full-resolution
`<img>` or remove its preload/retry/canvas stages without explicit user scope
and evidence from a real TV.

Project-wide performance rules:

- Do not reduce visible metadata or content as a performance shortcut unless
  the user explicitly requests that product trade-off.
- Prefer progressive rendering: show complete base data first and enrich it in
  the background with bounded concurrency.
- Preserve useful caches during playback; use targeted invalidation at a
  lifecycle boundary instead of broad invalidation on a timer.
- Revalidate an item in the performance backlog against current code before
  implementing it. The backlog records hypotheses, not automatic permission
  to change unrelated behavior.
- When a performance change lands, update the status and evidence in
  `docs/PERFORMANCE.md` in the same commit.

