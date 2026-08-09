# KPuppy performance knowledge base

This is the shared source of truth for performance work in KPuppy. It is meant
for humans and multiple coding agents: read it before profiling or changing a
performance-sensitive path, and update it when a finding is confirmed, fixed,
rejected, or superseded.

Last updated: **2026-08-09**, release **v0.0.93**.

## 1. Product and platform constraints

KPuppy targets LG webOS TVs and an old browser engine (`browserslist` is
Chrome 53). CPU, GPU, memory, image decoding, storage, and networking all share
limited TV resources. A desktop browser can hide problems that are obvious on
the TV.

The following are product requirements, not optimization opportunities:

- Movie and series cards should keep their available information. Do not make
  the UI faster by removing ratings, country, cast, description, or other data
  unless the user explicitly approves that trade-off.
- The large item poster may appear after a delay, but it must load reliably.
  Reliability is more important than making that poster appear a fraction of a
  second earlier.
- Keyboard/D-pad, Magic Remote pointer, and mouse wheel behavior must all
  remain usable.
- Avoid modern browser assumptions. In particular, native `loading="lazy"`
  and `ResizeObserver` are not reliable assumptions for Chrome 53.

## 2. Non-negotiable image-rendering invariant

Read [`.cursor/rules/webos-image-rendering.mdc`](../.cursor/rules/webos-image-rendering.mdc)
before editing item-card image code.

The large item banner is intentionally implemented as:

1. off-DOM preload with `useDecodedImage`;
2. retries and a safety timeout;
3. mount only after preload completes;
4. downscale/crop through `drawBannerCover` onto a screen-sized canvas.

Do not replace this pipeline with a full-resolution `<img>`. On affected webOS
devices, that can stall the compositor: the spinner appears frozen and the
poster only appears after a key press. Previously attempted opacity,
`translateZ`, `decode()`, repaint-timer, and early-mount workarounds were not
reliable.

Any future memory optimization of this pipeline must preserve all four stages
and be verified on a real TV with several large and bright posters.

## 3. Current performance baseline

These values are reference points, not permanent budgets. Update them after a
material performance change or dependency upgrade.

| Measurement | v0.0.93 baseline | How verified |
| --- | ---: | --- |
| Automated tests | 620 passing | `npm run test:run` |
| Production bundle | 634.43 kB | Vite build output |
| Production bundle, gzip | 190.39 kB | Vite build output |
| Continue Watching initial network fan-out | 2 list requests | movies + serials |
| Continue Watching metadata concurrency | maximum 3 | worker pool in `enrichMovieItemsMeta` |
| Player time UI updates | maximum 1 per displayed second | integer-second guard |
| Playback progress submission | approximately every 10 seconds | existing player callback |
| API cache default TTL | 5 minutes | `src/api/cache.ts` |

The full repository ESLint baseline at v0.0.91 contains five pre-existing
errors outside this performance batch: invalid `react-hooks/exhaustive-deps`
disable comments in Bookmarks/Category and `prefer-const` findings in
Collections/History. There are also two existing `no-explicit-any` warnings in
`kinopub.ts`. Do not report these as a regression from unrelated work, but do
not add new lint debt.

## 4. Implemented optimizations

### v0.0.93

| Area | Current design | Expected effect |
| --- | --- | --- |
| Episode thumbnails | A broken episode URL falls back to the series poster; silent stalls retain bounded retries; failure of both sources shows a local placeholder | Removes persistent broken-image tiles without weakening transient webOS load recovery |

### v0.0.92

| Area | Current design | Expected effect |
| --- | --- | --- |
| Wheel/D-pad hand-off | A directional key cancels any active wheel ease-out before focus scrolling runs | Prevents a stale wheel target from pulling the newly focused card outside the viewport |
| Wheel frame pacing | Scroll position follows elapsed frame time, with a temporary `scroll-position` hint and no focused-card drop-shadow while moving | Avoids the sub-pixel animation tail and reduces old-Chromium repaint work |

### v0.0.91

