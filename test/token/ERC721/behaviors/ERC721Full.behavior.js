const shouldFail = require('openzeppelin-solidity/test/helpers/shouldFail');
const { shouldBehaveLikeERC721 } = require('openzeppelin-solidity/test/token/ERC721/ERC721.behavior');
const { shouldSupportInterfaces } = require('openzeppelin-solidity/test/introspection/SupportsInterface.behavior');

const { shouldBehaveLikeMintAndBurnERC721 } = require('openzeppelin-solidity/test/token/ERC721/ERC721MintBurn.behavior'); // eslint-disable-line max-len

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

function shouldBehaveLikeERC721Full (creator, operator, accounts, name, symbol) {
  const firstTokenId = 100;
  const secondTokenId = 200;
  const thirdTokenId = 300;
  const nonExistentTokenId = 999;

  const [
    owner,
    newOwner,
    another,
    anyone,
  ] = accounts;

  describe('like a full ERC721', function () {
    beforeEach(async function () {
      await this.token.mint(owner, firstTokenId, { from: operator });
      await this.token.mint(owner, secondTokenId, { from: operator });
    });

    describe('mint', function () {
      beforeEach(async function () {
        await this.token.mint(newOwner, thirdTokenId, { from: operator });
      });

      it('adjusts owner tokens by index', async function () {
        (await this.token.tokenOfOwnerByIndex(newOwner, 0)).toNumber().should.be.equal(thirdTokenId);
      });

      it('adjusts all tokens list', async function () {
        (await this.token.tokenByIndex(2)).toNumber().should.be.equal(thirdTokenId);
      });
    });

    describe('burn', function () {
      beforeEach(async function () {
        await this.token.burn(firstTokenId, { from: owner });
      });

      it('removes that token from the token list of the owner', async function () {
        (await this.token.tokenOfOwnerByIndex(owner, 0)).toNumber().should.be.equal(secondTokenId);
      });

      it('adjusts all tokens list', async function () {
        (await this.token.tokenByIndex(0)).toNumber().should.be.equal(secondTokenId);
      });

      it('burns all tokens', async function () {
        await this.token.burn(secondTokenId, { from: owner });
        (await this.token.totalSupply()).toNumber().should.be.equal(0);
        await shouldFail.reverting(this.token.tokenByIndex(0));
      });
    });

    describe('removeTokenFrom', function () {
      it('reverts if the correct owner is not passed', async function () {
        await shouldFail.reverting(
          this.token.removeTokenFrom(anyone, firstTokenId, { from: owner })
        );
      });

      context('once removed', function () {
        beforeEach(async function () {
          await this.token.removeTokenFrom(owner, firstTokenId, { from: owner });
        });

        it('has been removed', async function () {
          await shouldFail.reverting(this.token.tokenOfOwnerByIndex(owner, 1));
        });

        it('adjusts token list', async function () {
          (await this.token.tokenOfOwnerByIndex(owner, 0)).toNumber().should.be.equal(secondTokenId);
        });

        it('adjusts owner count', async function () {
          (await this.token.balanceOf(owner)).toNumber().should.be.equal(1);
        });

        it('does not adjust supply', async function () {
          (await this.token.totalSupply()).toNumber().should.be.equal(2);
        });
      });
    });

    describe('metadata', function () {
      const sampleUri = 'mock://mytoken';

      it('has a name', async function () {
        (await this.token.name()).should.be.equal(name);
      });

      it('has a symbol', async function () {
        (await this.token.symbol()).should.be.equal(symbol);
      });

      it('sets and returns metadata for a token id', async function () {
        await this.token.setTokenURI(firstTokenId, sampleUri);
        (await this.token.tokenURI(firstTokenId)).should.be.equal(sampleUri);
      });

      it('reverts when setting metadata for non existent token id', async function () {
        await shouldFail.reverting(this.token.setTokenURI(nonExistentTokenId, sampleUri));
      });

      it('can burn token with metadata', async function () {
        await this.token.setTokenURI(firstTokenId, sampleUri);
        await this.token.burn(firstTokenId, { from: owner });
        (await this.token.exists(firstTokenId)).should.equal(false);
      });

      it('returns empty metadata for token', async function () {
        (await this.token.tokenURI(firstTokenId)).should.be.equal('');
      });

      it('reverts when querying metadata for non existent token id', async function () {
        await shouldFail.reverting(this.token.tokenURI(nonExistentTokenId));
      });
    });

    describe('totalSupply', function () {
      it('returns total token supply', async function () {
        (await this.token.totalSupply()).should.be.bignumber.equal(2);
      });
    });

    describe('tokenOfOwnerByIndex', function () {
      describe('when the given index is lower than the amount of tokens owned by the given address', function () {
        it('returns the token ID placed at the given index', async function () {
          (await this.token.tokenOfOwnerByIndex(owner, 0)).should.be.bignumber.equal(firstTokenId);
        });
      });

      describe('when the index is greater than or equal to the total tokens owned by the given address', function () {
        it('reverts', async function () {
          await shouldFail.reverting(this.token.tokenOfOwnerByIndex(owner, 2));
        });
      });

      describe('when the given address does not own any token', function () {
        it('reverts', async function () {
          await shouldFail.reverting(this.token.tokenOfOwnerByIndex(another, 0));
        });
      });

      describe('after transferring all tokens to another user', function () {
        beforeEach(async function () {
          await this.token.transferFrom(owner, another, firstTokenId, { from: owner });
          await this.token.transferFrom(owner, another, secondTokenId, { from: owner });
        });

        it('returns correct token IDs for target', async function () {
          (await this.token.balanceOf(another)).toNumber().should.be.equal(2);
          const tokensListed = await Promise.all(
            [0, 1].map(i => this.token.tokenOfOwnerByIndex(another, i))
          );
          tokensListed.map(t => t.toNumber()).should.have.members([firstTokenId, secondTokenId]);
        });

        it('returns empty collection for original owner', async function () {
          (await this.token.balanceOf(owner)).toNumber().should.be.equal(0);
          await shouldFail.reverting(this.token.tokenOfOwnerByIndex(owner, 0));
        });
      });
    });

    describe('tokenByIndex', function () {
      it('should return all tokens', async function () {
        const tokensListed = await Promise.all(
          [0, 1].map(i => this.token.tokenByIndex(i))
        );
        tokensListed.map(t => t.toNumber()).should.have.members([firstTokenId, secondTokenId]);
      });

      it('should revert if index is greater than supply', async function () {
        await shouldFail.reverting(this.token.tokenByIndex(2));
      });

      [firstTokenId, secondTokenId].forEach(function (tokenId) {
        it(`should return all tokens after burning token ${tokenId} and minting new tokens`, async function () {
          const newTokenId = 300;
          const anotherNewTokenId = 400;

          await this.token.burn(tokenId, { from: owner });
          await this.token.mint(newOwner, newTokenId, { from: operator });
          await this.token.mint(newOwner, anotherNewTokenId, { from: operator });

          (await this.token.totalSupply()).toNumber().should.be.equal(3);

          const tokensListed = await Promise.all(
            [0, 1, 2].map(i => this.token.tokenByIndex(i))
          );
          const expectedTokens = [firstTokenId, secondTokenId, newTokenId, anotherNewTokenId].filter(
            x => (x !== tokenId)
          );
          tokensListed.map(t => t.toNumber()).should.have.members(expectedTokens);
        });
      });
    });
  });

  shouldBehaveLikeERC721(creator, operator, accounts);
  shouldBehaveLikeMintAndBurnERC721(creator, operator, accounts);

  shouldSupportInterfaces([
    'ERC165',
    'ERC721',
    'ERC721Enumerable',
    'ERC721Metadata',
  ]);
}

module.exports = {
  shouldBehaveLikeERC721Full,
};
