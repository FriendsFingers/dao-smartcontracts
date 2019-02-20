pragma solidity ^0.4.25;

import "../token/ERC721/DAOMember.sol";
import "openzeppelin-solidity/contracts/token/ERC721/ERC721Mintable.sol";
import "openzeppelin-solidity/contracts/token/ERC721/ERC721MetadataMintable.sol";

contract DAOMemberMock is DAOMember, ERC721Mintable, ERC721MetadataMintable {

  constructor(string name, string symbol) public DAOMember(name, symbol) {} // solhint-disable-line no-empty-blocks

  function setTokenURI(uint256 tokenId, string uri) external {
    _setTokenURI(tokenId, uri);
  }

  function removeTokenFrom(address from, uint256 tokenId) external {
    _removeTokenFrom(from, tokenId);
  }

  function exists(uint256 tokenId) external view returns (bool) {
    return _exists(tokenId);
  }
}
