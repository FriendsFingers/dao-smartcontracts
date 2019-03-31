pragma solidity ^0.5.7;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/access/Roles.sol";

/**
 * @title OperatorRole
 * @author Vittorio Minacori (https://github.com/vittominacori)
 * @dev It identifies the operators role
 */
contract OperatorRole is Ownable {
    using Roles for Roles.Role;

    event OperatorAdded(address indexed account);
    event OperatorRemoved(address indexed account);

    Roles.Role private _operators;

    constructor () internal {
        _addOperator(msg.sender);
    }

    modifier onlyOperator() {
        require(isOperator(msg.sender));
        _;
    }

    /**
     * @dev Check if an address has the `operator` role
     * @param account Address you want to check
     */
    function isOperator(address account) public view returns (bool) {
        return _operators.has(account);
    }

    /**
     * @dev Add the `operator` role from address
     * @param account Address you want to add role
     */
    function addOperator(address account) public onlyOperator {
        _addOperator(account);
    }

    /**
     * @dev Remove the `operator` role from address
     * @param account Address you want to remove role
     */
    function removeOperator(address account) public onlyOwner {
        _removeOperator(account);
    }

    /**
     * @dev Renounce the `operator` role
     */
    function renounceOperator() public {
        _removeOperator(msg.sender);
    }

    function _addOperator(address account) internal {
        _operators.add(account);
        emit OperatorAdded(account);
    }

    function _removeOperator(address account) internal {
        _operators.remove(account);
        emit OperatorRemoved(account);
    }
}