| Area | Current design | Expected effect |
| --- | --- | --- |
| Home / Continue Watching | Render the base movies + serials lists immediately; fill missing rating/year/quality in the background | The row is no longer blocked by one item-detail request per card |
| Metadata enrichment | `enrichMovieItemsMeta(items, concurrency)` uses a worker pool, currently capped at 3 for UI callers | Avoids request, JSON parsing, and garbage-collection bursts on Chrome 53 |
| New episodes / watching category | Base cards render before the same bounded enrichment | Faster first useful paint without losing metadata |
| Wheel scrolling | Wheel deltas accumulate into a `requestAnimationFrame` ease-out target | Removes the discrete, jerky feel of Magic Remote wheel ticks |
| Loading UI | Home-row spinner is horizontally centered | Correct feedback while a row is unavailable |
| Media links | `getMediaLinks` uses the shared five-minute cache and in-flight request deduplication | Avoids duplicate media-link work between the item card and Play |
| Watch-list state | Series membership reuses cached `getWatchingSerials()` | Removes the previous movies + serials double request on every series card |
| Playback progress cache | `markTime` patches cached item progress locally | Back navigation retains a warm item card and an up-to-date resume time |
| List invalidation | Watching/history lists are invalidated once when VOD playback closes | Avoids broad cache walks and cold refetches every progress tick |
| Player rendering | Current time state changes at most once per integer second; qualities are memoized | Reduces VNode reconciliation while video decoding is active |
| Controls rendering | Showing already-visible controls reuses the previous state object | Pointer movement still resets the hide timer without forcing a render |

Relevant code paths:

- `src/api/kinopub.ts`: watching, enrichment, media-links, mark-time cache patch
- `src/api/cache.ts`: TTL, in-flight deduplication, invalidation semantics
- `src/screens/MainScreen.tsx`: progressive Continue Watching rendering
- `src/screens/CategoryScreen.tsx`: progressive watching-category rendering
- `src/screens/NewEpisodesScreen.tsx`: progressive new-episode rendering
- `src/screens/PlayerScreen.tsx`: player UI update frequency
- `src/hooks/useWheelScroll.ts`: accumulated smooth wheel movement
- `src/app.tsx`: playback lifecycle and list invalidation

## 5. Open findings and priorities

These findings came from static review, not a device profiler trace. Reproduce
and re-read the current implementation before making changes. Priorities are
based on likely TV impact.

### P0 — highest expected impact

1. **Play preparation unmounts the browse UI.**
   `app.tsx` returns a standalone preparation overlay while there is no player,
   so home/grids/posters can be destroyed and mounted again. Investigate
   keeping `ScreenManager` mounted under the overlay. Verify Play, failed Play,
   Back, native player return, trailers, and Live TV.

2. **Card poster downloads are not truly lazy on Chrome 53.**
   `PosterImage` retries stalled requests, but its native `loading="lazy"`
   attribute cannot be trusted on the target browser. A home screen may start
   many poster downloads and decodes at once. Prefer explicit visible/near-
   visible source gating or row/card windowing. Preserve retry behavior.

3. **Quality navigation reloads the stream on every Up/Down step.**
   `PlayerScreen.selectQuality` immediately tears down and reloads playback.
   Prefer moving a pending highlight and applying on Enter, or a carefully
   tested debounce. Verify audio selection, resume time, MSE fallback, Back,
   pointer clicks, and colored remote keys.

4. **Large season screens can mount too many episode images.**
   `VirtualGrid` defaults to a render buffer of 48 and multiple season grids
   can coexist. Measure DOM nodes and memory for a long-running series. Options
   include a smaller buffer for unfocused seasons or mounting only the focused
   season grid.

### P1 — meaningful, measure before implementation

1. **Focus and search state are lifted into `App`.** Frequent D-pad or IME
   updates may reconcile the base layout and menu. Consider keeping transient
   focus/query state local and persisting it only on leave/select/Back.
2. **Search and category loading can replace the existing grid.** Prefer soft
   loading, retained results, and request-generation guards so stale responses
   cannot overwrite newer filters.
3. **All home rows and cards stay mounted.** Measure DOM count, image requests,
   and focus-navigation cost before adding vertical/horizontal windowing.
4. **Tokens are parsed from localStorage in API paths.** Consider an in-memory,
   write-through token cache if profiling shows meaningful synchronous storage
   cost during home fan-out.
5. **The API cache is unbounded and uses substring invalidation.** Consider an
   LRU/size cap plus exact-key or explicit-prefix invalidation. Preserve
   in-flight deduplication and current navigation behavior.
