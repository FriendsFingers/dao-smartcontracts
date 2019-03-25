pragma solidity ^0.5.6;

import "../dao/DAOMember.sol";

contract DAOMemberMock is DAOMember {

    constructor (IERC1363 acceptedToken) public DAOMember(acceptedToken) {} // solhint-disable-line no-empty-blocks

    function newMember(address account) public onlyOperator returns (uint256) {
        return _newMember(account);
    }

    function getFingerprintMock(address account, uint256 memberId, uint256 timestamp) public pure returns (bytes9) {
        return bytes9(keccak256(abi.encodePacked(account, memberId, timestamp)));
    }

    function stake(address account, uint256 amount) public onlyOperator {
        _stake(account, amount);
    }
}
