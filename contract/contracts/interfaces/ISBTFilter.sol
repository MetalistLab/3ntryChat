// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;


interface msgFilter {

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);
}
