pragma solidity ^0.5.7;

import "../dao/DAO.sol";

contract DAPP {

    // the DAO smart contract
    DAO private _dao;

    // the token fee to use dapp
    uint256 private _fee;

    // the address where to deposit fee tokens
    address private _depositWallet;

    modifier useFee() {
        _dao.use(msg.sender, _fee);
        _;
    }

    modifier onlyMember() {
        require(_dao.isMember(msg.sender));
        _;
    }

    constructor (DAO dao, uint256 fee, address depositWallet) public {
        require(address(dao) != address(0));
        require(address(depositWallet) != address(0));
        require(fee > 0);

        _dao = dao;
        _depositWallet = depositWallet;
        _fee = fee;
    }

    /**
     * @return the DAO smart contract
     */
    function dao() public view returns (DAO) {
        return _dao;
    }

    /**
     * @return the address where to deposit fee tokens
     */
    function depositWallet() public view returns (address) {
        return _depositWallet;
    }

    /**
     * @return the token fee to use dapp
     */
    function fee() public view returns (uint256) {
        return _fee;
    }
}
