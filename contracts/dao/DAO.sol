pragma solidity ^0.5.8;

import "erc-payable-token/contracts/payment/ERC1363Payable.sol";
import "../access/roles/DAORoles.sol";
import "./Organization.sol";

/**
 * @title DAO
 * @author Vittorio Minacori (https://github.com/vittominacori)
 * @dev It identifies the DAO and Organization logic
 */
contract DAO is ERC1363Payable, DAORoles {
    using SafeMath for uint256;

    using Organization for Organization.Members;
    using Organization for Organization.Member;

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

    event TokensUsed(
        address indexed account,
        address indexed dapp,
        uint256 value
    );

    Organization.Members private _members;

    constructor (IERC1363 acceptedToken) public ERC1363Payable(acceptedToken) {} // solhint-disable-line no-empty-blocks

    /**
     * @dev fallback. This function will create a new member
     */
    function () external payable { // solhint-disable-line no-complex-fallback
        require(msg.value == 0);

        _newMember(msg.sender);
    }

    /**
     * @dev Generate a new member and the member structure
     * @param account Address you want to make member
     * @return uint256 The new member id
     */
    function newMember(address account) external onlyOperator {
        _newMember(account);
    }

    /**
     * @dev Set the approved status for a member
     * @param account Address you want to update
     * @param approved Bool the new status for approved
     */
    function setApproved(address account, bool approved) external onlyOperator {
        _members.setApproved(account, approved);
    }

    /**
     * @dev Set data for a member
     * @param account Address you want to update
     * @param data bytes32 updated data
     */
    function setData(address account, bytes32 data) external onlyOperator {
        _members.setData(account, data);
    }

    /**
     * @dev Use tokens from a specific account
     * @param account Address to use the tokens from
     * @param amount Number of tokens to use
     */
    function use(address account, uint256 amount) external onlyDapp {
        _members.unstake(account, amount);

        IERC20(acceptedToken()).transfer(msg.sender, amount);

        emit TokensUsed(account, msg.sender, amount);
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
     * @dev Get creation date of a member
     * @param account Address you want to check
     * @return uint256 Member creation date, zero otherwise
     */
    function creationDateOf(address account) public view returns (uint256) {
        return _members.creationDateOf(account);
    }

    /**
     * @dev Check how many tokens staked for given address
     * @param account Address you want to check
     * @return uint256 Member staked tokens
     */
    function stakedTokensOf(address account) public view returns (uint256) {
        return _members.stakedTokensOf(account);
    }

    /**
     * @dev Check if an address has been approved
     * @param account Address you want to check
     * @return bool
     */
    function isApproved(address account) public view returns (bool) {
        return _members.isApproved(account);
    }

    /**
     * @dev Returns the member structure
     * @param memberAddress Address of the member you are looking for
     * @return array
     */
    function getMemberByAddress(address memberAddress)
        public
        view
        returns (
            uint256 id,
            address account,
            bytes9 fingerprint,
            uint256 creationDate,
            uint256 stakedTokens,
            bytes32 data,
            bool approved
        )
    {
        return getMemberById(_members.addressMap[memberAddress]);
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
            uint256 id,
            address account,
            bytes9 fingerprint,
            uint256 creationDate,
            uint256 stakedTokens,
            bytes32 data,
            bool approved
        )
    {
        Organization.Member storage structure = _members.getMember(memberId);

        id = structure.id;
        account = structure.account;
        fingerprint = structure.fingerprint;
        creationDate = structure.creationDate;
        stakedTokens = structure.stakedTokens;
        data = structure.data;
        approved = structure.approved;
    }

    /**
     * @dev Allow to recover tokens from contract
     * @param tokenAddress address The token contract address
     * @param tokenAmount uint256 Number of tokens to be sent
     */
    function recoverERC20(address tokenAddress, uint256 tokenAmount) public onlyOwner {
        if (tokenAddress == address(acceptedToken())) {
            uint256 currentBalance = IERC20(acceptedToken()).balanceOf(address(this));
            require(currentBalance.sub(_members.totalStakedTokens) >= tokenAmount);
        }

        IERC20(tokenAddress).transfer(owner(), tokenAmount);
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
        uint256 memberId = _members.addMember(account);

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
