pragma solidity ^0.5.10;

import "../dao/DAO.sol";

contract DAPP {

    // the DAO smart contract
    DAO private _dao;

    // the token fixed fee to use dapp
    uint256 private _fee;

    /**
     * @dev fee tokens will be transferred into this.
     * Transfer to a deposit wallet after useFee or add a withdraw tokens function.
     */
    modifier useFee() {
        _dao.use(msg.sender, _fee);
        _;
    }

    /**
     * @dev the amount of tokens will be transferred into this.
     * Transfer to a deposit wallet after useTokens or add a withdraw tokens function.
     * @param amount Number of tokens to use
     */
    modifier useTokens(uint256 amount) {
        _dao.use(msg.sender, amount);
        _;
    }

    /**
     * @dev modifier to allow only members to do some actions
     */
    modifier onlyMember() {
        require(_dao.isMember(msg.sender));
        _;
    }

    /**
     * @dev modifier to allow only approved to do some actions
     */
    modifier onlyApproved() {
        require(_dao.isApproved(msg.sender));
        _;
    }

    constructor (DAO dao, uint256 fee) public {
        require(address(dao) != address(0));

        _dao = dao;
        _fee = fee;
    }

    /**
     * @return the DAO smart contract
     */
    function dao() public view returns (DAO) {
        return _dao;
    }

    /**
     * @return the token fee to use dapp
     */
    function fee() public view returns (uint256) {
        return _fee;
    }
}
