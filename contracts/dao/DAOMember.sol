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

    constructor (IERC1363 acceptedToken) public ERC1363Payable(acceptedToken) {} // solhint-disable-line no-empty-blocks

    /**
     * @dev Returns the members number
     * @return uint256
     */
    function membersNumber() external view returns (uint256) {
        return _membersNumber;
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
     * @param memberId Id of the member you are looking for
     * @return array
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
            _generateMember(from);
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
            _generateMember(owner);
        }

        _stake(owner, value);
    }

    /**
     * @dev Generate a new member and the member structure.
     * @param account Address you want to make member
     * @return uint256 The new member id
     */
    function _generateMember(address account) internal returns (uint256) {
        bytes6 mainColor = _getRandomBytes(1);
        bytes6 backgroundColor = _getRandomBytes(2);
        bytes6 borderColor = _getRandomBytes(3);

        return _newMember(
            account,
            mainColor,
            backgroundColor,
            borderColor,
            "",
            false,
            0
        );
    }

    /**
     * @dev Generate a new member and the member structure.
     * @param account Address you want to make member
     * @param mainColor The member's main color
     * @param backgroundColor The member's background color
     * @param borderColor The member's border color
     * @param data An hex string defining some member properties
     * @param kyc If member has a valid kyc
     * @param stackedTokens Number of stacked tokens
     * @return uint256 The new member id
     */
    function _newMember(
        address account,
        bytes6 mainColor,
        bytes6 backgroundColor,
        bytes6 borderColor,
        bytes32 data,
        bool kyc,
        uint256 stackedTokens
    )
        internal
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
     * @param account Address you want to stake tokens
     * @param amount Number of tokens to stake
     */
    function _stake(address account, uint256 amount) internal {
        require(isMember(account));

        MemberStructure storage structure = _structureIndex[_addressIndex[account]];

        structure.stackedTokens = structure.stackedTokens.add(amount);

        emit StakedTokens(account, amount);
    }

    /**
     * @dev Remove tokens from member stack
     * @param account Address you want to unstake tokens
     * @param amount Number of tokens to unstake
     */
    function _unstake(address account, uint256 amount) internal {
        require(isMember(account));

        MemberStructure storage structure = _structureIndex[_addressIndex[account]];

        require(structure.stackedTokens >= amount);

        structure.stackedTokens = structure.stackedTokens.sub(amount);

        emit UnstakedTokens(account, amount);
    }

    /**
     * @dev Generate a random color hex.
     * @return bytes6 It represents an hex color
     */
    function _getRandomBytes(uint8 salt) internal view returns (bytes6) {
        // solhint-disable-next-line not-rely-on-time
        return bytes6(keccak256(abi.encodePacked(msg.sender, block.timestamp, salt)));
    }
}
