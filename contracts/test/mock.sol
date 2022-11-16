pragma solidity ^0.8.5;

// SPDX-License-Identifier: MIT OR Apache-2.0
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract Mock is Initializable {

    mapping(address => uint256) balances;

    function initialize() public initializer {
    }
    
    function balancesOf(address account) external view returns (uint256) {
        return balances[account];
    }
}