//SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0;

import "./IEthPriceOracle.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
/// @title Contract to interact w/ Oracle Contract
/// @author Yuseok Michael Won
contract CallerContract {
    uint256 private ethPrice;
    IEthPriceOracle private oracleInstance;
    address private oracleAddress;
    mapping(uint256 => bool) myRequests;

    event newOracleAddressEvent(address oracleAddress);
    event ReceivedNewRequestIdEvent(uint256 id);
    event PriceUpdatedEvent(uint256 ethPrice, uint256 id);

    /// @dev setting Oracle Contract Address & emit Event back to Front-end
    function setOracleInstanceAddress(address _oracleInstanceAddress) public {
        oracleAddress = _oracleInstanceAddress;
        oracleInstance = IEthPriceOracle(oracleAddress);
        emit newOracleAddressEvent(oracleAddress);
    }
    
    /// @dev adding new request to list
    function updateEthPrice() public {
        uint256 id = oracleInstance.getLatestEthPrice();
        myRequests[id] = true;
        emit ReceivedNewRequestIdEvent(id);
    }

    /// @dev handle request & set ETH price & emit Event to Front-end
    function callback(uint256 _ethPrice, uint256 _id) public onlyOracle {
        require(myRequests[_id], "This request is not in my pending list.");
        ethPrice = _ethPrice;
        delete myRequests[_id];
        emit PriceUpdatedEvent(_ethPrice, _id);
    }

    /// @dev modifier to check if msg.sender(caller) is Oracle
    modifier onlyOracle() {
        require(msg.sender == oracleAddress,"You are not authorized to call this function.");
        _;
    }
}