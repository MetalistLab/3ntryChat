// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "../chat.sol";

contract chatV2 is chat {
    
    // cancel account
    function cancel() external {
        delete userKey[msg.sender];
    }
}