require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
const arcRpcUrl = process.env.ARC_TESTNET_RPC_URL || "";
const arcChainId = process.env.ARC_TESTNET_CHAIN_ID
  ? Number(process.env.ARC_TESTNET_CHAIN_ID)
  : 5042002;
const arcExplorerUrl = (process.env.ARC_TESTNET_EXPLORER_URL || "https://testnet.arcscan.app").replace(/\/$/, "");

/** @type {import("hardhat/config").HardhatUserConfig} */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    arcTestnet: {
      url: arcRpcUrl,
      chainId: arcChainId,
      accounts: deployerPrivateKey ? [deployerPrivateKey] : []
    }
  },
  etherscan: {
    apiKey: {
      arcTestnet: process.env.ARC_TESTNET_BLOCKSCOUT_API_KEY || ""
    },
    customChains: [
      {
        network: "arcTestnet",
        chainId: arcChainId,
        urls: {
          apiURL: `${arcExplorerUrl}/api`,
          browserURL: arcExplorerUrl
        }
      }
    ]
  }
};
