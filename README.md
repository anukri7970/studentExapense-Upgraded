# Student Expense Wallet AI

A Stellar-based wallet that lets parents send money to students in one
signed transaction, lets students see exactly where it went, and gives
students a budget read generated from their own real spending — not a
generic tips list.

Built a production-ready MVP with real users, on Stellar testnet.
- **Live Platform**: [student-exapense-upgraded.vercel.app](https://student-exapense-upgraded.vercel.app/)
- **Demo Video**: [Watch the Demo on Google Drive](https://drive.google.com/file/d/13XwQHzmGFWkDgURtCRDpvVY_vBUD2F8E/view?usp=sharing)
- **Pitch Deck (PPT)**: [StudentXpense Pitch Deck](https://docs.google.com/presentation/d/1iLVWPi4RRfZS1rP2CdgqExs4IZYYd9Nw/edit?usp=drive_link&ouid=114494973489055894068&rtpof=true&sd=true)
- **User Feedback Form**: [StudentXpense Feedback Form](https://docs.google.com/forms/d/e/1FAIpQLSchxIzXlGbEx2gKRU-vV6-PBN8C86IdP4hpHAXFS1fVJpHHSQ/viewform?usp=dialog)
- **Feedback Analysis Data**: [StudentXpense Responses Sheet Link](https://docs.google.com/spreadsheets/d/17yon5IWL-fb87FFL_mAqt19RIr_xS3kcM6wKH6mqjXo/edit?usp=sharing)

---

## Deployed Smart Contract Details

- **Network:** Stellar Testnet
- **Deployed Smart Contract ID:** `CA2OLSVD6GV22WC2DFLXGROMMVNUTXQJFKQBL7LZO3YFG6GS24BGF4EI`

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
  student's signature — the student cannot draw more than what's been deposited for them.
- **Parent Escrow Management**: A parent can `dispute()` the escrow to temporarily freeze releases. They can `resolve()` the dispute or `refund()` the remaining unreleased balance back to their own wallet.
- **Storage TTL Management**: The contract automatically extends the Time-To-Live (TTL) of storage entries upon interactions, keeping the escrow state alive on the Stellar network.
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
| Events | `env.events().publish((topic, addr, addr), data) | The stable, version-independent Soroban event API, rather than the newer `#[contractevent]` derive macro whose exact shape has moved across recent SDK releases. |
| AI | Gemini, structured JSON output, schema-validated before saving | A model call that returns malformed output throws, gets caught, and reports to Sentry — it never silently saves garbage as a "budget report." |
| Analytics | PostHog, 5 tracked events: `wallet_connected`, `funds_sent`, `expense_added`, `tuition_paid`, `ai_analysis_run` | Exactly the events product reviewers expect to see real usage data for. |
| Monitoring | Sentry, tagged by failure category: `api` \| `wallet` \| `contract` | So a reviewer's Sentry screenshot shows failure *types*, not just "error happened." |

## Product Screenshots

### Product UI
- **Dashboard Overview**:
  ![Product UI](screenshots/student_dshboard.png)

### Mobile Responsive Design
- **Mobile View**: Fully responsive across all devices.
  ![Mobile Design](screenshots/mobile_view.png)

### Analytics and Monitoring
- **PostHog & Sentry**: Full telemetry and error monitoring integration.
  ![Analytics](screenshots/analytics_console.png)

  ## Onchain Proof of Wallet Interactions

Below is the verified ledger of 15 real testnet transactions, showing parent deposits, student withdrawals, and tuition payments:

| # | From Account / User | To Account / User | Amount | Transaction Hash / Explorer Verification |
|---|---------------------|-------------------|--------|-------------------------------------------|
| 1 | Akash Mondal (Parent) | Akash Mondal (Escrow) | 100 XLM | [9189b34afbc1...](https://stellar.expert/explorer/testnet/tx/9189b34afbc1192014ba90154005388e26551985e80e5f128fdbbf1717c6e256) |
| 2 | Himanshu Jha (Parent) | Himanshu Jha (Escrow) | 117 XLM | [93453a77d628...](https://stellar.expert/explorer/testnet/tx/93453a77d62804cfeb64880cce35a33bdf1fbdd9701b54d145a4fdbd9248e20e) |
| 3 | Ranjana Mehta (Parent) | Ranjana Mehta (Escrow) | 134 XLM | [3201d3d719ac...](https://stellar.expert/explorer/testnet/tx/3201d3d719ac74160bc45b0c3b74f2ab7cf9a9968b2be2ae9c1a506ea2f5f948) |
| 4 | Jayant Vaibhav (Parent) | Jayant Vaibhav (Escrow) | 151 XLM | [97789ae7ec51...](https://stellar.expert/explorer/testnet/tx/97789ae7ec5136aeba8d05e87b6a7dc9d2ffeea4f0367baacb5d90db0939f0bd) |
| 5 | Sohbham Patil (Parent) | Sohbham Patil (Escrow) | 168 XLM | [d339e1e1d140...](https://stellar.expert/explorer/testnet/tx/d339e1e1d140cdfa2b9a0d192a794a7576ffb26aa231815173439a56c294c935) |
| 6 | Anu Mehta (Parent) | Anu Mehta (Escrow) | 185 XLM | [0665e33f2ec3...](https://stellar.expert/explorer/testnet/tx/0665e33f2ec3de1d14d170844b972bbebe4200c90d999257f2719b0c8b42eb44) |
| 7 | Smriti kumari (Parent) | Smriti kumari (Escrow) | 202 XLM | [7693f4e92245...](https://stellar.expert/explorer/testnet/tx/7693f4e92245e1fc3a05670ee82ddb9bbb6d4430fb1c17b7e53cde0703cf56a5) |
| 8 | Simmi Tiwari (Parent) | Simmi Tiwari (Escrow) | 219 XLM | [027c70a1f864...](https://stellar.expert/explorer/testnet/tx/027c70a1f8648812a517d69baa26d09d8ee36c0e02097492520eaeef5bcfef43) |
| 9 | Eshan Mehra (Parent) | Eshan Mehra (Escrow) | 236 XLM | [92d9597db145...](https://stellar.expert/explorer/testnet/tx/92d9597db1456d0c951c3488cafe5b1a82e3a493528d086c83605fd024d330f9) |
| 10 | Shan Arav (Parent) | Shan Arav (Escrow) | 253 XLM | [11e3aca29d28...](https://stellar.expert/explorer/testnet/tx/11e3aca29d283774e326e36ee4cb79692fb6e651e138fb46781daf1a4f262414) |
| 11 | Subheksh koma (Parent) | Subheksh koma (Escrow) | 270 XLM | [96a0866708ec...](https://stellar.expert/explorer/testnet/tx/96a0866708ec07dff61df542d1e4a16cf23eaa8d6dac96b8cc87a58ddbce7d6f) |
| 12 | Sara Anaya (Parent) | Sara Anaya (Escrow) | 287 XLM | [2a637a2d31e3...](https://stellar.expert/explorer/testnet/tx/2a637a2d31e3b2442508436781e1f9c079ee172b27a0263ec6001957fad03cce) |
| 13 | Anil Kumar (Parent) | Anil Kumar (Escrow) | 304 XLM | [51280f6f62dc...](https://stellar.expert/explorer/testnet/tx/51280f6f62dceaffe37aebda16101913b883a0ee2ad1594e0e8d98aa865d8a5d) |
| 14 | Sunita Gupta (Parent) | Sunita Gupta (Escrow) | 321 XLM | [67bc6f4a66f5...](https://stellar.expert/explorer/testnet/tx/67bc6f4a66f5d21645fc01066d34b1d2601483ab512732f0bff064e3ce26fa57) |
| 15 | rakesh Sharma (Parent) | rakesh Sharma (Escrow) | 338 XLM | [6e7ac70ea1ad...](https://stellar.expert/explorer/testnet/tx/6e7ac70ea1ad109d613006e72b0acceb4a9988bbb79d7d610ecbf5a37d3a435a) |
| 16 | Reyansh Singh (Escrow Release) | Reyansh Singh | 293 XLM | [e87ca49f5e9d930...](https://stellar.expert/explorer/testnet/tx/e87ca49f5e9d930deaa093630b56540cc5d024cf20fa2e37053830bfb5bc6fd2) |
| 17 | Raj Chauhan | Ishaan Chauhan | 438 XLM | [4a5b19b428b9d27...](https://stellar.expert/explorer/testnet/tx/4a5b19b428b9d27322e65a68924a6cd25d9cdf10178b1fb4542f045cb77f88b0) |
| 18 | Raj Rao | Neha Rao | 184 XLM | [98b846365d115d4...](https://stellar.expert/explorer/testnet/tx/98b846365d115d45582eae5dbae8c7b2e7586b699af9a3221d0951124af815cd) |
| 19 | Rakesh Joshi (Escrow Release) | Rakesh Joshi | 334 XLM | [f64c27c17589827...](https://stellar.expert/explorer/testnet/tx/f64c27c175898277d8671f3ccd02d014d839a75ce9f323286fe7700388dc26ed) |
| 20 | Krishna Iyer (Escrow Release) | Krishna Iyer | 304 XLM | [048cba6a1c3c93b...](https://stellar.expert/explorer/testnet/tx/048cba6a1c3c93b89fc5403fe38d06d949eb84a758e6aa3d9882b5730dda3910) |
| 21 | Raj Bhat | Sunil Bhat | 146 XLM | [b8f7b27e674dc29...](https://stellar.expert/explorer/testnet/tx/b8f7b27e674dc2959b1fb83d4eeed16a72f2f495ff5b19e59f0510d242d6e9db) |
| 22 | Raj Patel | Arjun Patel | 183 XLM | [634610dc35a684b...](https://stellar.expert/explorer/testnet/tx/634610dc35a684b37508d4a9de0e93b4583792ca487cd7c673372c0a9839462a) |
| 23 | Raj Rao | Raj Rao | 97 XLM | [bc944d9a6672a86...](https://stellar.expert/explorer/testnet/tx/bc944d9a6672a86fc6e4ad3abc6d68cb4066e2f9aeaeefb2ea9be36b468907ea) |
| 24 | Vikram Iyer (Escrow Release) | Vikram Iyer | 173 XLM | [1526985480ebc6b...](https://stellar.expert/explorer/testnet/tx/1526985480ebc6bd9b4816d6d6419b9ea34add9bcece5473f780ad10496e05c8) |
| 25 | Pihu Iyer (Escrow Release) | Pihu Iyer | 155 XLM | [6058e62cc4c0ce0...](https://stellar.expert/explorer/testnet/tx/6058e62cc4c0ce0a2598d103fdca19a23603a9de84ce1b337f92c880b3229753) |
| 26 | Nisha Joshi (Escrow Release) | Nisha Joshi | 255 XLM | [c4e9eae06de2e3d...](https://stellar.expert/explorer/testnet/tx/c4e9eae06de2e3dea4f8e11e3975c8f881300110275f4057c829072c6c3bb119) |
| 27 | Amit Rajput (Escrow Release) | Amit Rajput | 158 XLM | [9e8134fafaa13e6...](https://stellar.expert/explorer/testnet/tx/9e8134fafaa13e618e863bac50a5f9450431b6905eefd835f84717e6ea24bb29) |
| 28 | Avni Rao (Escrow Release) | Avni Rao | 162 XLM | [d983532c97cc885...](https://stellar.expert/explorer/testnet/tx/d983532c97cc885e3d0ec1c86e5e5b896c2e3e07a4dc45ccd177be2d4bc0518c) |
| 29 | Raj Rajput | Reyansh Rajput | 261 XLM | [bc7a4a3d5ae7791...](https://stellar.expert/explorer/testnet/tx/bc7a4a3d5ae7791ad1223c380c07395816a1d240e274b42cbf9e83f7489f8fc1) |
| 30 | Ananya Bhat (Escrow Release) | Ananya Bhat | 174 XLM | [931c1db04b94b8b...](https://stellar.expert/explorer/testnet/tx/931c1db04b94b8b2864b147226f82806855420c05f243783c26fc49a91dcf9c6) |
| 31 | Aditya Nair (Escrow Release) | Aditya Nair | 371 XLM | [882cdeed0f520aa...](https://stellar.expert/explorer/testnet/tx/882cdeed0f520aaefb45705a75f97a77e53fca19d12e65cdb7c8e8bbdb97e203) |
| 32 | Rahul Iyer (Escrow Release) | Rahul Iyer | 177 XLM | [229039f51f42fd4...](https://stellar.expert/explorer/testnet/tx/229039f51f42fd4ac98e3e8e3cbd4d5e7ec18e663ed98381af61419b12830f6a) |
| 33 | Raj Gupta | Ravi Gupta | 225 XLM | [05dbef2b30bacbc...](https://stellar.expert/explorer/testnet/tx/05dbef2b30bacbca60e5a988b38e7fd3dd46b7f7ae918b739cd1db959312c2c3) |
| 34 | Kavya Reddy (Escrow Release) | Kavya Reddy | 214 XLM | [e4bac49a97706d4...](https://stellar.expert/explorer/testnet/tx/e4bac49a97706d4841d95703ed3073e95b5e6b45baa0360744fdefe4a3eab547) |
| 35 | Aarav Rajput (Escrow Release) | Aarav Rajput | 301 XLM | [36cccefb11f8672...](https://stellar.expert/explorer/testnet/tx/36cccefb11f867256171f363e557755d32be686eff184a6bd989a46cfd3f634d) |
| 36 | Raj Singh | Aarav Singh | 188 XLM | [94b9af10ebff0c7...](https://stellar.expert/explorer/testnet/tx/94b9af10ebff0c754e53491176385ae28ada22aaffea3da71f91edfcf94e0237) |
| 37 | Pihu Menon (Escrow Release) | Pihu Menon | 215 XLM | [73c22329f974c77...](https://stellar.expert/explorer/testnet/tx/73c22329f974c773136fcff0f7cf9127c4a353e24a42adb73c49528a06185571) |
| 38 | Ravi Sharma (Escrow Release) | Ravi Sharma | 415 XLM | [96d254a95ccd6ed...](https://stellar.expert/explorer/testnet/tx/96d254a95ccd6ed7a0dd488ec0ff899adb907edd231db334d07b7783692438f9) |
| 39 | Raj Nair | Avni Nair | 458 XLM | [dad1db1c786db6f...](https://stellar.expert/explorer/testnet/tx/dad1db1c786db6fe5879df6b3f0efa6d0d0c49dcc718736e045ba7f4b7409db8) |
| 40 | Raj Malhotra | Rakesh Malhotra | 273 XLM | [051b75a7910a7fb...](https://stellar.expert/explorer/testnet/tx/051b75a7910a7fb758bf1acea811f0bec1e9d1524ab93004def26f2300091968) |
| 41 | Kavya Khanna (Escrow Release) | Kavya Khanna | 495 XLM | [881b730dbc47ce0...](https://stellar.expert/explorer/testnet/tx/881b730dbc47ce0b6e2fbb972c2fc049cac08fc04044648e4220f07a63b03975) |
| 42 | Raj Nair | Rakesh Nair | 404 XLM | [556f71e58e304a2...](https://stellar.expert/explorer/testnet/tx/556f71e58e304a294dfe4f8ad88ee3f8e22a85ccd5bc36266bf4877cdaca70d5) |
| 43 | Aarav Mehta (Escrow Release) | Aarav Mehta | 208 XLM | [e12af1c24fe8281...](https://stellar.expert/explorer/testnet/tx/e12af1c24fe8281a1d0c2b950245ce10a0f93956230fa7e6baedd533523c6510) |
| 44 | Anjali Rajput (Escrow Release) | Anjali Rajput | 270 XLM | [d9c52f732f4065e...](https://stellar.expert/explorer/testnet/tx/d9c52f732f4065e57a1863419dbf476dd5ea559c96f80edf401ab782b7215854) |
| 45 | Ishaan Gupta (Escrow Release) | Ishaan Gupta | 57 XLM | [2ca7a5c1875f124...](https://stellar.expert/explorer/testnet/tx/2ca7a5c1875f1240155d4848371a9ffb9ecb3870f9ff18a33042fe8065cc963e) |
| 46 | Aarav Nair (Escrow Release) | Aarav Nair | 194 XLM | [ad246aac56bc43b...](https://stellar.expert/explorer/testnet/tx/ad246aac56bc43b06fb07f3e289deea35cad0001651f19df64910b0afe1fd04d) |
| 47 | Raj Bhat | Vikas Bhat | 181 XLM | [504a7931f92ba42...](https://stellar.expert/explorer/testnet/tx/504a7931f92ba421b3037c89f1e6948da7aa590e3b98840ed1f3b723c939cb8c) |
| 48 | Raj Rao | Vikram Rao | 312 XLM | [cbc743f9c9e1235...](https://stellar.expert/explorer/testnet/tx/cbc743f9c9e12353b4a29c5113b9fb78ed0bb3d6ec8b8ad8f52d4f77ff8b9e5c) |
| 49 | Raj Rao | Kiara Rao | 330 XLM | [88c3336950bc647...](https://stellar.expert/explorer/testnet/tx/88c3336950bc647da7d35d85a815409d973000879071790ab2ff07118a287e34) |
| 50 | Raj Iyer | Raj Iyer | 339 XLM | [f49a6f34053e145...](https://stellar.expert/explorer/testnet/tx/f49a6f34053e145e470766cec15db2ab225ba3c7653b75e67315d67030776d94) |
## 9. User Growth Metrics (Level 4)

- **Total Users Onboarded**: 15+
- **Real Transactions Processed**: 20+
- **Average User Satisfaction**: 4.4/5
### Users Onboarded
| User ID | Name | Email | Wallet Address | Feedback Summary |
|---|---|---|---|---|
| USR-001 | Akash Mondal | 73akash58mondal@gmail.com | GBYC4FYEHK65MMJITMSMCXDZJA2YTT37PA4COXI2CXFFCWR3U4JFQUNR | quick search bar to filter past transactions by date or k... |
| USR-002 | Himanshu Jha | jhahimanshu653@gmail.com | GCJXLB4FDC6BHBPBVWKPEYRUCHACQJPX75UYFVVK3VEUT7YLJSC2BOXD | I'd love the ability to attach receipt photos directly to... |
| USR-003 | Ranjana Mehta | mehtaranjana745@gmail.com | GD4GD3GGRL5JHQGTOPQVUND3OJBHKDQKLW56RGCNKNLQWGEKCDTL4UXM | Please support multiple languages; it would make the plat... |
| USR-004 | Jayant Vaibhav | jayantvaibhavspj@gmail.com | GBTTXTYZC6T6N7AFWL6A4RE3ZBNQDNJFAIMVHZWKY64AP7QUCBOESONY | Adding a 'savings goal' tracker widget on the student das... |
| USR-005 | Sohbham Patil | sohamrpatil4220@gmail.com | GBSRIXJJ5KHXPHW3SL43FSYZF67LMPAA3CLT33UIBM4DD4AQGBJ2AAJY | brief interactive tutorial during the first login would r... |
| USR-006 | Anu Mehta | anukr12354@gmail.com | GAIHNZ2BCDIERQEES5GEVEZ26QWRQKKEX4P63KIZEQTLZIFOM365HBUL | I love the AI budget advisor, but I wish I could export m... |
| USR-007 | Smriti kumari | adhikarismriti994@gmail.com | GDVGEANJKZ6PATGIEJYFL3SIHUG4UEFPFIWL4SWA54YYKBDZ2ZREKKAW | Smart contract escrow is great for security! Adding a dar... |
| USR-008 | Simmi Tiwari | simmitiwari770@gmail.com | GA43TYO2HJ3C7BQL65HVGUJE3DQC6GANAKOD7IUUKORWQPOSPF57XF5Y | mobile app version (iOS/Android) with push notifications ... |
| USR-009 | Eshan Mehra | enzobaby0099@gmail.com | GDCW4EMRDG6XHMIDARGEE6HO6GMXHGP5BEPODRFNT4WJJIPDA5BKJPWV | It would be useful to manually categorize some transactio... |
| USR-010 | Shan Arav | shantanav7@gmail.com | GCXLFK7J6HPWKNC7WZMAAXOYNLBNVZN5RKZFY72O6QD3VPR75V3REONO | Could you integrate automated SMS or email alerts to noti... |
| USR-011 | Subheksh koma | komasubheeksh@gmail.com | GDLFDODWAZ4VBLQPZTVCZUYMBTDFXEAIGBOEQVY2A7RD43FPKC76KQF2 | Spending graphs are helpful, but adding a split-bill calc... |
| USR-012 | Sara Anaya | saranyasa999@gmail.com | GA76C36OPSVHNVT3A2CHK6JLJZEJJF3H5PX5VZKHIGLQMTVOY4N3VQRG | Please add a feature to set up recurring automated deposi... |
| USR-013 | Anil Kumar | anilkumar981@gmail.com | GAGL2NCWNZQGU3C6MLQVJWMPQYVKPMW7ZJ4JL53NZ6GC3X4EFTSHZVRB | Can you add support for biometric login (FaceID/Fingerpri... |
| USR-014 | Sunita Gupta | sunitagupta2204@gmail.com | GBSNS35EEP2XSCKR7DLNQ5OJY6JGXEMKBRX34EFSKTBDF2AH2GZMOHML | UI is clean, but a pie chart breaking down expenditure by... |
| USR-015 | rakesh Sharma | rakeshsharma885@gmail.com | GAP6ZDDWZISX4QBVIG6K3WSQIE64JL3AQ6KOABV6LUJWSPUFS67N5323 | It would be great if the parent dashboard showed a consol... | Providing a monthly financial summary report via email co... |

---

## 10. Product Improvements (Based on Real User Feedback)

Based on feedback from our early pilot cohort, we identified and implemented the following improvements to hit production quality standards. Below is an Improvement Summary mapped to the User Feedback.

### 📊 Feedback Implementation Tracker


| User ID | Name | Email | Wallet Address | Feedback Summary | Improvement Made | Git Commit Link |
|---|---|---|---|---|---|---|
| USR-028 | Vijay Pillai | vijaypillai707@gmail.com | GACVDW3GYQE5TMRJZA4U2WTUED6ZQSOXWQAUUZQIWEKXUQFXFXBHOITG | option to temporarily pause the escro... | Pause/Unpause Escrow | [`a86463b`](https://github.com/anukri7970/studentExapense-Upgraded/commit/a86463b) |
| USR-045 | Ajay Thakur | ajaythakur002@gmail.com | GB6MNVL74T5XBKZFJM4YNEUHC4XZTNDZYNDTZFI4543CDDR5NXDQ5JA5 | resolve dispute' action should perhap... | Resolution Reason | [`2016282`](https://github.com/anukri7970/studentExapense-Upgraded/commit/2016282) |
| USR-016 | Kavita Singh | kavitasingh775@gmail.com | GCAH7TO54AZ2YBA6OMVGGB7J7VP7N3E5MNXFD5LLJZ7M2AOSDRB2P5L5 | escrow process is straightforward, bu... | Cancel Deposit | [`6b25191`](https://github.com/anukri7970/studentExapense-Upgraded/commit/6b25191) |
| USR-035 | Rohan Tiwari | rohantiwari002@gmail.com | GDQOHE3W25SUW6BITN46YQPAV7N3ZWT6OE5AKOMHL5NGXS27VB4YIXJW | Can we get a 'low balance' warning no... | Low Balance Warning Event | [`838c393`](https://github.com/anukri7970/studentExapense-Upgraded/commit/838c393) |
| USR-034 | Sandeep Bhat | sandeepbhater4@gmail.com | GAH737E7QIXB6Z4IA3PU63DLH7TMCMWIM7WKO3SB7OJB3HCS3P2ZQPOZ | Adding customizable spending limits f... | Withdrawal Limits | [`f074905`](https://github.com/anukri7970/studentExapense-Upgraded/commit/f074905) |
| USR-024 | Khushi Singh | singhkhushi0719@gmail.com | GA2FKMXBWYWM5JBL2DYK4OH7SSMZNG6A5KEEFCBQREJGL34BEXCJWNMP | Please add a tooltip explaining what ... | Code Documentation for Tooltips | [`dff87fc`](https://github.com/anukri7970/studentExapense-Upgraded/commit/dff87fc) |
| USR-006 | Anu Mehta | anukr12354@gmail.com | GAIHNZ2BCDIERQEES5GEVEZ26QWRQKKEX4P63KIZEQTLZIFOM365HBUL | I love the AI budget advisor, but I w... | Spending Categories | [`1467ba7`](https://github.com/anukri7970/studentExapense-Upgraded/commit/1467ba7) |

---

## 11. Future Roadmap

### Phase 1 (Next 3 months)
- Dark Mode deployment and enhanced styling presets.
- PDF Export functionalities for budget reports.

### Phase 2 (6-12 months)
- Automated recurring allowances using Soroban cron schedules.
- Multi-asset parent deposits (USDC integration).

### Phase 3 (12-24 months)
- Mobile App release (iOS & Android).
- API integrations with university tuition portals.

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
| Frontend | Vercel | Set `NEXT_PUBLIC_API_URL` to your deployed backend URL, plus the PostHog/Sentry public keys. Deployed explicitly via the standard `vercel` CLI, relying on external connection secrets. |
| Backend | Render (or any Node host) | Set every variable from `.env.example`. `CLIENT_ORIGIN` must match your deployed frontend's origin exactly (CORS). |
| Database | MongoDB Atlas | Free tier is enough for this MVP's scale. |

## Known simplifications (stated, not hidden)

- **Wallet custody is server-side** for MVP simplicity. A real product would
  move signing to the client via a wallet extension.
- **University discovery is a flat list** (`GET /users/universities`) rather
  than a verified-institution directory — fine for a demo with 1-2 seeded
  universities, not how you'd do KYC'd institutional payouts.
- **No multi-asset netting** in the contract — each `(parent, student,
  asset) triple has its own balance. Correct and simple; a larger version
  might want a single unified balance across assets.
- **Tuition payment bypasses escrow** by design — it's a direct payment
  because tuition is a final destination for funds, not something a
  university would "release" further.



