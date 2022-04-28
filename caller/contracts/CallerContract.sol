//SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0;

import "./EthPriceOracleInterface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
/// @title Contract to interact w/ Oracle Contract
/// @author Yuseok Michael Won
contract CallerContract {
    EthPriceOracleInterface private oracleInstance;
    address private oracleAddress;
    mapping(uint256 => bool) myRequests;

    event newOracleAddressEvent(address oracleAddress);
    event ReceivedNewRequestIdEvent(uint256 id);

    function setOracleInstanceAddress(address _oracleInstanceAddress) public {
        oracleAddress = _oracleInstanceAddress;
        oracleInstance = EthPriceOracleInterface(oracleAddress);
        emit newOracleAddressEvent(oracleAddress);
    }

    function updateEthPrice() public{
        uint256 id = oracleInstance.getLatestEthPrice();
        myRequests[id] = true;
        emit ReceivedNewRequestIdEvent(id);
    }
}