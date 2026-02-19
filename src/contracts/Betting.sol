// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Betting {
    // Mapping to store the total pool for each candidate
    mapping(string => uint256) public pools;

    // Event emitted when a new bet is placed
    event BetPlaced(address indexed user, string candidate, uint256 amount);

    // Function to place a bet
    function placeBet(string memory candidate) external payable {
        require(msg.value > 0, "Bet amount must be greater than 0");
        
        // Update the pool for the candidate
        pools[candidate] += msg.value;

        // Emit the event
        emit BetPlaced(msg.sender, candidate, msg.value);
    }

    // Function to get pool amount for a candidate
    function getPool(string memory candidate) external view returns (uint256) {
        return pools[candidate];
    }
}
