pragma solidity ^0.5.7;

import "../dao/ProofOfFriends.sol";

contract ProofOfFriendsMock is ProofOfFriends {

    constructor (IERC1363 acceptedToken) public ProofOfFriends(acceptedToken) {} // solhint-disable-line no-empty-blocks

    function stake(address account, uint256 amount) public {
        _stake(account, amount);
    }

    function getFingerprint(address account, uint256 memberId) public pure returns (bytes9) {
        return bytes9(keccak256(abi.encodePacked(account, memberId)));
    }
}
