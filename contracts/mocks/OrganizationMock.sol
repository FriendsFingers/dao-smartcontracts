pragma solidity ^0.5.11;

import "../dao/Organization.sol";

contract OrganizationMock {
    using Organization for Organization.Members;
    using Organization for Organization.Member;

    Organization.Members private _members;

    function membersNumber() public view returns (uint256) {
        return _members.count;
    }

    function totalStakedTokens() public view returns (uint256) {
        return _members.totalStakedTokens;
    }

    function totalUsedTokens() public view returns (uint256) {
        return _members.totalUsedTokens;
    }

    function isMember(address account) public view returns (bool) {
        return _members.isMember(account);
    }

    function creationDateOf(address account) public view returns (uint256) {
        return _members.creationDateOf(account);
    }

    function stakedTokensOf(address account) public view returns (uint256) {
        return _members.stakedTokensOf(account);
    }

    function usedTokensOf(address account) public view returns (uint256) {
        return _members.usedTokensOf(account);
    }

    function isApproved(address account) public view returns (bool) {
        return _members.isApproved(account);
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
            uint256 usedTokens,
            bytes32 data,
            bool approved
        )
    {
        Organization.Member storage structure = _members.getMember(memberId);

        id = structure.id;
        member = structure.account;
        fingerprint = structure.fingerprint;
        creationDate = structure.creationDate;
        stakedTokens = structure.stakedTokens;
        usedTokens = structure.usedTokens;
        data = structure.data;
        approved = structure.approved;
    }

    function stake(address account, uint256 amount) public {
        _members.stake(account, amount);
    }

    function unstake(uint256 amount) public {
        _members.unstake(msg.sender, amount);
    }

    function use(uint256 amount) public {
        _members.use(msg.sender, amount);
    }

    function setApproved(address account, bool approved) public {
        _members.setApproved(account, approved);
    }

    function setData(address account, bytes32 data) public {
        _members.setData(account, data);
    }

    function getFingerprint(address memberAddress, uint256 memberId) public pure returns (bytes9) {
        return bytes9(keccak256(abi.encodePacked(memberAddress, memberId)));
    }
}
