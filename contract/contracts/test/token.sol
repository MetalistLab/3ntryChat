// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";


contract token is ERC20Upgradeable {
    //

    function initialize(uint256 initialSupply, string memory name, string memory symbol) public initializer {
        __ERC20_init(name, symbol);
        _mint(msg.sender, initialSupply);
    }
}