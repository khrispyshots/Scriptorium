import { Wallet, getAddress, isAddress } from 'ethers';

export function shortenAddress(address, head = 8, tail = 6) {
  if (!address) return '';
  if (address.length <= head + tail + 3) return address;
  return `${address.slice(0, head)}...${address.slice(-tail)}`;
}

export function generateEvmWallet() {
  const generated = Wallet.createRandom();

  if (!isAddress(generated.address)) {
    throw new Error('Invalid EVM wallet address generated.');
  }

  const address = getAddress(generated.address);
  const verificationWallet = new Wallet(generated.privateKey);

  if (getAddress(verificationWallet.address) !== address) {
    throw new Error('Generated private key does not match generated address.');
  }

  return {
    address,
    privateKey: generated.privateKey,
    mnemonic: generated.mnemonic?.phrase,
  };
}

export function validatePrivateKey(privateKey) {
  const verificationWallet = new Wallet(privateKey);

  if (!isAddress(verificationWallet.address)) {
    throw new Error('Decrypted private key is invalid.');
  }

  return {
    privateKey,
    address: getAddress(verificationWallet.address),
  };
}

export function isLikelyEvmAddress(address) {
  return Boolean(address && isAddress(address));
}
