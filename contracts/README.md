# Send Funds — Soroban Contract

A custodial escrow contract on Stellar testnet. Parents deposit XLM earmarked
for a specific student; students release (withdraw) it into their own wallet
whenever they need it. Balances are tracked per `(parent, student, asset)`
triple so one parent can support multiple students, and one student can
receive from multiple parents, without the amounts getting mixed up.

```
deposit(parent, student, asset, amount) -> i128   // parent escrows funds
release(parent, student, asset, amount) -> i128   // student withdraws funds
get_balance(parent, student, asset)     -> i128   // read-only balance check
```

## Prerequisites

You need the Rust toolchain, the `wasm32v1-none` (or `wasm32-unknown-unknown`
on older toolchains) target, and the Stellar CLI.

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32v1-none

# Stellar CLI (includes Soroban tooling)
cargo install --locked stellar-cli
stellar --version
```

If `wasm32v1-none` isn't available on your Rust version, use
`wasm32-unknown-unknown` instead and adjust the build command below
accordingly — both work, the CLI defaults differ slightly across versions.

## 1. Run the tests

Before deploying anything, run the test suite — it covers deposit, partial
release, accumulation across multiple deposits, insufficient-balance
rejection, invalid-amount rejection, and authorization enforcement.

```bash
cd contracts/send-funds
cargo test
```

All seven tests should pass. This is your evidence the contract logic is
correct independent of network conditions.

## 2. Build the contract

```bash
cd contracts/send-funds
stellar contract build
```

This produces a `.wasm` file at
`target/wasm32v1-none/release/send_funds.wasm` (path varies slightly by
toolchain/target).

## 3. Create and fund a deployer identity

```bash
stellar keys generate deployer --network testnet
stellar keys fund deployer --network testnet
```

## 4. Deploy to testnet

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/send_funds.wasm \
  --source deployer \
  --network testnet
```

This prints a contract address starting with `C...`. **Copy it** —
this is your `SEND_FUNDS_CONTRACT_ID` for the backend `.env`, and the
address you submit as your "Soroban contract address" deliverable.

## 5. Look up the native asset's contract address

Soroban treats XLM as a token contract under the hood (the Stellar Asset
Contract, or SAC). The backend needs its address to call `deposit`/`release`
with native XLM. From the backend directory:

```bash
cd ../../backend
node src/scripts/getNativeAssetContractId.js
```

Copy the printed address into `STELLAR_NATIVE_ASSET_CONTRACT_ID` in your
backend `.env`.

## 6. Sanity-check with a manual invocation (optional)

```bash
stellar contract invoke \
  --id <SEND_FUNDS_CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- \
  get_balance \
  --parent <SOME_G_ADDRESS> \
  --student <SOME_G_ADDRESS> \
  --asset <NATIVE_ASSET_CONTRACT_ID>
```

Should return `0` for any pair that's never deposited to — confirms the
contract is live and callable before you wire up the full app.

## Design notes

- **Escrow, not a direct transfer.** `deposit` pulls funds from the parent
  into the contract's own balance rather than straight to the student. This
  is what makes "the student tracks what they've actually drawn down" a
  meaningful distinction from "the student got sent money" — release is a
  deliberate second step, mirroring how an allowance or sponsored-fund
  arrangement usually works in practice.
- **Auth is asymmetric on purpose.** `deposit` requires the parent's
  signature; `release` requires the student's. Neither party can move the
  other's funds unilaterally — the contract enforces this with
  `require_auth()`, not application-level trust.
- **Generic over asset, not just XLM.** Every function takes an `asset`
  address rather than assuming native XLM. The MVP only exercises it with
  the native SAC, but swapping in a custom issued token (e.g. a campus
  credit) requires zero contract changes.
- **Events use the stable `env.events().publish()` API** rather than the
  newer `#[contractevent]` derive macro, to avoid coupling to a macro
  signature that has changed shape across recent SDK releases. Functionally
  equivalent — same topics, same data, fully indexable by `stellar-expert`
  or any RPC event listener.
