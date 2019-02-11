pragma solidity ^0.4.25;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721Full.sol";
import "openzeppelin-solidity/contracts/access/roles/MinterRole.sol";
import "eth-token-recover/contracts/TokenRecover.sol";

/**
 * @title ShakaCard
 * @author Vittorio Minacori (https://github.com/vittominacori)
 * @dev It is an ERC721Full with minter role and a struct that identify the card
 */
contract ShakaCard is ERC721Full, MinterRole, TokenRecover {

  // structure that defines a card
  struct TokenStructure {
    bytes6 mainColor;
    bytes6 backgroundColor;
    bytes6 borderColor;
    uint256 stackedTokens;
    uint256 creationDate;
  }

  // a progressive id
  uint256 private _progressiveId;

  // Mapping from token ID to the structures
  mapping(uint256 => TokenStructure) private _structureIndex;

  constructor(string name, string symbol) public ERC721Full(name, symbol) {} // solhint-disable-line no-empty-blocks

  /**
   * @dev Generate a new card and the card structure.
   */
  function newCard(
    address beneficiary,
    bytes6 mainColor,
    bytes6 backgroundColor,
    bytes6 borderColor,
    uint256 stackedTokens
  )
    external
    onlyMinter
    returns (uint256)
  {
    require(balanceOf(beneficiary) == 0);

    uint256 tokenId = _progressiveId.add(1);

    _mint(beneficiary, tokenId);

    _structureIndex[tokenId] = TokenStructure(
      mainColor,
      backgroundColor,
      borderColor,
      stackedTokens,
      block.timestamp // solhint-disable-line not-rely-on-time
    );

    _progressiveId = tokenId;

    return tokenId;
  }

  /**
   * @dev Only minter or token owner can burn
   */
  function burn(uint256 tokenId) external {
    address tokenOwner = isMinter(msg.sender) ? ownerOf(tokenId) : msg.sender;
    super._burn(tokenOwner, tokenId);
    delete _structureIndex[tokenId];
  }

  /**
   * @dev Returns the card structure.
   */
  function getCard(uint256 tokenId)
    external
    view
    returns (
      address beneficiary,
      bytes6 mainColor,
      bytes6 backgroundColor,
      bytes6 borderColor,
      uint256 stackedTokens,
      uint256 creationDate
    )
  {
    require(_exists(tokenId));

    TokenStructure storage card = _structureIndex[tokenId];

    beneficiary = ownerOf(tokenId);
    mainColor = card.mainColor;
    backgroundColor = card.backgroundColor;
    borderColor = card.borderColor;
    stackedTokens = card.stackedTokens;
    creationDate = card.creationDate;
  }

  function progressiveId() external view returns (uint256) {
    return _progressiveId;
  }
}