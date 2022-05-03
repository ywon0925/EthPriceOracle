//SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0;

interface ICallerContract {
  function callback(uint256 _ethPrice, uint256 id) external;
}
