//SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0;

interface IEthPriceOracle {
    function getLatestEthPrice() external returns (uint256);
}
