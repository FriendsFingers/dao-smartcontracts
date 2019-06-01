pragma solidity ^0.5.9;

import "../dao/DAO.sol";

contract DAOMock is DAO {

    constructor (IERC1363 acceptedToken) public DAO(acceptedToken) {} // solhint-disable-line no-empty-blocks

    function stake(address account, uint256 amount) public {
        _stake(account, amount);
    }

    function getFingerprint(address memberAddress, uint256 memberId) public pure returns (bytes9) {
        return bytes9(keccak256(abi.encodePacked(memberAddress, memberId)));
    }
}
