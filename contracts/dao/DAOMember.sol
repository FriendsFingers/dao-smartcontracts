pragma solidity ^0.5.5;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "eth-token-recover/contracts/TokenRecover.sol";
import "../access/roles/OperatorRole.sol";

/**
 * @title DAOMember
 * @author Vittorio Minacori (https://github.com/vittominacori)
 * @dev It identifies a DAO Member
 */
contract DAOMember is OperatorRole, TokenRecover {
    using SafeMath for uint256;

    event MemberAdded(
        address indexed account,
        uint256 id
    );

    // structure that defines a member
    struct MemberStructure {
        address member;
        bytes6 mainColor;
        bytes6 backgroundColor;
        bytes6 borderColor;
        bytes32 data;
        bool kyc;
        uint256 stackedTokens;
        uint256 creationDate;
    }

    // a progressive id counting members
    uint256 private _membersNumber;

    // Mapping from address to member ID
    mapping(address => uint256) private _addressIndex;

    // Mapping from member ID to the structures
    mapping(uint256 => MemberStructure) private _structureIndex;

    constructor () public {} // solhint-disable-line no-empty-blocks

    /**
     * @dev Returns the members number
     */
    function membersNumber() external view returns (uint256) {
        return _membersNumber;
    }

    /**
     * @dev Returns if an address is member or not
     */
    function isMember(address account) public view returns (bool) {
        return _addressIndex[account] != 0;
    }

    /**
     * @dev Returns the member structure.
     */
    function getMemberByAddress(address account)
        public
        view
        returns (
            address member,
            bytes6 mainColor,
            bytes6 backgroundColor,
            bytes6 borderColor,
            bytes32 data,
            bool kyc,
            uint256 stackedTokens,
            uint256 creationDate
        )
    {
        require(isMember(account));

        return getMemberById(_addressIndex[account]);
    }

    /**
     * @dev Returns the member structure.
     */
    function getMemberById(uint256 memberId)
        public
        view
        returns (
            address member,
            bytes6 mainColor,
            bytes6 backgroundColor,
            bytes6 borderColor,
            bytes32 data,
            bool kyc,
            uint256 stackedTokens,
            uint256 creationDate
        )
    {
        MemberStructure storage structure = _structureIndex[memberId];

        member = structure.member;

        require(member != address(0));

        mainColor = structure.mainColor;
        backgroundColor = structure.backgroundColor;
        borderColor = structure.borderColor;
        data = structure.data;
        kyc = structure.kyc;
        stackedTokens = structure.stackedTokens;
        creationDate = structure.creationDate;
    }

    /**
     * @dev Generate a new member and the member structure.
     */
    function newMember(
        address account,
        bytes6 mainColor,
        bytes6 backgroundColor,
        bytes6 borderColor,
        bytes32 data,
        bool kyc,
        uint256 stackedTokens
    )
        public
        onlyOperator
        returns (uint256)
    {
        require(account != address(0));
        require(!isMember(account));

        uint256 memberId = _membersNumber.add(1);

        _addressIndex[account] = memberId;
        _structureIndex[memberId] = MemberStructure(
            account,
            mainColor,
            backgroundColor,
            borderColor,
            data,
            kyc,
            stackedTokens,
            block.timestamp // solhint-disable-line not-rely-on-time
        );

        _membersNumber = memberId;

        emit MemberAdded(account, memberId);

        return memberId;
    }

    /**
     * @dev Add tokens to member stack
     */
    function stake(address account, uint256 amount) public onlyOperator {
        require(isMember(account));

        MemberStructure storage structure = _structureIndex[_addressIndex[account]];

        structure.stackedTokens = structure.stackedTokens.add(amount);
    }

    /**
     * @dev Remove tokens from member stack
     */
    function unstake(address account, uint256 amount) public onlyOperator {
        require(isMember(account));

        MemberStructure storage structure = _structureIndex[_addressIndex[account]];

        require(structure.stackedTokens >= amount);

        structure.stackedTokens = structure.stackedTokens.sub(amount);
    }

    /**
     * @dev Remove the `operator` role from address
     * @param account Address you want to remove role
     */
    function removeOperator(address account) public onlyOwner {
        _removeOperator(account);
    }
}
