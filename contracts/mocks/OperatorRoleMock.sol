pragma solidity ^0.5.7;

import "../access/roles/OperatorRole.sol";

contract OperatorRoleMock is OperatorRole {

    function onlyOperatorMock() public view onlyOperator {} // solhint-disable-line no-empty-blocks
}
