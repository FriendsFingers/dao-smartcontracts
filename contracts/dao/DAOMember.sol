pragma solidity ^0.5.6;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "erc-payable-token/contracts/payment/ERC1363Payable.sol";
import "eth-token-recover/contracts/TokenRecover.sol";
import "../access/roles/OperatorRole.sol";

/**
 * @title DAOMember
 * @author Vittorio Minacori (https://github.com/vittominacori)
 * @dev It identifies a DAO Member
 */
contract DAOMember is ERC1363Payable, OperatorRole, TokenRecover {
    using SafeMath for uint256;

    event MemberAdded(
        address indexed account,
        uint256 id
    );

    event StakedTokens(
        address indexed account,
        uint256 value
    );

    event UnstakedTokens(
        address indexed account,
        uint256 value
    );

    // structure that defines a member
    struct MemberStructure {
        address member;
        bytes9 fingerprint;
        uint256 creationDate;
        uint256 stakedTokens;
        bytes32 data;
        bool kyc;
    }

    // a progressive id counting members
    uint256 private _membersNumber;

    // a number indicating the total number of staked tokens
    uint256 private _totalStakedTokens;

    // Mapping from address to member ID
    mapping(address => uint256) private _addressIndex;

    // Mapping from member ID to the structures
    mapping(uint256 => MemberStructure) private _structureIndex;

    constructor (IERC1363 acceptedToken) public ERC1363Payable(acceptedToken) {} // solhint-disable-line no-empty-blocks

    /**
     * @dev Returns the members number
     * @return uint256
     */
    function membersNumber() external view returns (uint256) {
        return _membersNumber;
    }

    /**
     * @dev Returns the total staked tokens number
     * @return uint256
     */
    function totalStakedTokens() external view returns (uint256) {
        return _totalStakedTokens;
    }

    /**
     * @dev Returns if an address is member or not
     * @param account Address of the member you are looking for
     * @return bool
     */
    function isMember(address account) public view returns (bool) {
        return _addressIndex[account] != 0;
    }

    /**
     * @dev Returns the member structure.
     * @param account Address of the member you are looking for
     * @return array
     */
    function getMemberByAddress(address account)
        public
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
        require(isMember(account));

        return getMemberById(_addressIndex[account]);
    }

    /**
     * @dev Returns the member structure.
     * @param memberId Id of the member you are looking for
     * @return array
     */
    function getMemberById(uint256 memberId)
        public
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
        MemberStructure storage structure = _structureIndex[memberId];

        member = structure.member;

        require(member != address(0));

        fingerprint = structure.fingerprint;
        creationDate = structure.creationDate;
        stakedTokens = structure.stakedTokens;
        data = structure.data;
        kyc = structure.kyc;
    }

    /**
     * @dev Remove tokens from member stack
     * @param amount Number of tokens to unstake
     */
    function unstake(uint256 amount) public {
        _unstake(msg.sender, amount);
    }

    /**
     * @dev Remove the `operator` role from address
     * @param account Address you want to remove role
     */
    function removeOperator(address account) public onlyOwner {
        _removeOperator(account);
    }

    /**
     * @dev Called after validating a `onTransferReceived`
     * @param operator address The address which called `transferAndCall` or `transferFromAndCall` function
     * @param from address The address which are token transferred from
     * @param value uint256 The amount of tokens transferred
     * @param data bytes Additional data with no specified format
     */
    function _transferReceived(
        address operator, // solhint-disable-line no-unused-vars
        address from,
        uint256 value,
        bytes memory data // solhint-disable-line no-unused-vars
    )
        internal
    {
        if (!isMember(from)) {
            _newMember(from);
        }

        _stake(from, value);
    }

    /**
     * @dev Called after validating a `onApprovalReceived`
     * @param owner address The address which called `approveAndCall` function
     * @param value uint256 The amount of tokens to be spent
     * @param data bytes Additional data with no specified format
     */
    function _approvalReceived(
        address owner,
        uint256 value,
        bytes memory data // solhint-disable-line no-unused-vars
    )
        internal
    {
        IERC20(acceptedToken()).transferFrom(owner, address(this), value);

        if (!isMember(owner)) {
            _newMember(owner);
        }

        _stake(owner, value);
    }

    /**
     * @dev Generate a new member and the member structure.
     * @param account Address you want to make member
     * @return uint256 The new member id
     */
    function _newMember(address account) internal returns (uint256) {
        require(account != address(0));
        require(!isMember(account));

        uint256 memberId = _membersNumber.add(1);
        bytes9 fingerprint = _getFingerprint(account, memberId);

        _addressIndex[account] = memberId;
        _structureIndex[memberId] = MemberStructure(
            account,
            fingerprint,
            block.timestamp, // solhint-disable-line not-rely-on-time
            0,
            "",
            false
        );

        _membersNumber = memberId;

        emit MemberAdded(account, memberId);

        return memberId;
    }

    /**
     * @dev Add tokens to member stack
     * @param account Address you want to stake tokens
     * @param amount Number of tokens to stake
     */
    function _stake(address account, uint256 amount) internal {
        require(isMember(account));

        MemberStructure storage member = _structureIndex[_addressIndex[account]];
        member.stakedTokens = member.stakedTokens.add(amount);

        _totalStakedTokens = _totalStakedTokens.add(amount);

        emit StakedTokens(account, amount);
    }

    /**
     * @dev Remove tokens from member stack
     * @param account Address you want to unstake tokens
     * @param amount Number of tokens to unstake
     */
    function _unstake(address account, uint256 amount) internal {
        require(isMember(account));

        MemberStructure storage member = _structureIndex[_addressIndex[account]];
        require(member.stakedTokens >= amount);
        member.stakedTokens = member.stakedTokens.sub(amount);

        _totalStakedTokens = _totalStakedTokens.sub(amount);

        emit UnstakedTokens(account, amount);
    }

    /**
     * @dev Generate a random color hex.
     * @param account Address you want to make member
     * @param memberId The member id
     * @return bytes9 It represents 3 concatenated hex colors
     */
    function _getFingerprint(address account, uint256 memberId) internal view returns (bytes9) {
        // solhint-disable-next-line not-rely-on-time
        return bytes9(keccak256(abi.encodePacked(account, memberId, block.timestamp)));
    }
}
