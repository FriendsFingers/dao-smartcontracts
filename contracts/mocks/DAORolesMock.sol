pragma solidity ^0.5.9;

import "../access/roles/DAORoles.sol";

contract DAORolesMock is DAORoles {

    function onlyOperatorMock() public view onlyOperator {} // solhint-disable-line no-empty-blocks

    function onlyDappMock() public view onlyDapp {} // solhint-disable-line no-empty-blocks
}
