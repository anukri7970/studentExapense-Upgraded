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
| 1 |      | parent |  |  |  |
| 2 |      | parent |  |  |  |
| 3 |      | parent |  |  |  |
| 4 |      | student |  |  |  |
| 5 |      | student |  |  |  |
| 6 |      | student |  |  |  |
| 7 |      | student |  |  |  |
| 8 |      | student |  |  |  |
| 9 |      | university |  |  |  |
| 10 |     | university |  |  |  |

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
