pragma solidity ^0.4.25;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721Full.sol";
import "eth-token-recover/contracts/TokenRecover.sol";
import "../../access/roles/OperatorRole.sol";

/**
 * @title ShakaCard
 * @author Vittorio Minacori (https://github.com/vittominacori)
 * @dev It is an ERC721Full with operator role and a struct that identify the card
 */
contract ShakaCard is ERC721Full, OperatorRole, TokenRecover {

  // structure that defines a card
  struct TokenStructure {
    bytes6 mainColor;
    bytes6 backgroundColor;
    bytes6 borderColor;
    bytes32 data;
    uint256 stackedTokens;
    uint256 creationDate;
  }

  // a progressive id
  uint256 private _progressiveId;

  // Mapping from address to token ID
  mapping(address => uint256) private _addressIndex;

  // Mapping from token ID to the structures
  mapping(uint256 => TokenStructure) private _structureIndex;

  constructor(string name, string symbol) public ERC721Full(name, symbol) {} // solhint-disable-line no-empty-blocks

  /**
   * @dev Generate a new card and the card structure.
   */
  function newCard(
    address member,
    bytes6 mainColor,
    bytes6 backgroundColor,
    bytes6 borderColor,
    bytes32 data,
    uint256 stackedTokens
  )
    external
    onlyOperator
    returns (uint256)
  {
    require(balanceOf(member) == 0);

    uint256 tokenId = _progressiveId.add(1);

    _mint(member, tokenId);

    _addressIndex[member] = tokenId;
    _structureIndex[tokenId] = TokenStructure(
      mainColor,
      backgroundColor,
      borderColor,
      data,
      stackedTokens,
      block.timestamp // solhint-disable-line not-rely-on-time
    );

    _progressiveId = tokenId;

    return tokenId;
  }

  /**
   * @dev Only operator or token owner can burn
   */
  function burn(uint256 tokenId) external {
    address tokenOwner = isOperator(msg.sender) ? ownerOf(tokenId) : msg.sender;
    super._burn(tokenOwner, tokenId);
    delete _structureIndex[tokenId];
    _addressIndex[tokenOwner] = 0;
  }

  function progressiveId() external view returns (uint256) {
    return _progressiveId;
  }

  /**
   * @dev Returns the card structure.
   */
  function getCardByAddress(address member)
    public
    view
    returns (
      address,
      bytes6,
      bytes6,
      bytes6,
      bytes32,
      uint256,
      uint256
    )
  {
    uint256 tokenId = _addressIndex[member];

    return getCardById(tokenId);
  }

  /**
   * @dev Returns the card structure.
   */
  function getCardById(uint256 tokenId)
    public
    view
    returns (
      address member,
      bytes6 mainColor,
      bytes6 backgroundColor,
      bytes6 borderColor,
      bytes32 data,
      uint256 stackedTokens,
      uint256 creationDate
    )
  {
    require(_exists(tokenId));

    TokenStructure storage card = _structureIndex[tokenId];

    member = ownerOf(tokenId);
    mainColor = card.mainColor;
    backgroundColor = card.backgroundColor;
    borderColor = card.borderColor;
    data = card.data;
    stackedTokens = card.stackedTokens;
    creationDate = card.creationDate;
  }

  /**
   * @dev Remove the `operator` role from address
   * @param account Address you want to remove role
   */
  function removeOperator(address account) public onlyOwner {
    _removeOperator(account);
  }
}
