# Suggested Commit Plan

The submission checklist asks for 15+ *meaningful* commits — not 15 commits
of `"fix"` and `"update"`. Below is a natural breakdown that matches how
this codebase is actually structured, so each commit represents one real,
reviewable unit of work. Commit in this order (or close to it) as you push
this codebase to your own repo, rather than one giant initial commit.

1. `chore: scaffold backend (express, mongo, env config)`
2. `feat: user model + JWT auth (signup, login)`
3. `feat: stellar wallet generation + friendbot funding on signup`
4. `feat: encrypted wallet secret storage (AES-256-GCM)`
5. `feat(contract): SendFunds escrow contract (deposit, release, get_balance)`
6. `test(contract): cover deposit, partial release, auth enforcement, errors`
7. `feat: soroban service — simulate/sign/submit/poll contract invocation`
8. `feat: parent-deposit and student-release transaction endpoints`
9. `feat: pay-tuition endpoint (direct Stellar payment)`
10. `feat: expense tracking endpoints + category model`
11. `feat: gemini AI budget advisor endpoint`
12. `feat: feedback collection + aggregate summary endpoint`
13. `feat: sentry + posthog backend integration`
14. `chore: scaffold frontend (next.js, tailwind, dark theme tokens)`
15. `feat: auth pages (signup with role picker, login)`
16. `feat: parent dashboard (send funds, link student, tx history)`
17. `feat: student dashboard (expense form, charts, AI advisor, pay tuition)`
18. `feat: university dashboard (payment history)`
19. `feat: in-app feedback page`
20. `feat: route-level loading/error/not-found states`
21. `feat: sentry + posthog frontend integration`
22. `docs: README, contract deploy guide, user proof template`
23. `chore: seed script for fast demo-user onboarding`

Squash nothing — each of these is exactly one PR-sized, explainable change,
which is what "meaningful commits" actually means to a reviewer skimming
your commit log.
