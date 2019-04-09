pragma solidity ^0.5.7;

import "../dapp/DAPP.sol";

contract DAPPMock is DAPP {

    constructor (DAO dao, uint256 fee) public DAPP(dao, fee) {} // solhint-disable-line no-empty-blocks

    /**
     * @dev mock function to test fee payment
     */
    function tokenPayableAction() public tokenPayable {} // solhint-disable-line no-empty-blocks

    /**
     * @dev mock function to test only member function
     */
    function onlyMemberAction() public onlyMember {} // solhint-disable-line no-empty-blocks
}
