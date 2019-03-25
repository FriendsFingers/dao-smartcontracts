pragma solidity ^0.5.6;

import "../dao/DAOMember.sol";

contract DAOMemberMock is DAOMember {

    constructor (IERC1363 acceptedToken) public DAOMember(acceptedToken) {} // solhint-disable-line no-empty-blocks

    function newMember(address account) public onlyOperator returns (uint256) {
        return _newMember(account);
    }

    function getFingerprint(address account, uint256 memberId) public pure returns (bytes9) {
        return _getFingerprint(account, memberId);
    }

    function stake(address account, uint256 amount) public onlyOperator {
        _stake(account, amount);
    }
}
