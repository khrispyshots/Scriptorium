import { ethers } from 'ethers';

const [, , to, amount] = process.argv;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

if (!ethers.isAddress(to || '')) {
  throw new Error('Recipient must be a valid EVM address');
}

if (!amount || Number(amount) <= 0) {
  throw new Error('Amount must be greater than zero');
}

const rpcUrl = requireEnv('WALLET_RPC_URL');
const tokenAddress = requireEnv('USDC_ADDRESS');
const privateKey = requireEnv('ONBOARDING_FUNDER_PRIVATE_KEY');
const expectedFunderAddress = process.env.ONBOARDING_FUNDER_ADDRESS;

if (!ethers.isAddress(tokenAddress)) {
  throw new Error('USDC_ADDRESS must be a valid EVM address');
}

const provider = new ethers.JsonRpcProvider(rpcUrl);
const signer = new ethers.Wallet(privateKey, provider);

if (expectedFunderAddress && signer.address.toLowerCase() !== expectedFunderAddress.toLowerCase()) {
  throw new Error('ONBOARDING_FUNDER_PRIVATE_KEY does not match ONBOARDING_FUNDER_ADDRESS');
}

const token = new ethers.Contract(
  tokenAddress,
  [
    'function decimals() view returns (uint8)',
    'function balanceOf(address) view returns (uint256)',
    'function transfer(address,uint256) returns (bool)'
  ],
  signer
);

const decimals = await token.decimals();
const value = ethers.parseUnits(amount, decimals);
const balance = await token.balanceOf(signer.address);

if (balance < value) {
  throw new Error('ONBOARDING_FUNDER_INSUFFICIENT_USDC');
}

const tx = await token.transfer(to, value);
const receipt = await tx.wait();

console.log(JSON.stringify({
  tx_reference: tx.hash,
  status: receipt.status === 1 ? 'completed' : 'failed',
  block_number: receipt.blockNumber?.toString(),
  from: signer.address,
  to,
  amount
}));
