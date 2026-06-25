# User Wallet Proof

Fill this in once your 10+ real users have signed up and made at least one
transaction. Run `npm run seed` in `backend/` first if you want pre-funded
wallets ready to hand out to friends/classmates — it prints exactly this
table for the seeded accounts at the end.

For real (non-seeded) users, get each row by:
1. Having them sign up at your deployed frontend URL.
2. Copying their wallet address from the dashboard header (click the
   truncated address to copy it).
3. Having them complete at least one real action (parent sends funds,
   student releases funds, or student pays tuition).
4. Pulling the resulting `txHash` from their dashboard's transaction table,
   or from Mongo directly: `db.transactions.find({ fromUser: <userId> })`.

## Table

| # | Name | Role | Wallet address (public key) | Tx hash | Timestamp |
|---|------|------|------------------------------|---------|-----------|
| 1 | Arjun Sharma | parent | GC2SHV5FQQX55DS3BDCJMSLWZ4DTEN66WFPSPXFKPOVFIOA7S4PO6PLY |  |  |
| 2 | Meera Patel | parent | GCH5QB2YOOYHPAEMPZAKPZCDLYDYHVJCOLG47QKEBIFQAALJYZ3GYN2Z |  |  |
| 3 | Sanjay Gupta | parent | GA6GQBB47DPO5SWUHMHDVRHROAKE2EWESR4EVAEZDSLIAXMGVB7LUP3R |  |  |
| 4 | Aarav Sharma | student | GDAHT54UMSI2A4B4YPSNCUOBJWEEXF4HZDKM2P4GH6VBZJBJHQDVJNUB |  |  |
| 5 | Diya Patel | student | GDRJSONJYKRP5NNWKMLY5H6TDO7NCY2UPHKWVE36X3WN7ILKNUXJ3WGA |  |  |
| 6 | Rahul Gupta | student | GA6S7EBJK242B5HQA72QTCFBQIDHE5WKITELSZHS4YIZLQT4QUO7FRVL |  |  |
| 7 | Kavya Singh | student | GAHZOZYV2ZAW4UWMQUZZKFWW6ZLK7GCILRBC7BCAQRPU5MDGW7SDNECK |  |  |
| 8 | Ishaan Desai | student | GAM3W5PMR3E4FR5XJG6D5G5DMBH7IJ7TXU36F23C2BRQFKCZZXD5TLEM |  |  |
| 9 | IIT Bombay | university | GB5KZLASZLI6EYOFIKDF3QQOVR6ULPNBBFTF3CWN423IISA7XSWFXIGF |  |  |
| 10 | Delhi University | university | GCTKOYF2PQPX3S7VBNIVGH3VV5A7U3UP3NLS3DGIIRKGJWP5RCSBORD2 |  |  |

Tip: link each tx hash to
`https://stellar.expert/explorer/testnet/tx/<hash>` in your final README so
reviewers can verify each one lands on-chain without trusting your
screenshots.

## Feedback summary

Once at least a few real users have submitted feedback via
`/dashboard/feedback`, fetch the aggregate:

```bash
curl -H "Authorization: Bearer <any-valid-token>" \
  https://<your-backend-url>/api/feedback/summary
```

Paste the response here, e.g.:

```json
{
  "count": 10,
  "avgOnboardingEaseRating": 4.3,
  "avgUiRating": 4.6,
  "wouldUseAgainPercent": 80.0,
  "favoriteFeatureCounts": {
    "expense tracking": 4,
    "ai budget advisor": 3,
    "sending funds": 3
  }
}
```
