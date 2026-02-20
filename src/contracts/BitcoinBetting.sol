// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// OpenZeppelin ReentrancyGuard for security against reentrancy attacks
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract BitcoinBetting is ReentrancyGuard {
    // Immutable owner address (can only be set once during deployment) saves gas and increases security
    address public immutable owner;

    bool public marketResolved;
    string public winningOutcome; // Expected to be either "Yes" or "No"
    uint256 public totalPool;
    uint256 public endTime;

    // Mapping of outcome ("Yes" or "No") to the total ETH bet on that outcome
    mapping(string => uint256) public outcomeTotals;

    // Mapping of user address to mapping of outcome string to the ETH amount they bet
    mapping(address => mapping(string => uint256)) public userBets;

    // Events for frontend tracking
    event BetPlaced(address indexed user, string outcome, uint256 amount);
    event MarketResolved(string winningOutcome);
    event RewardClaimed(address indexed user, uint256 amount);

    /**
     * @dev Constructor sets the deployer as the immutable owner.
     */
    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Modifier to restrict access to only the contract owner.
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /**
     * @dev Modifier to ensure actions can only happen before the market is resolved.
     */
    modifier marketActive() {
        require(!marketResolved, "Market is already resolved");
        _;
    }

    /**
     * @dev Sets the duration for the betting period.
     * @param durationMinutes The number of minutes the betting will be open.
     */
    function startBetting(uint256 durationMinutes) external onlyOwner {
        require(durationMinutes > 0, "Duration must be > 0");
        require(endTime == 0 || block.timestamp > endTime, "Betting already active");
        endTime = block.timestamp + (durationMinutes * 1 minutes);
    }

    /**
     * @dev Allows users to place a bet on an outcome ("Yes" or "No").
     * @param prediction The string representation of the outcome ("Yes" or "No").
     */
    function placeBet(string memory prediction) external payable marketActive {
        require(msg.value > 0, "Bet amount must be greater than 0");
        require(endTime > 0, "Betting has not started yet");
        require(block.timestamp < endTime, "Betting is closed");
        require(isValidOutcome(prediction), "Invalid prediction. Must be 'Yes' or 'No'");

        // Update state
        outcomeTotals[prediction] += msg.value;
        userBets[msg.sender][prediction] += msg.value;
        totalPool += msg.value;

        emit BetPlaced(msg.sender, prediction, msg.value);
    }

    /**
     * @dev Validates if the given string is strictly "Yes" or "No" using keccak256 hashes.
     * @param outcome The string to validate.
     * @return bool True if the string is "Yes" or "No".
     */
    function isValidOutcome(string memory outcome) internal pure returns (bool) {
        bytes32 outcomeHash = keccak256(abi.encodePacked(outcome));
        return (
            outcomeHash == keccak256(abi.encodePacked("Yes")) ||
            outcomeHash == keccak256(abi.encodePacked("No"))
        );
    }

    /**
     * @dev Resolves the market with the winning outcome. Only callable by the owner.
     * @param _winner The final winning outcome ("Yes" or "No").
     */
    function resolveMarket(string memory _winner) external onlyOwner marketActive {
        // Ensuring market can only be resolved after betting time is closed (Optional but standard)
        require(block.timestamp >= endTime, "Betting is still open"); 
        require(isValidOutcome(_winner), "Invalid outcome. Must be 'Yes' or 'No'");
        
        marketResolved = true;
        winningOutcome = _winner;
        
        emit MarketResolved(_winner);
    }

    /**
     * @dev Allows winners to claim their proportion of the total pool.
     * Uses ReentrancyGuard (`nonReentrant`) and state updates before value transfer.
     */
    function claim() external nonReentrant {
        require(marketResolved, "Market is not resolved yet");
        
        uint256 userBet = userBets[msg.sender][winningOutcome];
        require(userBet > 0, "No winning bets to claim");

        uint256 winningPool = outcomeTotals[winningOutcome];
        require(winningPool > 0, "No bets on winning outcome");

        // Calculate reward: proportion of user's bet compared to the total pool mapped to the winning side
        uint256 reward = (userBet * totalPool) / winningPool;

        // Perform state updates BEFORE external interactions to prevent reentrancy attacks
        userBets[msg.sender][winningOutcome] = 0;

        // Secure value transfer using call instead of transfer
        (bool success, ) = payable(msg.sender).call{value: reward}("");
        require(success, "ETH Transfer failed");

        emit RewardClaimed(msg.sender, reward);
    }
}
