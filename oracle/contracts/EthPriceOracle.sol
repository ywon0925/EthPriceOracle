//SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0;

import "./ICallerContract.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
//import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Contract that interact w/ Node server
/// @author Yuseok Michael Won
contract EthPriceOracle is AccessControl {
  bytes32 public constant OWNER_ROLE = keccak256("owners");
  bytes32 public constant ORACLE_ROLE = keccak256("oracles");

  uint private randNonce = 0;
  uint private modulus = 1000;
  mapping(uint256=>bool) pendingRequests;

  event GetLatestEthPriceEvent(address callerAddress, uint id);
  event SetLatestEthPriceEvent(uint256 ethPrice, address callerAddress);
  //event AddOracleEvent(address oralceAddress);

  /// @dev setting up Contract Owner a Default Admin & setting up other Roles
  constructor(address _owner) {
    _setupRole(DEFAULT_ADMIN_ROLE, _owner);
    _setRoleAdmin(OWNER_ROLE, DEFAULT_ADMIN_ROLE);
    _setupRole(OWNER_ROLE, _owner);
    //grantRole(owners, _owner);
  }

  /// @dev caller need OWNER role & _oracle should not already be an Oracle
  function addOracle(address _oracle) public{
    require(hasRole(OWNER_ROLE, msg.sender), "Not an OWNER!");
    require(!hasRole(ORACLE_ROLE, _oracle), "Already Oracle!");
    _grantRole(ORACLE_ROLE, _oracle);
    emit RoleGranted(ORACLE_ROLE, _oracle, msg.sender);
    //emit AddOracleEvent(_oracle);
    //grantRole(OWNER_ROLE, _oracle);
  }

  /// @dev add randomly generated request id to pending list & return the id
  function getLatestEthPrice() public returns (uint256) {
      randNonce++;
      uint id = uint(keccak256(abi.encodePacked(block.timestamp, msg.sender, randNonce))) % modulus;
      pendingRequests[id] = true;
      emit GetLatestEthPriceEvent(msg.sender, id);
      return id;
  }

  /// @dev if request is valid, remove request from pendding list & callback the _ethPrice to caller contract
  function setLatestEthPrice(uint256 _ethPrice, address _callerAddress, uint256 _id) public onlyRole(OWNER_ROLE) {
      require(pendingRequests[_id], "This request is not in my pending list.");
      delete pendingRequests[_id];
      ICallerContract callerContractInstance;
      callerContractInstance = ICallerContract(_callerAddress);
      callerContractInstance.callback(_ethPrice, _id);
      emit SetLatestEthPriceEvent(_ethPrice, _callerAddress);
  }
}