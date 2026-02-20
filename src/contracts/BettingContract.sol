// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BettingContract {
    address public owner;
    bool public marketResolved;
    string public winningCandidate;
    uint256 public totalPool;

    // candidate string => total ETH mapped
    mapping(string => uint256) public candidateTotals;

    // user address => candidate string => ETH bet mapped
    mapping(address => mapping(string => uint256)) public userBets;

    event BetPlaced(address indexed user, string candidate, uint256 amount);
    event MarketResolved(string winningCandidate);
    event RewardClaimed(address indexed user, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier marketActive() {
        require(!marketResolved, "Market is already resolved");
        _;
    }

    function placeBet(string memory candidateName) external payable marketActive {
        require(msg.value > 0, "Bet amount must be greater than 0");
        
        require(
            isValidCandidate(candidateName),
            "Invalid candidate"
        );

        candidateTotals[candidateName] += msg.value;
        userBets[msg.sender][candidateName] += msg.value;
        totalPool += msg.value;

        emit BetPlaced(msg.sender, candidateName, msg.value);
    }

    function isValidCandidate(string memory candidateName) internal pure returns (bool) {
        bytes32 candidateHash = keccak256(abi.encodePacked(candidateName));
        return (
            candidateHash == keccak256(abi.encodePacked("Warsh")) ||
            candidateHash == keccak256(abi.encodePacked("Shelton")) ||
            candidateHash == keccak256(abi.encodePacked("Laffer")) ||
            candidateHash == keccak256(abi.encodePacked("Pulte"))
        );
    }

    function resolveMarket(string memory _winningCandidate) external onlyOwner marketActive {
        require(isValidCandidate(_winningCandidate), "Invalid candidate");
        marketResolved = true;
        winningCandidate = _winningCandidate;
        emit MarketResolved(_winningCandidate);
    }

    function claim() external {
        require(marketResolved, "Market is not resolved yet");
        
        uint256 userBet = userBets[msg.sender][winningCandidate];
        require(userBet > 0, "No winning bets to claim");

        uint256 winningPool = candidateTotals[winningCandidate];
        require(winningPool > 0, "No bets on winning candidate");

        // Calculate reward: user's share of the total pool proportional to their bet on the winning candidate
        uint256 reward = (userBet * totalPool) / winningPool;

        // Reset user's bet to prevent double claiming
        userBets[msg.sender][winningCandidate] = 0;

        (bool success, ) = payable(msg.sender).call{value: reward}("");
        require(success, "Transfer failed");

        emit RewardClaimed(msg.sender, reward);
    }
}
