const { expect } = require("chai");
const { ethers } = require("hardhat");

const usdc = (value) => ethers.parseUnits(value, 6);

describe("ScriptoriumSplitRouter", function () {
  async function deployFixture() {
    const [payer, creator, platform, referrer, agentA, agentB] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const token = await MockUSDC.deploy();

    const ScriptoriumSplitRouter = await ethers.getContractFactory("ScriptoriumSplitRouter");
    const router = await ScriptoriumSplitRouter.deploy(
      await token.getAddress(),
      platform.address,
      500,
      200
    );

    await token.mint(payer.address, usdc("1"));
    await token.connect(payer).approve(await router.getAddress(), usdc("1"));

    return { payer, creator, platform, referrer, agentA, agentB, token, router };
  }

  it("splits an article payment across platform, referrer, agents, and creator", async function () {
    const { payer, creator, platform, referrer, agentA, agentB, token, router } = await deployFixture();

    await router.connect(payer).payArticle(
      ethers.id("article-1"),
      creator.address,
      referrer.address,
      [agentA.address, agentB.address],
      [1500, 1500],
      usdc("0.10")
    );

    expect(await token.balanceOf(referrer.address)).to.equal(usdc("0.002"));
    expect(await token.balanceOf(platform.address)).to.equal(usdc("0.003"));
    expect(await token.balanceOf(agentA.address)).to.equal(usdc("0.01425"));
    expect(await token.balanceOf(agentB.address)).to.equal(usdc("0.01425"));
    expect(await token.balanceOf(creator.address)).to.equal(usdc("0.0665"));
  });

  it("emits article payment accounting with the full platform fee and referral cut", async function () {
    const { payer, creator, platform, referrer, token, router } = await deployFixture();

    await expect(
      router.connect(payer).payArticle(
        ethers.id("article-event"),
        creator.address,
        referrer.address,
        [],
        [],
        usdc("0.10")
      )
    ).to.emit(router, "ArticlePaid").withArgs(
      ethers.id("article-event"),
      payer.address,
      creator.address,
      referrer.address,
      usdc("0.10"),
      usdc("0.005"),
      usdc("0.002"),
      usdc("0.095")
    );

    expect(await token.balanceOf(platform.address)).to.equal(usdc("0.003"));
    expect(await token.balanceOf(referrer.address)).to.equal(usdc("0.002"));
  });

  it("sends the whole contributor pool to the creator when there are no agents", async function () {
    const { payer, creator, platform, token, router } = await deployFixture();

    await router.connect(payer).payArticle(
      ethers.id("article-2"),
      creator.address,
      ethers.ZeroAddress,
      [],
      [],
      usdc("0.10")
    );

    expect(await token.balanceOf(platform.address)).to.equal(usdc("0.005"));
    expect(await token.balanceOf(creator.address)).to.equal(usdc("0.095"));
  });

  it("rejects invalid split arrays", async function () {
    const { payer, creator, agentA, router } = await deployFixture();

    await expect(
      router.connect(payer).payArticle(
        ethers.id("article-3"),
        creator.address,
        ethers.ZeroAddress,
        [agentA.address],
        [],
        usdc("0.10")
      )
    ).to.be.revertedWithCustomError(router, "InvalidSplitConfig");
  });

  it("blocks reentrant payArticle calls attempted by a malicious token", async function () {
    const [payer, creator, platform] = await ethers.getSigners();

    const ReentrantUSDC = await ethers.getContractFactory("ReentrantUSDC");
    const token = await ReentrantUSDC.deploy();

    const ScriptoriumSplitRouter = await ethers.getContractFactory("ScriptoriumSplitRouter");
    const router = await ScriptoriumSplitRouter.deploy(
      await token.getAddress(),
      platform.address,
      500,
      200
    );

    await token.mint(payer.address, usdc("1"));
    await token.connect(payer).approve(await router.getAddress(), usdc("1"));
    await token.armAttack(await router.getAddress(), creator.address);

    await router.connect(payer).payArticle(
      ethers.id("article-reentry"),
      creator.address,
      ethers.ZeroAddress,
      [],
      [],
      usdc("0.10")
    );

    expect(await token.reentryBlocked()).to.equal(true);
    expect(await token.balanceOf(platform.address)).to.equal(usdc("0.005"));
    expect(await token.balanceOf(creator.address)).to.equal(usdc("0.095"));
  });

  it("allows only the owner/deployer wallet to rescue accidentally stuck ERC20 funds", async function () {
    const { payer, creator, platform, token, router } = await deployFixture();
    const routerAddress = await router.getAddress();

    await token.mint(routerAddress, usdc("0.25"));

    await expect(
      router.connect(creator).rescueERC20(await token.getAddress(), platform.address, usdc("0.25"))
    ).to.be.revertedWithCustomError(router, "Unauthorized");

    await expect(
      router.connect(payer).rescueERC20(await token.getAddress(), platform.address, usdc("0.25"))
    ).to.emit(router, "ERC20Rescued").withArgs(await token.getAddress(), platform.address, usdc("0.25"));

    expect(await token.balanceOf(routerAddress)).to.equal(0);
    expect(await token.balanceOf(platform.address)).to.equal(usdc("0.25"));
  });

  it("allows only the owner/deployer wallet to rescue native funds sent to the router", async function () {
    const { payer, creator, platform, router } = await deployFixture();
    const routerAddress = await router.getAddress();
    const stuckNative = ethers.parseEther("0.01");

    await payer.sendTransaction({ to: routerAddress, value: stuckNative });
    expect(await ethers.provider.getBalance(routerAddress)).to.equal(stuckNative);

    await expect(
      router.connect(creator).rescueNative(platform.address, stuckNative)
    ).to.be.revertedWithCustomError(router, "Unauthorized");

    await expect(
      router.connect(payer).rescueNative(platform.address, stuckNative)
    ).to.emit(router, "NativeRescued").withArgs(platform.address, stuckNative);

    expect(await ethers.provider.getBalance(routerAddress)).to.equal(0);
  });
});
