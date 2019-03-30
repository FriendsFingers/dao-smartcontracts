pragma solidity ^0.5.7;

import "erc-payable-token/contracts/payment/ERC1363Payable.sol";
import "eth-token-recover/contracts/TokenRecover.sol";
import "../access/roles/OperatorRole.sol";
import "./DAO.sol";

/**
 * @title ProofOfFriends
 * @author Vittorio Minacori (https://github.com/vittominacori)
 * @dev It identifies a DAO Member
 */
contract ProofOfFriends is ERC1363Payable, OperatorRole, TokenRecover {
    using SafeMath for uint256;
    using DAO for DAO.Members;

    event MemberAdded(
        address indexed account,
        uint256 id
    );

    event TokensStaked(
        address indexed account,
        uint256 value
    );

    event TokensUnstaked(
        address indexed account,
        uint256 value
    );

    DAO.Members private _members;

    constructor (IERC1363 acceptedToken) public ERC1363Payable(acceptedToken) {} // solhint-disable-line no-empty-blocks

    /**
     * @dev Remove the `operator` role from address
     * @param account Address you want to remove role
     */
    function removeOperator(address account) public onlyOwner {
        _removeOperator(account);
    }

    /**
     * @dev Returns the members number
     * @return uint256
     */
    function membersNumber() public view returns (uint256) {
        return _members.count;
    }

    /**
     * @dev Returns the total staked tokens number
     * @return uint256
     */
    function totalStakedTokens() public view returns (uint256) {
        return _members.totalStakedTokens;
    }

    /**
     * @dev Returns if an address is member or not
     * @param account Address of the member you are looking for
     * @return bool
     */
    function isMember(address account) public view returns (bool) {
        return _members.isMember(account);
    }

    /**
     * @dev Returns the member structure
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

        return getMemberById(_members.addressMap[account]);
    }

    /**
     * @dev Returns the member structure
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
        return _members.get(memberId);
    }

    /**
     * @dev Remove tokens from member stack
     * @param amount Number of tokens to unstake
     */
    function unstake(uint256 amount) public {
        _members.unstake(msg.sender, amount);

        IERC20(acceptedToken()).transfer(msg.sender, amount);

        emit TokensUnstaked(msg.sender, amount);
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

        _stake(owner, value);
    }

    /**
     * @dev Generate a new member and the member structure
     * @param account Address you want to make member
     * @return uint256 The new member id
     */
    function _newMember(address account) internal {
        uint256 memberId = _members.add(account);

        emit MemberAdded(account, memberId);
    }

    /**
     * @dev Add tokens to member stack
     * @param account Address you want to stake tokens
     * @param amount Number of tokens to stake
     */
    function _stake(address account, uint256 amount) internal {
        if (!isMember(account)) {
            _newMember(account);
        }

        _members.stake(account, amount);

        emit TokensStaked(account, amount);
    }
}