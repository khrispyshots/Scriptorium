const { ethers } = require("hardhat");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function requireAddress(name) {
  const value = requireEnv(name);
  if (!ethers.isAddress(value)) {
    throw new Error(`${name} must be a valid EVM address`);
  }
  return value;
}

function readFeeBps(name, fallback) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isInteger(value) || value < 0 || value > 10_000) {
    throw new Error(`${name} must be an integer from 0 to 10000`);
  }
  return value;
}

async function main() {
  const usdcAddress = requireAddress("USDC_ADDRESS");
  const [deployer] = await ethers.getSigners();
  const platformTreasury = requireAddress("PLATFORM_TREASURY");
  const platformFeeBps = readFeeBps("PLATFORM_FEE_BPS", 500);
  const referralFeeBps = readFeeBps("REFERRAL_FEE_BPS", 200);

  if (referralFeeBps > platformFeeBps) {
    throw new Error("REFERRAL_FEE_BPS cannot exceed PLATFORM_FEE_BPS");
  }

  const ScriptoriumSplitRouter = await ethers.getContractFactory("ScriptoriumSplitRouter");
  const router = await ScriptoriumSplitRouter.deploy(
    usdcAddress,
    platformTreasury,
    platformFeeBps,
    referralFeeBps
  );

  await router.waitForDeployment();

  console.log("ScriptoriumSplitRouter deployed:", await router.getAddress());
  console.log("USDC:", usdcAddress);
  console.log("Platform treasury:", platformTreasury);
  console.log("Platform fee bps:", platformFeeBps);
  console.log("Referral fee bps:", referralFeeBps);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
