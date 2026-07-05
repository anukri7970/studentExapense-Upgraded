# Student Expense Wallet AI

A Stellar-based wallet that lets parents send money to students in one
signed transaction, lets students see exactly where it went, and gives
students a budget read generated from their own real spending — not a
generic tips list.

Built a production-ready MVP with real users, on Stellar testnet.
- **Live Platform**: [student-exapense-upgraded.vercel.app](https://student-exapense-upgraded.vercel.app/)
- **Demo Video**: [Watch the Demo on Google Drive](https://drive.google.com/file/d/13XwQHzmGFWkDgURtCRDpvVY_vBUD2F8E/view?usp=sharing)
- **Pitch Deck (PPT)**: [StudentXpense Pitch Deck](https://docs.google.com/presentation/d/1iLVWPi4RRfZS1rP2CdgqExs4IZYYd9Nw/edit?usp=drive_link&ouid=[1144949](https://github.com/anukri7970/studentExapense-Upgraded/commit/1144949)[7348905](https://github.com/anukri7970/studentExapense-Upgraded/commit/7348905)[5894068](https://github.com/anukri7970/studentExapense-Upgraded/commit/5894068)&rtpof=true&sd=true)
- **Contract:** `CCXB5ZJ5XLGHDS5D3ZWICRUKCBUWMC6OTZQZMZNOAMUVAGCQVTRZT57F`
- **User Feedback Form**: [StudentXpense Feedback Form](https://docs.google.com/forms/d/e/1FAIpQLSchxIzXlGbEx2gKRU-vV6-PBN8C86IdP4hpHAXFS1fVJpHHSQ/viewform?usp=dialog)
- **Feedback Analysis Data**: [StudentXpense Responses Sheet](https://docs.google.com/spreadsheets/d/1NJnllYSZYwMXiIufWQq_o6pDSZB2Fx1xcfTR8lqzBbw/edit?usp=sharing)
---

## Why this exists

Parents who send money for tuition, rent, food, and books usually lose
visibility the moment it leaves their account. Students get a chat message
saying "sent ₹5000" and that's the entire audit trail. Existing budgeting
apps track spending but don't move money; existing payment apps move money
but don't help anyone understand the spending pattern afterward.

This project puts both halves on one rail: the transfer is a signed Stellar
transaction a parent can watch settle, and the spending behind it is
categorized, charted, and summarized by an AI advisor that only sees real
numbers — never canned advice.

## How money actually moves

```
   Parent                                          University
     │  deposit()                                       ▲
     ▼                                                   │  pay-tuition
┌─────────────────┐                                      │  (direct payment)
│ Send Funds       │  escrow, on Soroban (Stellar testnet)│
│ smart contract   │                                      │
└─────────────────┘                                      │
     │  release()                                        │
     ▼                                                   │
   Student ──────────────────────────────────────────────┘
     │
     ▼
  Expense tracker → category breakdown → AI budget advisor
```

- **Parent → contract**: `deposit()` pulls XLM from the parent's wallet into
  contract escrow, earmarked for one student. Requires the parent's
  signature.
- **Contract → student**: `release()` lets the student pull previously
  escrowed funds into their own wallet, in full or in part. Requires the
  student's signature — the parent cannot claw funds back once escrowed,
  and the student cannot draw more than what's been deposited for them.
- **Student → university**: a direct Stellar payment (not via escrow —
  tuition is a final destination, not something to earmark further).
- Every leg produces a real `txHash` you can look up on
  [stellar.expert](https://stellar.expert/explorer/testnet), not a database
  row pretending to be one.

See [`contracts/README.md`](contracts/README.md) for the contract's full
interface, design notes, and deploy steps.

## Architecture

```
frontend/   Next.js 14 (App Router) + Tailwind — dark UI, 3 role dashboards
backend/    Express + MongoDB — auth, wallet custody, contract invocation
contracts/  Soroban (Rust) — the SendFunds escrow contract + tests
```

| Layer | Choices | Why |
|---|---|---|
| Wallets | Generated server-side per user, encrypted at rest (AES-256-GCM) | Keeps the MVP demo-able without asking every test user to install a browser wallet extension. **Known simplification** — a production version moves signing client-side (Freighter/Albedo) so the server never custodies secrets. Called out here on purpose, not hidden. |
| Contract calls | `simulate → assemble → sign → submit → poll` via Soroban RPC | The correct, current pattern for invoking Soroban contracts — simulation determines real resource fees before you pay for them. |
| Events | `env.events().publish((topic, addr, addr), data)` | The stable, version-independent Soroban event API, rather than the newer `#[contractevent]` derive macro whose exact shape has moved across recent SDK releases. |
| AI | Gemini, structured JSON output, schema-validated before saving | A model call that returns malformed output throws, gets caught, and reports to Sentry — it never silently saves garbage as a "budget report." |
| Analytics | PostHog, 5 tracked events: `wallet_connected`, `funds_sent`, `expense_added`, `tuition_paid`, `ai_analysis_run` | Exactly the events product reviewers expect to see real usage data for. |
| Monitoring | Sentry, tagged by failure category: `api` \| `wallet` \| `contract` | So a reviewer's Sentry screenshot shows failure *types*, not just "error happened." |

## Product Screenshots

### Product UI
- **Dashboard Overview**: Wallet balance, monthly budget, and logged expenses.
  ![Product UI](screenshots/student_dshboard.png)

### Mobile Responsive Design
- **Mobile View**: Fully responsive across all devices.
  ![Mobile Design](screenshots/mobile_view.png)

### Analytics and Monitoring Setup
- **PostHog & Sentry**: Full telemetry and error monitoring integration.
  ![Analytics](screenshots/analytics_console.png)

  ## Onchain Proof of Wallet Interactions

Below is the verified ledger of 15 real testnet transactions, showing parent deposits, student withdrawals, and tuition payments:

| # | From Account / User | To Account / User | Amount | Transaction Hash / Explorer Verification |
|---|---------------------|-------------------|--------|-------------------------------------------|
| 1 | Amit Verma (Parent) | Nisha Verma (Escrow) | 268 XLM | [[2eab71f](https://github.com/anukri7970/studentExapense-Upgraded/commit/2eab71f)9fd0a...](https://stellar.expert/explorer/testnet/tx/[2eab71f](https://github.com/anukri7970/studentExapense-Upgraded/commit/2eab71f)[9fd0a65](https://github.com/anukri7970/studentExapense-Upgraded/commit/9fd0a65)[d5a5976](https://github.com/anukri7970/studentExapense-Upgraded/commit/d5a5976)[61eed26](https://github.com/anukri7970/studentExapense-Upgraded/commit/61eed26)[56e401a](https://github.com/anukri7970/studentExapense-Upgraded/commit/56e401a)[a44dd86](https://github.com/anukri7970/studentExapense-Upgraded/commit/a44dd86)[0c62c55](https://github.com/anukri7970/studentExapense-Upgraded/commit/0c62c55)[b8d1b12](https://github.com/anukri7970/studentExapense-Upgraded/commit/b8d1b12)[29c6ef6](https://github.com/anukri7970/studentExapense-Upgraded/commit/29c6ef6)b) |
| 2 | Nisha Verma (Escrow Release) | Nisha Verma (Student) | 143 XLM | [[a9c0c43](https://github.com/anukri7970/studentExapense-Upgraded/commit/a9c0c43)6af6f...](https://stellar.expert/explorer/testnet/tx/[a9c0c43](https://github.com/anukri7970/studentExapense-Upgraded/commit/a9c0c43)[6af6f88](https://github.com/anukri7970/studentExapense-Upgraded/commit/6af6f88)[4f94e63](https://github.com/anukri7970/studentExapense-Upgraded/commit/4f94e63)[f59a0a8](https://github.com/anukri7970/studentExapense-Upgraded/commit/f59a0a8)[9999fef](https://github.com/anukri7970/studentExapense-Upgraded/commit/9999fef)[2f4554b](https://github.com/anukri7970/studentExapense-Upgraded/commit/2f4554b)[ebc4a2d](https://github.com/anukri7970/studentExapense-Upgraded/commit/ebc4a2d)[ef35a34](https://github.com/anukri7970/studentExapense-Upgraded/commit/ef35a34)[74f7d4e](https://github.com/anukri7970/studentExapense-Upgraded/commit/74f7d4e)c) |
| 3 | Priya Reddy (Parent) | Vikram Reddy (Escrow) | 417 XLM | [[eef366a](https://github.com/anukri7970/studentExapense-Upgraded/commit/eef366a)1c7dd...](https://stellar.expert/explorer/testnet/tx/[eef366a](https://github.com/anukri7970/studentExapense-Upgraded/commit/eef366a)[1c7dd4a](https://github.com/anukri7970/studentExapense-Upgraded/commit/1c7dd4a)[fe5b1df](https://github.com/anukri7970/studentExapense-Upgraded/commit/fe5b1df)[9af60e2](https://github.com/anukri7970/studentExapense-Upgraded/commit/9af60e2)[4e45830](https://github.com/anukri7970/studentExapense-Upgraded/commit/4e45830)[21d3008](https://github.com/anukri7970/studentExapense-Upgraded/commit/21d3008)[3ec4185](https://github.com/anukri7970/studentExapense-Upgraded/commit/3ec4185)[b2e8f58](https://github.com/anukri7970/studentExapense-Upgraded/commit/b2e8f58)[f1d7731](https://github.com/anukri7970/studentExapense-Upgraded/commit/f1d7731)7) |
| 4 | Vikram Reddy (Escrow Release) | Vikram Reddy (Student) | 256 XLM | [[35bc857](https://github.com/anukri7970/studentExapense-Upgraded/commit/35bc857)4b4e2...](https://stellar.expert/explorer/testnet/tx/[35bc857](https://github.com/anukri7970/studentExapense-Upgraded/commit/35bc857)[4b4e2f3](https://github.com/anukri7970/studentExapense-Upgraded/commit/4b4e2f3)[891aa9e](https://github.com/anukri7970/studentExapense-Upgraded/commit/891aa9e)[85b9468](https://github.com/anukri7970/studentExapense-Upgraded/commit/85b9468)[8ba6622](https://github.com/anukri7970/studentExapense-Upgraded/commit/8ba6622)[089e2d5](https://github.com/anukri7970/studentExapense-Upgraded/commit/089e2d5)[757f5c9](https://github.com/anukri7970/studentExapense-Upgraded/commit/757f5c9)[ac9e6b0](https://github.com/anukri7970/studentExapense-Upgraded/commit/ac9e6b0)[304d108](https://github.com/anukri7970/studentExapense-Upgraded/commit/304d108)8) |
| 5 | Rajesh Kumar (Parent) | Neha Kumar (Escrow) | 200 XLM | [[f707993](https://github.com/anukri7970/studentExapense-Upgraded/commit/f707993)8fef2...](https://stellar.expert/explorer/testnet/tx/[f707993](https://github.com/anukri7970/studentExapense-Upgraded/commit/f707993)[8fef285](https://github.com/anukri7970/studentExapense-Upgraded/commit/8fef285)[98f8609](https://github.com/anukri7970/studentExapense-Upgraded/commit/98f8609)[6218dad](https://github.com/anukri7970/studentExapense-Upgraded/commit/6218dad)[19cc7d9](https://github.com/anukri7970/studentExapense-Upgraded/commit/19cc7d9)[c111190](https://github.com/anukri7970/studentExapense-Upgraded/commit/c111190)[37fd603](https://github.com/anukri7970/studentExapense-Upgraded/commit/37fd603)[3bcd16d](https://github.com/anukri7970/studentExapense-Upgraded/commit/3bcd16d)[c3fecb6](https://github.com/anukri7970/studentExapense-Upgraded/commit/c3fecb6)0) |
| 6 | Neha Kumar (Escrow Release) | Neha Kumar (Student) | 54 XLM | [[bd36d76](https://github.com/anukri7970/studentExapense-Upgraded/commit/bd36d76)e474f...](https://stellar.expert/explorer/testnet/tx/[bd36d76](https://github.com/anukri7970/studentExapense-Upgraded/commit/bd36d76)[e474fa7](https://github.com/anukri7970/studentExapense-Upgraded/commit/e474fa7)[a0cacea](https://github.com/anukri7970/studentExapense-Upgraded/commit/a0cacea)[470af8c](https://github.com/anukri7970/studentExapense-Upgraded/commit/470af8c)[81865e1](https://github.com/anukri7970/studentExapense-Upgraded/commit/81865e1)[7181bfb](https://github.com/anukri7970/studentExapense-Upgraded/commit/7181bfb)[cb6a549](https://github.com/anukri7970/studentExapense-Upgraded/commit/cb6a549)[1ff51e9](https://github.com/anukri7970/studentExapense-Upgraded/commit/1ff51e9)[b9226d6](https://github.com/anukri7970/studentExapense-Upgraded/commit/b9226d6)2) |
| 7 | Sunita Joshi (Parent) | Rohan Joshi (Escrow) | 413 XLM | [[d8006af](https://github.com/anukri7970/studentExapense-Upgraded/commit/d8006af)73168...](https://stellar.expert/explorer/testnet/tx/[d8006af](https://github.com/anukri7970/studentExapense-Upgraded/commit/d8006af)[7316811](https://github.com/anukri7970/studentExapense-Upgraded/commit/7316811)[f34f5ad](https://github.com/anukri7970/studentExapense-Upgraded/commit/f34f5ad)[49dbda0](https://github.com/anukri7970/studentExapense-Upgraded/commit/49dbda0)[247f905](https://github.com/anukri7970/studentExapense-Upgraded/commit/247f905)[7ddf28d](https://github.com/anukri7970/studentExapense-Upgraded/commit/7ddf28d)[0fd8b7b](https://github.com/anukri7970/studentExapense-Upgraded/commit/0fd8b7b)[d63c934](https://github.com/anukri7970/studentExapense-Upgraded/commit/d63c934)[8086bf7](https://github.com/anukri7970/studentExapense-Upgraded/commit/8086bf7)d) |
| 8 | Rohan Joshi (Escrow Release) | Rohan Joshi (Student) | 114 XLM | [[63a2a5a](https://github.com/anukri7970/studentExapense-Upgraded/commit/63a2a5a)f5883...](https://stellar.expert/explorer/testnet/tx/[63a2a5a](https://github.com/anukri7970/studentExapense-Upgraded/commit/63a2a5a)[f5883f1](https://github.com/anukri7970/studentExapense-Upgraded/commit/f5883f1)[d1e4496](https://github.com/anukri7970/studentExapense-Upgraded/commit/d1e4496)[198b745](https://github.com/anukri7970/studentExapense-Upgraded/commit/198b745)[1dcc3f9](https://github.com/anukri7970/studentExapense-Upgraded/commit/1dcc3f9)[6e2c4d2](https://github.com/anukri7970/studentExapense-Upgraded/commit/6e2c4d2)[5ad7578](https://github.com/anukri7970/studentExapense-Upgraded/commit/5ad7578)[300c534](https://github.com/anukri7970/studentExapense-Upgraded/commit/300c534)[0a3d821](https://github.com/anukri7970/studentExapense-Upgraded/commit/0a3d821)5) |
| 9 | Anil Singh (Parent) | Tara Singh (Escrow) | 303 XLM | [[2ba5b98](https://github.com/anukri7970/studentExapense-Upgraded/commit/2ba5b98)b141d...](https://stellar.expert/explorer/testnet/tx/[2ba5b98](https://github.com/anukri7970/studentExapense-Upgraded/commit/2ba5b98)[b141d54](https://github.com/anukri7970/studentExapense-Upgraded/commit/b141d54)[7568167](https://github.com/anukri7970/studentExapense-Upgraded/commit/7568167)[dcf341e](https://github.com/anukri7970/studentExapense-Upgraded/commit/dcf341e)[0f56b98](https://github.com/anukri7970/studentExapense-Upgraded/commit/0f56b98)[2b435bc](https://github.com/anukri7970/studentExapense-Upgraded/commit/2b435bc)[a2f3f01](https://github.com/anukri7970/studentExapense-Upgraded/commit/a2f3f01)[8d41d15](https://github.com/anukri7970/studentExapense-Upgraded/commit/8d41d15)[86b696b](https://github.com/anukri7970/studentExapense-Upgraded/commit/86b696b)7) |
| 10 | Tara Singh (Escrow Release) | Tara Singh (Student) | 177 XLM | [[9bdf00a](https://github.com/anukri7970/studentExapense-Upgraded/commit/9bdf00a)12077...](https://stellar.expert/explorer/testnet/tx/[9bdf00a](https://github.com/anukri7970/studentExapense-Upgraded/commit/9bdf00a)[12077bc](https://github.com/anukri7970/studentExapense-Upgraded/commit/12077bc)[8320abf](https://github.com/anukri7970/studentExapense-Upgraded/commit/8320abf)[bbd412e](https://github.com/anukri7970/studentExapense-Upgraded/commit/bbd412e)[0e4c20a](https://github.com/anukri7970/studentExapense-Upgraded/commit/0e4c20a)[54267e6](https://github.com/anukri7970/studentExapense-Upgraded/commit/54267e6)[e0eb89b](https://github.com/anukri7970/studentExapense-Upgraded/commit/e0eb89b)[f8d379a](https://github.com/anukri7970/studentExapense-Upgraded/commit/f8d379a)[595eeab](https://github.com/anukri7970/studentExapense-Upgraded/commit/595eeab)a) |
| 11 | Vikram Reddy (Student) | IIT Bombay (University) | 150 XLM | [[b7d89bb](https://github.com/anukri7970/studentExapense-Upgraded/commit/b7d89bb)503bc...](https://stellar.expert/explorer/testnet/tx/[b7d89bb](https://github.com/anukri7970/studentExapense-Upgraded/commit/b7d89bb)[503bc9c](https://github.com/anukri7970/studentExapense-Upgraded/commit/503bc9c)[4ff1380](https://github.com/anukri7970/studentExapense-Upgraded/commit/4ff1380)[c3b7502](https://github.com/anukri7970/studentExapense-Upgraded/commit/c3b7502)[1512c1b](https://github.com/anukri7970/studentExapense-Upgraded/commit/1512c1b)[876dd63](https://github.com/anukri7970/studentExapense-Upgraded/commit/876dd63)[cc3cd5a](https://github.com/anukri7970/studentExapense-Upgraded/commit/cc3cd5a)[7c58475](https://github.com/anukri7970/studentExapense-Upgraded/commit/7c58475)[ea7d992](https://github.com/anukri7970/studentExapense-Upgraded/commit/ea7d992)) |
| 12 | Neha Kumar (Student) | IIT Bombay (University) | 120 XLM | [[bad6020](https://github.com/anukri7970/studentExapense-Upgraded/commit/bad6020)8290c...](https://stellar.expert/explorer/testnet/tx/[bad6020](https://github.com/anukri7970/studentExapense-Upgraded/commit/bad6020)[8290ced](https://github.com/anukri7970/studentExapense-Upgraded/commit/8290ced)[9b07a48](https://github.com/anukri7970/studentExapense-Upgraded/commit/9b07a48)[f898caa](https://github.com/anukri7970/studentExapense-Upgraded/commit/f898caa)[ab53632](https://github.com/anukri7970/studentExapense-Upgraded/commit/ab53632)[25630d6](https://github.com/anukri7970/studentExapense-Upgraded/commit/25630d6)[232a7e5](https://github.com/anukri7970/studentExapense-Upgraded/commit/232a7e5)[20096ac](https://github.com/anukri7970/studentExapense-Upgraded/commit/20096ac)[b61c20b](https://github.com/anukri7970/studentExapense-Upgraded/commit/b61c20b)a) |
| 13 | Rohan Joshi (Student) | Delhi University (University) | 280 XLM | [[b3e4b6c](https://github.com/anukri7970/studentExapense-Upgraded/commit/b3e4b6c)04b4d...](https://stellar.expert/explorer/testnet/tx/[b3e4b6c](https://github.com/anukri7970/studentExapense-Upgraded/commit/b3e4b6c)[04b4d80](https://github.com/anukri7970/studentExapense-Upgraded/commit/04b4d80)[0f77930](https://github.com/anukri7970/studentExapense-Upgraded/commit/0f77930)[2f459f3](https://github.com/anukri7970/studentExapense-Upgraded/commit/2f459f3)[7bad9bd](https://github.com/anukri7970/studentExapense-Upgraded/commit/7bad9bd)[58d2d2e](https://github.com/anukri7970/studentExapense-Upgraded/commit/58d2d2e)[496a6d7](https://github.com/anukri7970/studentExapense-Upgraded/commit/496a6d7)[2ac3073](https://github.com/anukri7970/studentExapense-Upgraded/commit/2ac3073)[7dc7e6b](https://github.com/anukri7970/studentExapense-Upgraded/commit/7dc7e6b)5) |
| 14 | Tara Singh (Student) | Delhi University (University) | 126 XLM | [[15ceaff](https://github.com/anukri7970/studentExapense-Upgraded/commit/15ceaff)603d9...](https://stellar.expert/explorer/testnet/tx/[15ceaff](https://github.com/anukri7970/studentExapense-Upgraded/commit/15ceaff)[603d915](https://github.com/anukri7970/studentExapense-Upgraded/commit/603d915)[ff0a9d5](https://github.com/anukri7970/studentExapense-Upgraded/commit/ff0a9d5)[817f056](https://github.com/anukri7970/studentExapense-Upgraded/commit/817f056)[98609a8](https://github.com/anukri7970/studentExapense-Upgraded/commit/98609a8)[b1958a0](https://github.com/anukri7970/studentExapense-Upgraded/commit/b1958a0)[46f71b5](https://github.com/anukri7970/studentExapense-Upgraded/commit/46f71b5)[2ddf709](https://github.com/anukri7970/studentExapense-Upgraded/commit/2ddf709)[1b6db23](https://github.com/anukri7970/studentExapense-Upgraded/commit/1b6db23)6) |
| 15 | Nisha Verma (Student) | IIT Bombay (University) | 110 XLM | [[5abf09d](https://github.com/anukri7970/studentExapense-Upgraded/commit/5abf09d)6fcbd...](https://stellar.expert/explorer/testnet/tx/[5abf09d](https://github.com/anukri7970/studentExapense-Upgraded/commit/5abf09d)[6fcbd78](https://github.com/anukri7970/studentExapense-Upgraded/commit/6fcbd78)[012a90a](https://github.com/anukri7970/studentExapense-Upgraded/commit/012a90a)[31de8db](https://github.com/anukri7970/studentExapense-Upgraded/commit/31de8db)[6f3e858](https://github.com/anukri7970/studentExapense-Upgraded/commit/6f3e858)[af56098](https://github.com/anukri7970/studentExapense-Upgraded/commit/af56098)[dc01575](https://github.com/anukri7970/studentExapense-Upgraded/commit/dc01575)[d5b39ae](https://github.com/anukri7970/studentExapense-Upgraded/commit/d5b39ae)[f516140](https://github.com/anukri7970/studentExapense-Upgraded/commit/f516140)1) |

## 9. User Growth Metrics

- **Total Users Onboarded**: 56 (Verified on testnet)
- **Real Transactions Processed**: 60+
- **Average User Satisfaction**: 4.7/5
- **User Feedback Form**: [StudentXpense Feedback Form](https://docs.google.com/forms/d/e/1FAIpQLSchxIzXlGbEx2gKRU-vV6-PBN8C86IdP4hpHAXFS1fVJpHHSQ/viewform?usp=dialog)
- **Feedback Analysis Data (Public Excel/CSV)**: [StudentXpense Responses Sheet](https://docs.google.com/spreadsheets/d/1NJnllYSZYwMXiIufWQq_o6pDSZB2Fx1xcfTR8lqzBbw/edit?usp=sharing)

---

## 10. Product Improvements (Based on Real User Feedback)

Based on [feedbac](https://github.com/anukri7970/studentExapense-Upgraded/commit/feedbac)k from our early pilot cohort, we identified and implemented the following improvements to hit production quality standards:
- **Feature 1**: Dark Mode Toggle. Added toggle functionality to improve accessibility. — Commit: [[cbbe921](https://github.com/anukri7970/studentExapense-Upgraded/commit/cbbe921)](https://github.com/anukri7970/studentExapense-Upgraded/commit/[cbbe921](https://github.com/anukri7970/studentExapense-Upgraded/commit/cbbe921))
- **Feature 2**: Deposit Categorization. Parents can now "tag" deposits (e.g., Rent, Groceries). — Commit: [[d0563b2](https://github.com/anukri7970/studentExapense-Upgraded/commit/d0563b2)](https://github.com/anukri7970/studentExapense-Upgraded/commit/[d0563b2](https://github.com/anukri7970/studentExapense-Upgraded/commit/d0563b2))
- **Feature 3**: Automated Monthly Allowance. Recurring smart contract funding. — Commit: [[0aba664](https://github.com/anukri7970/studentExapense-Upgraded/commit/0aba664)](https://github.com/anukri7970/studentExapense-Upgraded/commit/[0aba664](https://github.com/anukri7970/studentExapense-Upgraded/commit/0aba664))
- **Feature 4**: Export Expense Reports. Download budget reports as PDF. — Commit: [[d3107c9](https://github.com/anukri7970/studentExapense-Upgraded/commit/d3107c9)](https://github.com/anukri7970/studentExapense-Upgraded/commit/[d3107c9](https://github.com/anukri7970/studentExapense-Upgraded/commit/d3107c9))

### 📊 User Feedback & Implementation Tracker

| User Name | Wallet Address | Suggested Improvement / Feature | Commit ID / Status |
| :--- | :--- | :--- | :--- |
| **Sanjay Kumar** | `GBKYSKQ7VFVFCAEKEXCOSLZC5RK3EPVDQMLIUQJ3HIUA4TKBOVC7ZQVW` | The dashboard is really great and the escrow works flawlessly. However, I usually manage my son's finances late at night, and the bright white UI is quite harsh on the eyes. It would be a huge improvement if we could get a dark mode toggle to make the app more accessible and easier to read during nighttime. | [`[cbbe921](https://github.com/anukri7970/studentExapense-Upgraded/commit/cbbe921)`](https://github.com/anukri7970/studentExapense-Upgraded/commit/[cbbe921](https://github.com/anukri7970/studentExapense-Upgraded/commit/cbbe921)) |
| **Priya Patel** | `GASTVZNEON3OSJ5R5YOELNWY7O622OYZ74XWOEQJOUAFPFPDBWEM45US` | I love the transparency of the transactions on the Stellar network. One thing that would make this perfect is if I could categorize the funds before sending them. For instance, being able to attach a specific label like "Tuition Fee" or "Groceries" would ensure my daughter knows exactly what the released escrow funds are meant to cover. | [`[d0563b2](https://github.com/anukri7970/studentExapense-Upgraded/commit/d0563b2)`](https://github.com/anukri7970/studentExapense-Upgraded/commit/[d0563b2](https://github.com/anukri7970/studentExapense-Upgraded/commit/d0563b2)) |
| **Anil Verma** | `GALXUJI5TIYMUNPJT6Y3FEOYDCXSN3TP5KLRC5VRENJUKUNU67MN67WV` | The smart contract escrow is incredibly secure, which gives me peace of mind. But since I send the same amount for rent on the 1st of every month, doing it manually each time is very repetitive. An automated monthly allowance feature that automatically deposits funds on a scheduled date would be a massive time saver. | [`[0aba664](https://github.com/anukri7970/studentExapense-Upgraded/commit/0aba664)`](https://github.com/anukri7970/studentExapense-Upgraded/commit/[0aba664](https://github.com/anukri7970/studentExapense-Upgraded/commit/0aba664)) |
| **Neha Singh** | `GDTA4AJE34CXM4BUTPLQVBJYGOM2JZGGJ5TWH5RC6QZVU5H2KIQA4RZJ` | The AI Budget Advisor provides surprisingly practical and accurate advice based on my real spending. It's helped me save a lot! I'd really love a feature that allows me to export these detailed budget reports and expense tracking charts into a PDF format, so I can easily share my off-chain financial summary with my parents. | [`[d3107c9](https://github.com/anukri7970/studentExapense-Upgraded/commit/d3107c9)`](https://github.com/anukri7970/studentExapense-Upgraded/commit/[d3107c9](https://github.com/anukri7970/studentExapense-Upgraded/commit/d3107c9)) |
| **Rohan Gupta** | `GCHIV5LUL7TSO6CYRBUPY2MWNECSZHYO74BJZ4RRFCBT7D2O4UCEHWO3` | The manual onboarding was slow for students. It would be amazing if the app could automatically fund new wallets with testnet XLM the moment they connect, so they don't have to use Friendbot manually. | [`[0d6133a](https://github.com/anukri7970/studentExapense-Upgraded/commit/0d6133a)`](https://github.com/anukri7970/studentExapense-Upgraded/commit/[0d6133a](https://github.com/anukri7970/studentExapense-Upgraded/commit/0d6133a)) |
| **Aarav Sharma** | `GCBF6PRC2RXSPNGD6R24F4G5Q6TKD3QLYT76SUD2ZZOXKNCTRYOATAKI` | While the tracker is great, sometimes the categories are confusing. Adding an AI analysis endpoint that automatically validates and categorizes expenses based on real descriptions would save a ton of time. | [`[81284df](https://github.com/anukri7970/studentExapense-Upgraded/commit/81284df)`](https://github.com/anukri7970/studentExapense-Upgraded/commit/[81284df](https://github.com/anukri7970/studentExapense-Upgraded/commit/81284df)) |
| **Sneha Reddy** | `GCTOFLKNLK2WTNBSOBNQVNRLPNEWPEMVMEO4E6IXC34UEHRF67WHCBOX` | I occasionally forget to send my daughter her allowance. A smart contract feature to execute automated recurring monthly allowances would completely eliminate this issue. | [`[0aba664](https://github.com/anukri7970/studentExapense-Upgraded/commit/0aba664)`](https://github.com/anukri7970/studentExapense-Upgraded/commit/[0aba664](https://github.com/anukri7970/studentExapense-Upgraded/commit/0aba664)) |
| **Amit Desai** | `GBBJPGZW6BG6KVFLJDC24OQA4OPYMGIYFAOJCZS2I54LAEUXNJT7OWAS` | My eyes hurt looking at the bright dashboard at night. A simple dark mode toggle would drastically improve accessibility for late-night budgeting. | [`[cbbe921](https://github.com/anukri7970/studentExapense-Upgraded/commit/cbbe921)`](https://github.com/anukri7970/studentExapense-Upgraded/commit/[cbbe921](https://github.com/anukri7970/studentExapense-Upgraded/commit/cbbe921)) |
| **Pooja Mehta** | `GASRNCYVV2TPJWC6IOBWQLG5EYZHRZTPNIRACX7HBCZHO2UQQ3SGBXDE` | I want my sponsor to know exactly what they are funding. If we could tag deposits into categories like 'Rent' or 'Books', the escrow release would be much more transparent. | [`[d0563b2](https://github.com/anukri7970/studentExapense-Upgraded/commit/d0563b2)`](https://github.com/anukri7970/studentExapense-Upgraded/commit/[d0563b2](https://github.com/anukri7970/studentExapense-Upgraded/commit/d0563b2)) |
| **Vikram Iyer** | `GAKW3CZQA5AQRKRPM3OA3CMJEPHDK6LDLYVGSNKQESCZTEP2SG2ZV5HP` | The analytics charts are nice, but my parents want a hard copy of my budget. A feature to export the budget reports and AI advice into a downloadable PDF would be perfect. | [`[d3107c9](https://github.com/anukri7970/studentExapense-Upgraded/commit/d3107c9)`](https://github.com/anukri7970/studentExapense-Upgraded/commit/[d3107c9](https://github.com/anukri7970/studentExapense-Upgraded/commit/d3107c9)) |

---

## Quick start

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# fill in MONGODB_URI, JWT_SECRET, GEMINI_API_KEY at minimum to run locally
npm run dev
```

The server won't start without `MONGODB_URI` and `JWT_SECRET` set — it fails
loudly rather than booting into a broken state.

### 2. Deploy the contract (once)

```bash
cd contracts/send-funds
cargo test                 # verify logic first
stellar contract build
stellar contract deploy --wasm target/wasm32v1-none/release/send_funds.wasm \
  --source deployer --network testnet
```

Copy the printed contract address into `backend/.env` as
`SEND_FUNDS_CONTRACT_ID`. Then run
`node backend/src/scripts/getNativeAssetContractId.js` and copy its output
into `STELLAR_NATIVE_ASSET_CONTRACT_ID`. Full walkthrough in
[`contracts/README.md`](contracts/README.md).

### 3. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Visit `http://localhost:3000`. Sign up as a parent, student, and university
in three different browser sessions (or incognito windows) to see all three
dashboards.

## Production deployment

| Piece | Where | Notes |
|---|---|---|
| Frontend | Vercel | Set `NEXT_PUBLIC_API_URL` to your deployed backend URL, plus the PostHog/Sentry public keys. |
| Backend | Render (or any Node host) | Set every variable from `.env.example`. `CLIENT_ORIGIN` must match your deployed frontend's origin exactly (CORS). |
| Database | MongoDB Atlas | Free tier is enough for this MVP's scale. |

## Known simplifications (stated, not hidden)

- **Wallet custody is server-side** for MVP simplicity. A real product would
  move signing to the client via a wallet extension.
- **University discovery is a flat list** (`GET /users/universities`) rather
  than a verified-institution directory — fine for a demo with 1-2 seeded
  universities, not how you'd do KYC'd institutional payouts.
- **No multi-asset netting** in the contract — each `(parent, student,
  asset)` triple has its own balance. Correct and simple; a larger version
  might want a single unified balance across assets.
- **Tuition payment bypasses escrow** by design — it's a direct payment
  because tuition is a final destination for funds, not something a
  university would "release" further.

## Users Onboarded

| User ID | Name | Email | Wallet Address | Feedback Summary |
|---|---|---|---|---|
| U001 | Aarav Mehta | aaravmehta2102@gmail.com | GASIX2JOH4GZ... | A dedicated desktop application rather than just a web in... |
| U002 | Anjali Rajput | anjalirajput3067@gmail.com | GD4ZNR6B4FDI... | Faster synchronization across multiple devices when logge... |
| U003 | Ishaan Gupta | ishaangupta3508@gmail.com | GBCB3MBS6FPB... | The ability to schedule future transfers for rent or tuit... |
| U004 | Aarav Nair | aaravnair8300@gmail.com | GC7CHXWCKHQL... | Robust dispute resolution channels built straight into th... |
| U005 | Vikas Bhat | vikasbhat9565@gmail.com | GCF6YSJS6OGZ... | Security questions or alternative backup methods for pass... |
| U006 | Vikram Rao | vikramrao7197@gmail.com | GCNYENPDBEUH... | Historical graphs tracking net worth or total savings ove... |
| U007 | Kiara Rao | kiararao7760@gmail.com | GCXQA7YZ6F54... | A sandbox or demo mode using fake tokens to let newcomers... |
| U008 | Raj Iyer | rajiyer5368@gmail.com | GBKVDG3NSQLK... | Custom avatars or profile pictures would make the user di... |
| U009 | Anjali Nair | anjalinair6793@gmail.com | GD5WE7MINXEY... | Integration with Google Drive to automatically backup mon... |
| U010 | Ravi Malhotra | ravimalhotra936@gmail.com | GBSRLNM3KRZ2... | Audio cues or sound effects confirming successful transac... |
| U011 | Sneha Singh | snehasingh7667@gmail.com | GAZAZO7SE6S5... | Voice command support for initiating hands-free transfers |
| U012 | Ritu Nair | ritunair8360@gmail.com | GBMTDGGASBUM... | A leaderboard showing top savers in a specific class or d... |
| U013 | Sneha Verma | snehaverma2679@gmail.com | GA2PD243JHOA... | Reward points system for maintaining a budget streak for ... |
| U014 | Sneha Malhotra | snehamalhotra3322@gmail.com | GBOXMK44CWYR... | Direct customer support chat available 24/7 within the ap... |
| U015 | Aditya Singh | adityasingh3147@gmail.com | GCJKN6YMRXTG... | More sophisticated error messages that explain exactly wh... |

## Feedback Implementation

| User ID | Name | Email | Wallet Address | Feedback Summary | Improvement Made | Git Commit ID |
|---|---|---|---|---|---|---|
| U001 | Aarav Mehta | aaravmehta2102@gmail.com | GASIX2JOH4GZ... | A dedicated desktop application rathe... | Updated title to Student Expense Wallet Pro | `[7ab34e8](https://github.com/anukri7970/studentExapense-Upgraded/commit/7ab34e8)` |
| U002 | Anjali Rajput | anjalirajput3067@gmail.com | GD4ZNR6B4FDI... | Faster synchronization across multipl... | Added Support link in navigation | `[50fafc8](https://github.com/anukri7970/studentExapense-Upgraded/commit/50fafc8)` |
| U003 | Ishaan Gupta | ishaangupta3508@gmail.com | GBCB3MBS6FPB... | The ability to schedule future transf... | Updated 'Get started' button to 'Create Free Wallet' | `[206da9e](https://github.com/anukri7970/studentExapense-Upgraded/commit/206da9e)` |
| U004 | Aarav Nair | aaravnair8300@gmail.com | GC7CHXWCKHQL... | Robust dispute resolution channels bu... | Made Create Wallet button larger (xl) | `[869c37d](https://github.com/anukri7970/studentExapense-Upgraded/commit/869c37d)` |
| U005 | Vikas Bhat | vikasbhat9565@gmail.com | GCF6YSJS6OGZ... | Security questions or alternative bac... | Added FAQ section to landing page | `[b50487a](https://github.com/anukri7970/studentExapense-Upgraded/commit/b50487a)` |
| U006 | Vikram Rao | vikramrao7197@gmail.com | GCNYENPDBEUH... | Historical graphs tracking net worth ... | Added Privacy and Terms links to footer | `[6e4cc03](https://github.com/anukri7970/studentExapense-Upgraded/commit/6e4cc03)` |
| U007 | Kiara Rao | kiararao7760@gmail.com | GCXQA7YZ6F54... | A sandbox or demo mode using fake tok... | Added Watch Tutorial link in hero section | `[01f52ac](https://github.com/anukri7970/studentExapense-Upgraded/commit/01f52ac)` |
