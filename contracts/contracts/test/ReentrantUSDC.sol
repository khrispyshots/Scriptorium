// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IScriptoriumSplitRouter {
    function payArticle(
        bytes32 articleId,
        address creator,
        address referrer,
        address[] calldata agentRecipients,
        uint16[] calldata agentShareBps,
        uint256 amount
    ) external;
}

contract ReentrantUSDC {
    string public constant name = "Reentrant USDC";
    string public constant symbol = "USDC";
    uint8 public constant decimals = 6;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    IScriptoriumSplitRouter public router;
    address public attackCreator;
    bool public attackArmed;
    bool public reentryBlocked;

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function armAttack(address router_, address attackCreator_) external {
        router = IScriptoriumSplitRouter(router_);
        attackCreator = attackCreator_;
        attackArmed = true;
        reentryBlocked = false;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 approved = allowance[from][msg.sender];
        require(approved >= amount, "ALLOWANCE");
        allowance[from][msg.sender] = approved - amount;

        if (attackArmed) {
            attackArmed = false;
            address[] memory recipients = new address[](0);
            uint16[] memory shares = new uint16[](0);

            try router.payArticle(bytes32("reentry"), attackCreator, address(0), recipients, shares, 1) {
                reentryBlocked = false;
            } catch {
                reentryBlocked = true;
            }
        }

        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) private {
        require(to != address(0), "ZERO_ADDRESS");
        uint256 balance = balanceOf[from];
        require(balance >= amount, "BALANCE");
        balanceOf[from] = balance - amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}
