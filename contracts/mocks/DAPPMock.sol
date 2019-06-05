pragma solidity ^0.5.9;

import "../dapp/DAPP.sol";

contract DAPPMock is DAPP {

    constructor (DAO dao, uint256 fee) public DAPP(dao, fee) {} // solhint-disable-line no-empty-blocks

    /**
     * @dev mock function to test fee payment
     */
    function useFeeAction() public useFee {} // solhint-disable-line no-empty-blocks

    /**
     * @dev mock function to test using tokens
     */
    function useTokensAction(uint256 amount) public useTokens(amount) {} // solhint-disable-line no-empty-blocks

    /**
     * @dev mock function to test using tokens and fee
     */
    function useDappAction(uint256 amount) public useTokens(amount) useFee {} // solhint-disable-line no-empty-blocks

    /**
     * @dev mock function to test only member function
     */
    function onlyMemberAction() public onlyMember {} // solhint-disable-line no-empty-blocks

    /**
     * @dev mock function to test only approved function
     */
    function onlyApprovedAction() public onlyApproved {} // solhint-disable-line no-empty-blocks

    function memberSince(address account, uint256 date) public view returns (bool) {
        return dao().isMember(account) && dao().creationDateOf(account) <= date;
    }
}
