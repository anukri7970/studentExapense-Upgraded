/**
 * Prints the Stellar Asset Contract (SAC) address for native XLM on
 * testnet. Soroban's token interface treats native XLM as a token
 * contract under the hood — this script derives that contract's address
 * so you can put it in STELLAR_NATIVE_ASSET_CONTRACT_ID in your .env.
 *
 * Usage: node src/scripts/getNativeAssetContractId.js
 */
require('dotenv').config();
const { Asset, Contract } = require('@stellar/stellar-sdk');

function main() {
  const networkPassphrase =
    process.env.STELLAR_NETWORK === 'PUBLIC'
      ? require('@stellar/stellar-sdk').Networks.PUBLIC
      : require('@stellar/stellar-sdk').Networks.TESTNET;

  const native = Asset.native();
  const contractId = native.contractId(networkPassphrase);

  // eslint-disable-next-line no-console
  console.log('Native XLM Stellar Asset Contract address:');
  // eslint-disable-next-line no-console
  console.log(contractId);
  // eslint-disable-next-line no-console
  console.log('\nCopy this into STELLAR_NATIVE_ASSET_CONTRACT_ID in your .env file.');
}

main();
