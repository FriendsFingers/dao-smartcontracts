pragma solidity ^0.5.8;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

/**
 * @title Organization
 * @author Vittorio Minacori (https://github.com/vittominacori)
 * @dev Library for managing organization
 */
library Organization {
    using SafeMath for uint256;

    // structure defining a member
    struct Member {
        uint256 id;
        address account;
        bytes9 fingerprint;
        uint256 creationDate;
        uint256 stakedTokens;
        bytes32 data;
        bool verified;
    }

    // structure defining members status
    struct Members {
        uint256 count;
        uint256 totalStakedTokens;
        mapping(address => uint256) addressMap;
        mapping(uint256 => Member) list;
    }

    /**
     * @dev Returns if an address is member or not
     * @param members Current members struct
     * @param account Address of the member you are looking for
     * @return bool
     */
    function isMember(Members storage members, address account) internal view returns (bool) {
        return members.addressMap[account] != 0;
    }

    /**
     * @dev Get creation date of a member
     * @param members Current members struct
     * @param account Address you want to check
     * @return uint256 Member creation date, zero otherwise
     */
    function creationDateOf(Members storage members, address account) internal view returns (uint256) {
        Member storage member = members.list[members.addressMap[account]];

        return member.creationDate;
    }

    /**
     * @dev Check how many tokens staked for given address
     * @param members Current members struct
     * @param account Address you want to check
     * @return uint256 Member staked tokens
     */
    function stakedTokensOf(Members storage members, address account) internal view returns (uint256) {
        Member storage member = members.list[members.addressMap[account]];

        return member.stakedTokens;
    }

    /**
     * @dev Check if an address has been verified
     * @param members Current members struct
     * @param account Address you want to check
     * @return bool
     */
    function isVerified(Members storage members, address account) internal view returns (bool) {
        Member storage member = members.list[members.addressMap[account]];

        return member.verified;
    }

    /**
     * @dev Returns the member structure
     * @param members Current members struct
     * @param memberId Id of the member you are looking for
     * @return Member
     */
    function getMember(Members storage members, uint256 memberId) internal view returns (Member storage) {
        Member storage structure = members.list[memberId];

        require(structure.account != address(0));

        return structure;
    }

    /**
     * @dev Generate a new member and the member structure
     * @param members Current members struct
     * @param account Address you want to make member
     * @return uint256 The new member id
     */
    function addMember(Members storage members, address account) internal returns (uint256) {
        require(account != address(0));
        require(!isMember(members, account));

        uint256 memberId = members.count.add(1);
        bytes9 fingerprint = getFingerprint(account, memberId);

        members.addressMap[account] = memberId;
        members.list[memberId] = Member(
            memberId,
            account,
            fingerprint,
            block.timestamp, // solhint-disable-line not-rely-on-time
            0,
            "",
            false
        );

        members.count = memberId;

        return memberId;
    }

    /**
     * @dev Add tokens to member stack
     * @param members Current members struct
     * @param account Address you want to stake tokens
     * @param amount Number of tokens to stake
     */
    function stake(Members storage members, address account, uint256 amount) internal {
        require(isMember(members, account));

        Member storage member = members.list[members.addressMap[account]];

        member.stakedTokens = member.stakedTokens.add(amount);
        members.totalStakedTokens = members.totalStakedTokens.add(amount);
    }

    /**
     * @dev Remove tokens from member stack
     * @param members Current members struct
     * @param account Address you want to unstake tokens
     * @param amount Number of tokens to unstake
     */
    function unstake(Members storage members, address account, uint256 amount) internal {
        require(isMember(members, account));

        Member storage member = members.list[members.addressMap[account]];

        require(member.stakedTokens >= amount);

        member.stakedTokens = member.stakedTokens.sub(amount);
        members.totalStakedTokens = members.totalStakedTokens.sub(amount);
    }

    /**
     * @dev Set the verified status for a member
     * @param members Current members struct
     * @param account Address you want to update
     * @param verified Bool the new status for verified
     */
    function setVerified(Members storage members, address account, bool verified) internal {
        require(isMember(members, account));

        Member storage member = members.list[members.addressMap[account]];

        member.verified = verified;
    }

    /**
     * @dev Set data for a member
     * @param members Current members struct
     * @param account Address you want to update
     * @param data bytes32 updated data
     */
    function setData(Members storage members, address account, bytes32 data) internal {
        require(isMember(members, account));

        Member storage member = members.list[members.addressMap[account]];

        member.data = data;
    }

    /**
     * @dev Generate a member fingerprint
     * @param account Address you want to make member
     * @param memberId The member id
     * @return bytes9 It represents member fingerprint
     */
    function getFingerprint(address account, uint256 memberId) private pure returns (bytes9) {
        return bytes9(keccak256(abi.encodePacked(account, memberId)));
    }
}
