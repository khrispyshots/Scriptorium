// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "./interfaces/IERC20.sol";

contract ScriptoriumSplitRouter {
    uint16 public constant BPS_DENOMINATOR = 10_000;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    IERC20 public immutable usdc;
    address public owner;
    address public platformTreasury;
    uint16 public platformFeeBps;
    uint16 public referralFeeBps;
    uint256 private _reentrancyStatus;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PlatformTreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);
    event FeesUpdated(uint16 platformFeeBps, uint16 referralFeeBps);
    event ERC20Rescued(address indexed token, address indexed to, uint256 amount);
    event NativeRescued(address indexed to, uint256 amount);
    event ArticlePaid(
        bytes32 indexed articleId,
        address indexed payer,
        address indexed creator,
        address referrer,
        uint256 amount,
        uint256 platformAmount,
        uint256 referralAmount,
        uint256 creatorAmount
    );
    event RecipientPaid(bytes32 indexed articleId, address indexed recipient, string role, uint256 amount);

    error Unauthorized();
    error ZeroAddress();
    error InvalidFeeConfig();
    error InvalidAmount();
    error InvalidSplitConfig();
    error TransferFailed();
    error ReentrancyBlocked();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier nonReentrant() {
        if (_reentrancyStatus == _ENTERED) revert ReentrancyBlocked();
        _reentrancyStatus = _ENTERED;
        _;
        _reentrancyStatus = _NOT_ENTERED;
    }

    constructor(
        address usdc_,
        address platformTreasury_,
        uint16 platformFeeBps_,
        uint16 referralFeeBps_
    ) {
        if (usdc_ == address(0) || platformTreasury_ == address(0)) revert ZeroAddress();
        if (referralFeeBps_ > platformFeeBps_ || platformFeeBps_ > BPS_DENOMINATOR) revert InvalidFeeConfig();

        usdc = IERC20(usdc_);
        owner = msg.sender;
        platformTreasury = platformTreasury_;
        platformFeeBps = platformFeeBps_;
        referralFeeBps = referralFeeBps_;
        _reentrancyStatus = _NOT_ENTERED;

        emit OwnershipTransferred(address(0), msg.sender);
        emit FeesUpdated(platformFeeBps_, referralFeeBps_);
    }

    receive() external payable {}

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setPlatformTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit PlatformTreasuryUpdated(platformTreasury, newTreasury);
        platformTreasury = newTreasury;
    }

    function setFees(uint16 newPlatformFeeBps, uint16 newReferralFeeBps) external onlyOwner {
        if (newReferralFeeBps > newPlatformFeeBps || newPlatformFeeBps > BPS_DENOMINATOR) revert InvalidFeeConfig();
        platformFeeBps = newPlatformFeeBps;
        referralFeeBps = newReferralFeeBps;
        emit FeesUpdated(newPlatformFeeBps, newReferralFeeBps);
    }

    function payArticle(
        bytes32 articleId,
        address creator,
        address referrer,
        address[] calldata agentRecipients,
        uint16[] calldata agentShareBps,
        uint256 amount
    ) external nonReentrant {
        if (creator == address(0)) revert ZeroAddress();
        if (amount == 0) revert InvalidAmount();
        if (agentRecipients.length != agentShareBps.length) revert InvalidSplitConfig();

        uint256 totalAgentBps;
        for (uint256 i = 0; i < agentShareBps.length; i++) {
            if (agentRecipients[i] == address(0)) revert ZeroAddress();
            totalAgentBps += agentShareBps[i];
        }
        if (totalAgentBps > BPS_DENOMINATOR) revert InvalidSplitConfig();

        _safeTransferFrom(msg.sender, address(this), amount);

        uint256 platformAmount = (amount * platformFeeBps) / BPS_DENOMINATOR;
        uint256 referralAmount;
        if (referrer != address(0) && referralFeeBps > 0) {
            referralAmount = (amount * referralFeeBps) / BPS_DENOMINATOR;
            if (referralAmount > platformAmount) revert InvalidFeeConfig();
            _safeTransfer(referrer, referralAmount);
            emit RecipientPaid(articleId, referrer, "referrer", referralAmount);
        }

        uint256 treasuryAmount = platformAmount - referralAmount;
        if (treasuryAmount > 0) {
            _safeTransfer(platformTreasury, treasuryAmount);
            emit RecipientPaid(articleId, platformTreasury, "platform", treasuryAmount);
        }

        uint256 contributorPool = amount - platformAmount;
        uint256 paidToAgents;
        for (uint256 i = 0; i < agentRecipients.length; i++) {
            uint256 agentAmount = (contributorPool * agentShareBps[i]) / BPS_DENOMINATOR;
            paidToAgents += agentAmount;
            if (agentAmount > 0) {
                _safeTransfer(agentRecipients[i], agentAmount);
                emit RecipientPaid(articleId, agentRecipients[i], "agent", agentAmount);
            }
        }

        uint256 creatorAmount = contributorPool - paidToAgents;
        _safeTransfer(creator, creatorAmount);
        emit RecipientPaid(articleId, creator, "creator", creatorAmount);

        emit ArticlePaid(
            articleId,
            msg.sender,
            creator,
            referrer,
            amount,
            platformAmount,
            referralAmount,
            creatorAmount
        );
    }

    function rescueERC20(address token, address to, uint256 amount) external onlyOwner nonReentrant {
        if (token == address(0) || to == address(0)) revert ZeroAddress();
        if (amount == 0) revert InvalidAmount();
        if (!IERC20(token).transfer(to, amount)) revert TransferFailed();
        emit ERC20Rescued(token, to, amount);
    }

    function rescueNative(address payable to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert InvalidAmount();
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit NativeRescued(to, amount);
    }

    function _safeTransfer(address to, uint256 amount) private {
        if (!usdc.transfer(to, amount)) revert TransferFailed();
    }

    function _safeTransferFrom(address from, address to, uint256 amount) private {
        if (!usdc.transferFrom(from, to, amount)) revert TransferFailed();
    }
}
