const { advanceBlock } = require('openzeppelin-solidity/test/helpers/advanceToBlock');
const shouldFail = require('openzeppelin-solidity/test/helpers/shouldFail');
const time = require('openzeppelin-solidity/test/helpers/time');

const { ZERO_ADDRESS } = require('openzeppelin-solidity/test/helpers/constants');

const { shouldBehaveLikeTokenRecover } = require('eth-token-recover/test/TokenRecover.behaviour');
const { shouldBehaveLikeERC721Full } = require('./behaviors/ERC721Full.behavior');

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

const ShakaCard = artifacts.require('ShakaCardMock');

contract('ShakaCard', function (
  [
    creator,
    minter,
    beneficiary,
    anotherAccount,
    ...accounts
  ]
) {
  const name = 'TokenName';
  const symbol = 'SYM';

  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
    await advanceBlock();
  });

  beforeEach(async function () {
    this.structure = {
      mainColor: '97168a',
      backgroundColor: 'ffffff',
      borderColor: 'fae596',
      stackedTokens: new BigNumber(5),
    };

    this.token = await ShakaCard.new(name, symbol, { from: creator });
  });

  context('testing ERC721 behaviors', function () {
    beforeEach(async function () {
      await this.token.addMinter(minter, { from: creator });
    });

    shouldBehaveLikeERC721Full(creator, minter, accounts, name, symbol);
  });

  context('creating new token', function () {
    let tokenId;

    beforeEach(async function () {
      await this.token.addMinter(minter, { from: creator });
      await this.token.newCard(
        beneficiary,
        this.structure.mainColor,
        this.structure.backgroundColor,
        this.structure.borderColor,
        this.structure.stackedTokens,
        { from: minter }
      );

      tokenId = await this.token.progressiveId();
    });

    context('metadata', function () {
      context('check by id', function () {
        let tokenStructure;

        beforeEach(async function () {
          tokenStructure = await this.token.getCardById(tokenId);
        });

        describe('when token exists', function () {
          describe('check metadata', function () {
            it('has a beneficiary', async function () {
              const toCheck = tokenStructure[0];
              toCheck.should.be.equal(beneficiary);
            });

            it('has an main color', async function () {
              const toCheck = tokenStructure[1];
              assert.equal(web3.toAscii(toCheck), this.structure.mainColor);
            });

            it('has an background color', async function () {
              const toCheck = tokenStructure[2];
              assert.equal(web3.toAscii(toCheck), this.structure.backgroundColor);
            });

            it('has an border color', async function () {
              const toCheck = tokenStructure[3];
              assert.equal(web3.toAscii(toCheck), this.structure.borderColor);
            });

            it('has a stacked tokens value', async function () {
              const toCheck = tokenStructure[4];
              toCheck.should.be.bignumber.equal(this.structure.stackedTokens);
            });

            it('has a creation date', async function () {
              const toCheck = tokenStructure[5];
              toCheck.should.be.bignumber.equal(await time.latest());
            });
          });
        });
      });

      context('check by address', function () {
        let tokenStructure;

        beforeEach(async function () {
          tokenStructure = await this.token.getCardByAddress(beneficiary);
        });

        describe('when token exists', function () {
          describe('check metadata', function () {
            it('has a beneficiary', async function () {
              const toCheck = tokenStructure[0];
              toCheck.should.be.equal(beneficiary);
            });

            it('has an main color', async function () {
              const toCheck = tokenStructure[1];
              assert.equal(web3.toAscii(toCheck), this.structure.mainColor);
            });

            it('has an background color', async function () {
              const toCheck = tokenStructure[2];
              assert.equal(web3.toAscii(toCheck), this.structure.backgroundColor);
            });

            it('has an border color', async function () {
              const toCheck = tokenStructure[3];
              assert.equal(web3.toAscii(toCheck), this.structure.borderColor);
            });

            it('has a stacked tokens value', async function () {
              const toCheck = tokenStructure[4];
              toCheck.should.be.bignumber.equal(this.structure.stackedTokens);
            });

            it('has a creation date', async function () {
              const toCheck = tokenStructure[5];
              toCheck.should.be.bignumber.equal(await time.latest());
            });
          });
        });
      });

      describe('when token does not exist', function () {
        describe('check metadata', function () {
          it('reverts using id', async function () {
            await shouldFail.reverting(this.token.getCardById(999));
          });

          it('reverts using address', async function () {
            await shouldFail.reverting(this.token.getCardByAddress(anotherAccount));
          });
        });
      });

      describe('when token is burnt', function () {
        beforeEach(async function () {
          await this.token.burn(tokenId, { from: minter });
        });

        describe('check metadata', function () {
          it('reverts using id', async function () {
            await shouldFail.reverting(this.token.getCardById(tokenId));
          });

          it('reverts using address', async function () {
            await shouldFail.reverting(this.token.getCardByAddress(beneficiary));
          });
        });
      });
    });

    describe('progressive id', function () {
      it('should increase', async function () {
        const oldProgressiveId = await this.token.progressiveId();

        await this.token.newCard(
          anotherAccount,
          this.structure.mainColor,
          this.structure.backgroundColor,
          this.structure.borderColor,
          this.structure.stackedTokens,
          { from: minter }
        );
        const newProgressiveId = await this.token.progressiveId();

        newProgressiveId.should.be.bignumber.equal(oldProgressiveId.add(1));
      });
    });

    describe('if beneficiary already has a card', function () {
      it('reverts', async function () {
        await shouldFail.reverting(
          this.token.newCard(
            beneficiary,
            this.structure.mainColor,
            this.structure.backgroundColor,
            this.structure.borderColor,
            this.structure.stackedTokens,
            { from: anotherAccount }
          )
        );
      });
    });

    describe('if beneficiary is the zero address', function () {
      it('reverts', async function () {
        await shouldFail.reverting(
          this.token.newCard(
            ZERO_ADDRESS,
            this.structure.mainColor,
            this.structure.backgroundColor,
            this.structure.borderColor,
            this.structure.stackedTokens,
            { from: minter }
          )
        );
      });
    });

    describe('if caller has not minter permission', function () {
      it('reverts', async function () {
        await shouldFail.reverting(
          this.token.newCard(
            anotherAccount,
            this.structure.mainColor,
            this.structure.backgroundColor,
            this.structure.borderColor,
            this.structure.stackedTokens,
            { from: anotherAccount }
          )
        );
      });
    });
  });

  context('like a TokenRecover', function () {
    beforeEach(async function () {
      this.instance = this.token;
    });

    shouldBehaveLikeTokenRecover([creator, anotherAccount]);
  });
});
