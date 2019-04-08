pragma solidity ^0.5.7;

import "../dao/Organization.sol";

contract OrganizationMock {
    using Organization for Organization.Members;

    Organization.Members private _members;

    function membersNumber() public view returns (uint256) {
        return _members.count;
    }

    function totalStakedTokens() public view returns (uint256) {
        return _members.totalStakedTokens;
    }

    function isMember(address account) public view returns (bool) {
        return _members.isMember(account);
    }

    function addMember(address account) public {
        _members.addMember(account);
    }

    function getMember(uint256 memberId)
        public
        view
        returns (
            uint256 id,
            address member,
            bytes9 fingerprint,
            uint256 creationDate,
            uint256 stakedTokens,
            bytes32 data,
            bool kyc
        )
    {
        return _members.getMember(memberId);
    }

    function stake(address account, uint256 amount) public {
        _members.stake(account, amount);
    }

    function unstake(uint256 amount) public {
        _members.unstake(msg.sender, amount);
    }

    function getFingerprint(address account, uint256 memberId) public pure returns (bytes9) {
        return bytes9(keccak256(abi.encodePacked(account, memberId)));
    }
}