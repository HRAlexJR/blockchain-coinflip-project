pragma solidity =0.5.16;

import './provableAPI_0.5.sol';

contract Coinflip is usingProvable {
    
    struct Bet {
        uint betValue;
        uint headsTails;
        uint setRandomPrice;
    }
    
    mapping(address => uint) public playerWinnings;
    mapping (address => Bet) public waiting;
    mapping (bytes32 => address) public afterWaiting;
    
    event logNewProvableQuery(string description);
    event sentQueryId(address caller, bytes32 indexed queryId);
    event callbackReceived(bytes32 indexed queryId, string description, uint256 amount);
    event userWithdrawal(address indexed caller, uint256 amount);

    uint public contractBalance;
    
    uint256 constant GAS_FOR_CALLBACK = 200000;
    uint256 constant NUM_RANDOM_BYTES_REQUESTED = 1;
    
    address payable public owner;
    bool public freeCallback = true;

    constructor() public payable {
        owner = msg.sender;
        contractBalance = msg.value;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function flip(uint256 oneZero) public payable {
        require(contractBalance > msg.value, "Insufficient contract balance");

        uint256 randomPrice = freeCallback ? 0 : getQueryPrice();
        freeCallback = false;

        bytes32 queryId = provable_newRandomDSQuery(
            0,
            NUM_RANDOM_BYTES_REQUESTED,
            GAS_FOR_CALLBACK
        );
        
        emit logNewProvableQuery("Message sent. Waiting for an answer...");
        emit sentQueryId(msg.sender, queryId);

        afterWaiting[queryId] = msg.sender;
        waiting[msg.sender] = Bet(msg.value, oneZero, randomPrice);
    }
    
    function __callback(bytes32 _queryId, string memory _result) public {
        require(msg.sender == provable_cbAddress());

        uint256 flipResult = uint256(keccak256(abi.encodePacked(_result))) % 2;
        address _player = afterWaiting[_queryId];
        Bet memory postBet = waiting[_player];

        if(flipResult == postBet.headsTails){
            uint winAmount = postBet.betValue * 2 - postBet.setRandomPrice;
            contractBalance -= postBet.betValue;
            playerWinnings[_player] += winAmount;
            emit callbackReceived(_queryId, "Winner", postBet.betValue);
        } else {
            contractBalance += postBet.betValue - postBet.setRandomPrice;
            emit callbackReceived(_queryId, "Loser", postBet.betValue);
        }
    }
    
    function getQueryPrice() internal returns(uint256 _price) {
        return provable_getPrice("price", GAS_FOR_CALLBACK);
    }
    
    function withdrawUserWinnings() public {
        uint toTransfer = playerWinnings[msg.sender];
        require(toTransfer > 0, "No funds to withdraw");

        playerWinnings[msg.sender] = 0;
        msg.sender.transfer(toTransfer);
        emit userWithdrawal(msg.sender, toTransfer);
    }
    
    function getWinningsBalance() public view returns(uint) {
        return playerWinnings[msg.sender];
    }
    
    function fundContract() public payable onlyOwner {
        contractBalance += msg.value;
    }
    
    function fundWinnings() public payable onlyOwner {
        playerWinnings[msg.sender] += msg.value;
    }
    
    function withdrawAll() public onlyOwner {
        uint toTransfer = contractBalance;
        contractBalance = 0;
        msg.sender.transfer(toTransfer);
    }

}
