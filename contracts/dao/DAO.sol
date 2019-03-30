pragma solidity ^0.5.7;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

/**
 * @title DAO
 * @author Vittorio Minacori (https://github.com/vittominacori)
 * @dev Library for managing members
 */
library DAO {
    using SafeMath for uint256;

    // structure defining a member
    struct MemberStructure {
        address member;
        bytes9 fingerprint;
        uint256 creationDate;
        uint256 stakedTokens;
        bytes32 data;
        bool kyc;
    }

    // structure defining members status
    struct Members {
        uint256 count;
        uint256 totalStakedTokens;
        mapping(address => uint256) addressMap;
        mapping(uint256 => MemberStructure) list;
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
     * @dev Returns the member structure
     * @param members Current members struct
     * @param memberId Id of the member you are looking for
     * @return array
     */
    function get(Members storage members, uint256 memberId)
        internal
        view
        returns (
            address member,
            bytes9 fingerprint,
            uint256 creationDate,
            uint256 stakedTokens,
            bytes32 data,
            bool kyc
        )
    {
        MemberStructure storage structure = members.list[memberId];

        member = structure.member;

        require(member != address(0));

        fingerprint = structure.fingerprint;
        creationDate = structure.creationDate;
        stakedTokens = structure.stakedTokens;
        data = structure.data;
        kyc = structure.kyc;
    }

    /**
     * @dev Generate a new member and the member structure
     * @param members Current members struct
     * @param account Address you want to make member
     * @return uint256 The new member id
     */
    function add(Members storage members, address account) internal returns (uint256) {
        require(account != address(0));
        require(!isMember(members, account));

        uint256 memberId = members.count.add(1);
        bytes9 fingerprint = getFingerprint(account, memberId);

        members.addressMap[account] = memberId;
        members.list[memberId] = MemberStructure(
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

        MemberStructure storage member = members.list[members.addressMap[account]];
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

        MemberStructure storage member = members.list[members.addressMap[account]];
        require(member.stakedTokens >= amount);
        member.stakedTokens = member.stakedTokens.sub(amount);

        members.totalStakedTokens = members.totalStakedTokens.sub(amount);
    }

    /**
     * @dev Generate a member fingerprint
     * @param account Address you want to make member
     * @param memberId The member id
     * @return bytes9 It represents member fingerprint
     */
    function getFingerprint(address account, uint256 memberId) internal pure returns (bytes9) {
        return bytes9(keccak256(abi.encodePacked(account, memberId)));
    }
}
