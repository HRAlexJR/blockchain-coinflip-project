// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/Coinflip.sol";

contract TestCoinflip {
    Coinflip coinflip;

    function beforeEach() public {
        coinflip = new Coinflip();
    }

    function testFlip() public {
        uint256 initialBalance = address(coinflip).balance;
        uint256 betAmount = 0.1 ether;
        uint256 expectedBalance = initialBalance + betAmount;

        coinflip.flip.value(betAmount)(0);

        Assert.equal(address(coinflip).balance, expectedBalance, "Contract balance should increase by bet amount");
    }

    function testCallback() public {
        uint256 betAmount = 0.1 ether;
        coinflip.flip.value(betAmount)(0);

        bytes32 queryId = bytes32(keccak256("test"));
        coinflip.__callback(queryId, "123");

        Assert.equal(coinflip.playerWinnings(address(this)), betAmount * 2, "Player should win");
    }

    function testWithdrawUserWinnings() public {
        uint256 betAmount = 0.1 ether;
        coinflip.flip.value(betAmount)(0);

        bytes32 queryId = bytes32(keccak256("test"));
        coinflip.__callback(queryId, "123");

        uint256 initialBalance = address(this).balance;
        coinflip.withdrawUserWinnings();

        Assert.isTrue(address(this).balance > initialBalance, "User should be able to withdraw winnings");
    }

    function testFundContract() public payable {
        uint256 initialBalance = address(coinflip).balance;
        uint256 amount = 1 ether;

        coinflip.fundContract.value(amount)();

        Assert.equal(address(coinflip).balance, initialBalance + amount, "Contract balance should increase by funding amount");
    }

    function testWithdrawAll() public {
        uint256 initialBalance = address(this).balance;
        uint256 contractBalance = address(coinflip).balance;

        coinflip.withdrawAll();

        Assert.equal(address(this).balance, initialBalance + contractBalance, "Owner should withdraw all funds");
    }
}