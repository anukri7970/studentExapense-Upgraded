# Mobile Responsiveness — Screenshot Checklist

The submission checklist asks for screenshots at 320px, 768px, and 1024px
widths. Every page in this app uses Tailwind's responsive utilities
(`grid md:grid-cols-3`, `hidden sm:inline`, etc.), so nothing needs visual
rework to hit these breakpoints — you just need to capture them.

## How to capture

1. Run the frontend locally (`npm run dev` in `frontend/`) or use your
   deployed Vercel URL.
2. Open Chrome DevTools → Toggle device toolbar (Cmd/Ctrl+Shift+M).
3. Set a custom responsive size for each width below (DevTools lets you
   type an exact pixel width).
4. Screenshot each page at each width. That's 3 pages × 3 widths = 9
   screenshots minimum; more is better.

## Pages to capture

- [ ] Landing page (`/`)
- [ ] Signup (`/signup`)
- [ ] Parent dashboard (`/dashboard/parent`)
- [ ] Student dashboard (`/dashboard/student`) — this one has the most going
      on (charts, forms, tables), so it's worth extra attention here
- [ ] University dashboard (`/dashboard/university`)

## Widths

- [ ] 320px (smallest common phone width — iPhone SE class)
- [ ] 768px (tablet / iPad portrait)
- [ ] 1024px (tablet landscape / small laptop)

## What "good" looks like at 320px specifically

- No horizontal scroll on the page itself (tables may scroll internally —
  that's expected and fine, `TransactionList` and `ExpenseList` both wrap
  their `<table>` in `overflow-x-auto` for exactly this reason).
- The wallet-address chip and "Feedback" link in the header collapse via
  `hidden sm:inline` rather than overlapping the role badge.
- Stat cards stack to a single column (`grid md:grid-cols-3` → 1 column
  below the `md` breakpoint).
- All buttons remain tappable (minimum ~40px touch target — the `lg` button
  size already clears this).

If anything looks cramped at 320px when you actually check it, the fix is
almost always reordering a `grid-cols-N` to start at 1 and step up at `md`/
`lg`, not a one-off CSS patch — keep that pattern consistent if you adjust
anything.
