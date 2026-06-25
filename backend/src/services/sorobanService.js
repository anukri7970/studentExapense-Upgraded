const {
  Keypair,
  Contract,
  SorobanRpc,
  TransactionBuilder,
  Networks,
  nativeToScVal,
  scValToNative,
  Address,
  BASE_FEE,
} = require('@stellar/stellar-sdk');

function getRpcServer() {
  return new SorobanRpc.Server(process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org');
}

function getContract() {
  const contractId = process.env.SEND_FUNDS_CONTRACT_ID;
  if (!contractId) {
    throw new Error(
      'SEND_FUNDS_CONTRACT_ID is not set. Deploy the contract first (see contracts/README.md) and put its address in .env.'
    );
  }
  return new Contract(contractId);
}

/**
 * Builds and simulates a Soroban contract invocation, returning the base64 XDR
 * string so the frontend can prompt the user to sign it via Freighter.
 */
async function buildContractCall(method, scArgs, sourcePublicKey) {
  const server = getRpcServer();
  const sourceAccount = await server.getAccount(sourcePublicKey);
  const contract = getContract();

  const networkPassphrase = Networks.TESTNET;

  let tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(contract.call(method, ...scArgs))
    .setTimeout(300) // 5 minutes to give user time to sign
    .build();

  // Simulate first to get the correct resource footprint / fees.
  const simulated = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simulated)) {
    throw new Error(`Soroban simulation failed for ${method}: ${simulated.error}`);
  }

  tx = SorobanRpc.assembleTransaction(tx, simulated).build();
  
  return tx.toXDR();
}

/**
 * Builds deposit XDR (stroops = XLM * 10_000_000) for the parent to sign.
 */
async function buildDepositXdr({ parentPublicKey, studentPublicKey, assetAddress, amountStroops }) {
  const args = [
    new Address(parentPublicKey).toScVal(),
    new Address(studentPublicKey).toScVal(),
    new Address(assetAddress).toScVal(),
    nativeToScVal(amountStroops, { type: 'i128' }),
  ];
  return buildContractCall('deposit', args, parentPublicKey);
}

/**
 * Builds release XDR for the student to sign.
 */
async function buildReleaseXdr({ parentPublicKey, studentPublicKey, assetAddress, amountStroops }) {
  const args = [
    new Address(parentPublicKey).toScVal(),
    new Address(studentPublicKey).toScVal(),
    new Address(assetAddress).toScVal(),
    nativeToScVal(amountStroops, { type: 'i128' }),
  ];
  return buildContractCall('release', args, studentPublicKey);
}

/**
 * Read-only balance check. Uses simulation only (no signature, no fee,
 * no ledger write) since get_balance never mutates state.
 */
async function getEscrowBalance({ parentPublicKey, studentPublicKey, assetAddress, sourcePublicKey }) {
  const server = getRpcServer();
  const sourceAccount = await server.getAccount(sourcePublicKey);
  const contract = getContract();

  const networkPassphrase = Networks.TESTNET;

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(
      contract.call(
        'get_balance',
        new Address(parentPublicKey).toScVal(),
        new Address(studentPublicKey).toScVal(),
        new Address(assetAddress).toScVal()
      )
    )
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simulated)) {
    throw new Error(`Soroban simulation failed for get_balance: ${simulated.error}`);
  }

  const result = SorobanRpc.Api.isSimulationSuccess(simulated) ? simulated.result : null;
  return result ? scValToNative(result.retval) : 0;
}

module.exports = {
  buildDepositXdr,
  buildReleaseXdr,
  getEscrowBalance,
};
