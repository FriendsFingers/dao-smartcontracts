pragma solidity ^0.5.6;

import "../dao/DAOMember.sol";

contract DAOMemberMock is DAOMember {

    constructor (IERC1363 acceptedToken) public DAOMember(acceptedToken) {} // solhint-disable-line no-empty-blocks

    function newMember(
        address account,
        bytes6 mainColor,
        bytes6 backgroundColor,
        bytes6 borderColor,
        bytes32 data,
        bool kyc,
        uint256 stakedTokens
    )
        public
        onlyOperator
        returns (uint256)
    {
        return _newMember(
            account,
            mainColor,
            backgroundColor,
            borderColor,
            data,
            kyc,
            stakedTokens
        );
    }

    function stake(address account, uint256 amount) public onlyOperator {
        _stake(account, amount);
    }
}
