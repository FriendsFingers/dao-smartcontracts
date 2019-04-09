pragma solidity ^0.5.7;

import "../dao/DAO.sol";

contract DAPP {

    // the DAO smart contract
    DAO private _dao;

    // the token fee to use dapp
    uint256 private _fee;

    /**
     * @dev fee tokens will be transferred into this.
     * Transfer to a deposit wallet after tokenPayable or add a withdraw tokens function.
     */
    modifier tokenPayable() {
        _dao.use(msg.sender, _fee);
        _;
    }

    /**
     * @dev modifier to allow only members to do some actions
     */
    modifier onlyMember() {
        require(_dao.isMember(msg.sender));
        _;
    }

    constructor (DAO dao, uint256 fee) public {
        require(address(dao) != address(0));
        require(fee > 0);

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