6. **hls.js runs on the main thread with 40-second buffers.** Measure buffering,
   memory, and dropped frames on weak TVs before changing buffer sizes. Network
   stability may be more important than lower memory use.
7. **The decoded source for the item banner may remain alive after canvas
   draw.** Releasing it could save memory, but must not weaken the reliable
   banner pipeline described above.
8. **The `<video>` poster can use large artwork.** Confirm whether it causes the
   same compositor/memory class of problem before using a smaller thumbnail or
   omitting it.

### P2 — lower expected impact

1. Focused movie cards use CSS `drop-shadow`, which can be expensive on an old
   GPU. It is disabled during wheel movement; compare the remaining static
   shadow with a simpler border/box-shadow on the actual TV.
2. Per-title audio preferences (`kpuppy_audio_*`) are not pruned. A capped map
   would prevent slow storage growth over long-lived installations.

## 6. Measurement protocol

Do not claim a performance improvement from code inspection alone. For every
device measurement, record:

- app version and commit;
- TV model/year, webOS version, and connection type;
- content ID or screen used;
- cold start versus warm cache;
- what was measured and how many repetitions;
- before/after result and any behavioral trade-off.

Useful scenarios:

1. Cold-open Home and time until the first useful row and Continue Watching
   cards appear.
2. Count requests in the first 10 seconds, especially item details and posters.
3. Scroll Home vertically and a row horizontally using the Magic Remote wheel.
4. Open/close ten item cards and observe memory recovery and poster reliability.
5. Start playback, watch for at least two minutes, open/close controls, then
   return to the item card and Home.
6. Open a long series, change seasons, select episodes, and observe memory and
   input latency.
7. Open the quality panel and navigate across every option without unintended
   stream reloads.

When exact profiling is unavailable, use repeatable proxies: request counts,
DOM/image counts, state-update counts, time stamps around API stages, and
recorded video of input-to-paint latency. Clearly label such results as proxies.

## 7. Multi-agent coordination

Performance work commonly overlaps a few high-conflict files:
`src/app.tsx`, `src/api/kinopub.ts`, `src/api/cache.ts`,
`src/screens/PlayerScreen.tsx`, and `src/screens/ItemScreen.tsx`.

Before parallel work:

1. Give each agent one bounded subsystem and an explicit file set.
2. Assign only one owner to each high-conflict file.
3. State whether the task is diagnosis-only or includes implementation.
4. Require each agent to report evidence, behavioral risks, tests, and touched
   files—not only a proposed patch.
5. Integrate and test related changes together; independently passing patches
   can still conflict through App state, caching, or focus behavior.

Use this hand-off template:

```md
### Performance hand-off
- Scope:
- Status: investigating | implementing | verified | blocked
- Files owned/touched:
- Baseline/reproduction:
- Change or finding:
- Evidence:
- Behavioral risks:
- Tests/device checks:
- Follow-up:
```

Do not use this document as a shared lock file during simultaneous edits.
Nominate one agent/integrator to update the status tables after collecting the
other agents' hand-offs.

## 8. Verification checklist

Minimum automated checks for performance changes:

```bash
npm run test:run
npx tsc --noEmit
npm run build
git diff --check
```

Run `npm run lint` and `npm run lint:css` as diagnostics. Compare failures with
the baseline above so existing debt is not confused with a regression.

Minimum behavior checks on a TV or the closest available webOS environment:

- Home opens and both wheel directions remain controllable.
- Continue Watching appears quickly and later gains all available metadata;
  no data disappears during enrichment.
- A large item poster eventually appears without requiring a key press.
- Item loading, Play, failed Play, Back, and repeated navigation do not strand a
  spinner or lose navigation state.
- Movies and series resume correctly after progress updates.
- Previous/next episode controls and end-of-episode auto-advance still work.
- Audio, subtitles, quality, pointer, D-pad, and colored keys remain functional.
- Home/history/watching are fresh after leaving playback.

## 9. Updating this document

For every completed performance change:

1. Move or annotate the corresponding open finding.
2. Add the final design to **Implemented optimizations**.
3. Update the baseline numbers if tests or bundle size changed materially.
4. Record real-device evidence when available.
5. Keep historical explanation concise; Git remains the detailed history.

Release mechanics are documented separately in [`docs/RELEASE.md`](RELEASE.md).
