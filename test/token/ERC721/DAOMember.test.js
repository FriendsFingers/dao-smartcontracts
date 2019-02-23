const { advanceBlock } = require('openzeppelin-solidity/test/helpers/advanceToBlock');
const shouldFail = require('openzeppelin-solidity/test/helpers/shouldFail');
const time = require('openzeppelin-solidity/test/helpers/time');

const { ZERO_ADDRESS } = require('openzeppelin-solidity/test/helpers/constants');

const { shouldBehaveLikeOwnable } = require('openzeppelin-solidity/test/ownership/Ownable.behavior');
const { shouldBehaveLikeTokenRecover } = require('eth-token-recover/test/TokenRecover.behaviour');
const { shouldBehaveLikeERC721Full } = require('./behaviors/ERC721Full.behavior');
const { shouldBehaveLikeRemoveRole } = require('../../access/roles/RemoveRole.behavior');

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

const DAOMember = artifacts.require('DAOMemberMock');

contract('DAOMember', function (
  [
    creator,
    operator,
    member,
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
      data: JSON.stringify({ key: 'value' }),
      stackedTokens: new BigNumber(5),
    };

    this.member = await DAOMember.new(name, symbol, { from: creator });
  });

  context('testing ERC721 behaviors', function () {
    beforeEach(async function () {
      this.token = this.member;
    });

    shouldBehaveLikeERC721Full(creator, creator, accounts, name, symbol);
  });

  context('testing DAOMember behaviors', function () {
    let tokenId;

    beforeEach(async function () {
      await this.member.addOperator(operator, { from: creator });
      await this.member.newMember(
        member,
        this.structure.mainColor,
        this.structure.backgroundColor,
        this.structure.borderColor,
        web3.fromUtf8(this.structure.data),
        this.structure.stackedTokens,
        { from: operator }
      );

      tokenId = await this.member.progressiveId();
    });

    context('check properties', function () {
      describe('check isMember', function () {
        it('returns true', async function () {
          (await this.member.isMember(member)).should.be.equal(true);
        });
      });

      describe('progressive id', function () {
        it('should increase', async function () {
          const oldProgressiveId = await this.member.progressiveId();

          await this.member.newMember(
            anotherAccount,
            this.structure.mainColor,
            this.structure.backgroundColor,
            this.structure.borderColor,
            web3.fromUtf8(this.structure.data),
            this.structure.stackedTokens,
            { from: operator }
          );
          const newProgressiveId = await this.member.progressiveId();

          newProgressiveId.should.be.bignumber.equal(oldProgressiveId.add(1));
        });
      });
    });

    context('testing metadata', function () {
      context('check by id', function () {
        let tokenStructure;

        beforeEach(async function () {
          tokenStructure = await this.member.getMemberById(tokenId);
        });

        describe('when token exists', function () {
          describe('check metadata', function () {
            it('has a member', async function () {
              const toCheck = tokenStructure[0];
              toCheck.should.be.equal(member);
            });

            it('has an main color', async function () {
              const toCheck = tokenStructure[1];
              assert.equal(web3.toUtf8(toCheck), this.structure.mainColor);
            });

            it('has an background color', async function () {
              const toCheck = tokenStructure[2];
              assert.equal(web3.toUtf8(toCheck), this.structure.backgroundColor);
            });

            it('has an border color', async function () {
              const toCheck = tokenStructure[3];
              assert.equal(web3.toUtf8(toCheck), this.structure.borderColor);
            });

            it('has a data value', async function () {
              const toCheck = tokenStructure[4];
              assert.equal(web3.toUtf8(toCheck), this.structure.data);
            });

            it('has a stacked tokens value', async function () {
              const toCheck = tokenStructure[5];
              toCheck.should.be.bignumber.equal(this.structure.stackedTokens);
            });

            it('has a creation date', async function () {
              const toCheck = tokenStructure[6];
              toCheck.should.be.bignumber.equal(await time.latest());
            });
          });
        });
      });

      context('check by address', function () {
        let tokenStructure;

        beforeEach(async function () {
          tokenStructure = await this.member.getMemberByAddress(member);
        });

        describe('when token exists', function () {
          describe('check metadata', function () {
            it('has a member', async function () {
              const toCheck = tokenStructure[0];
              toCheck.should.be.equal(member);
            });

            it('has an main color', async function () {
              const toCheck = tokenStructure[1];
              assert.equal(web3.toUtf8(toCheck), this.structure.mainColor);
            });

            it('has an background color', async function () {
              const toCheck = tokenStructure[2];
              assert.equal(web3.toUtf8(toCheck), this.structure.backgroundColor);
            });

            it('has an border color', async function () {
              const toCheck = tokenStructure[3];
              assert.equal(web3.toUtf8(toCheck), this.structure.borderColor);
            });

            it('has a data value', async function () {
              const toCheck = tokenStructure[4];
              assert.equal(web3.toUtf8(toCheck), this.structure.data);
            });

            it('has a stacked tokens value', async function () {
              const toCheck = tokenStructure[5];
              toCheck.should.be.bignumber.equal(this.structure.stackedTokens);
            });

            it('has a creation date', async function () {
              const toCheck = tokenStructure[6];
              toCheck.should.be.bignumber.equal(await time.latest());
            });
          });
        });
      });

      describe('when token does not exist', function () {
        describe('check metadata', function () {
          it('reverts using id', async function () {
            await shouldFail.reverting(this.member.getMemberById(999));
          });

          it('reverts using address', async function () {
            await shouldFail.reverting(this.member.getMemberByAddress(anotherAccount));
          });
        });

        describe('check isMember', function () {
          it('returns false', async function () {
            (await this.member.isMember(anotherAccount)).should.be.equal(false);
          });
        });
      });

      describe('when token is burnt', function () {
        beforeEach(async function () {
          await this.member.burn(tokenId, { from: operator });
        });

        describe('check metadata', function () {
          it('reverts using id', async function () {
            await shouldFail.reverting(this.member.getMemberById(tokenId));
          });

          it('reverts using address', async function () {
            await shouldFail.reverting(this.member.getMemberByAddress(member));
          });
        });

        describe('check isMember', function () {
          it('returns false', async function () {
            (await this.member.isMember(member)).should.be.equal(false);
          });
        });
      });
    });

    context('creating new token', function () {
      describe('if member already exists', function () {
        it('reverts', async function () {
          await shouldFail.reverting(
            this.member.newMember(
              member,
              this.structure.mainColor,
              this.structure.backgroundColor,
              this.structure.borderColor,
              web3.fromUtf8(this.structure.data),
              this.structure.stackedTokens,
              { from: anotherAccount }
            )
          );
        });
      });

      describe('if member is the zero address', function () {
        it('reverts', async function () {
          await shouldFail.reverting(
            this.member.newMember(
              ZERO_ADDRESS,
              this.structure.mainColor,
              this.structure.backgroundColor,
              this.structure.borderColor,
              web3.fromUtf8(this.structure.data),
              this.structure.stackedTokens,
              { from: operator }
            )
          );
        });
      });

      describe('if caller has not operator permission', function () {
        it('reverts', async function () {
          await shouldFail.reverting(
            this.member.newMember(
              anotherAccount,
              this.structure.mainColor,
              this.structure.backgroundColor,
              this.structure.borderColor,
              web3.fromUtf8(this.structure.data),
              this.structure.stackedTokens,
              { from: anotherAccount }
            )
          );
        });
      });
    });

    context('testing ownership', function () {
      beforeEach(async function () {
        this.ownable = this.member;
      });

      shouldBehaveLikeOwnable(creator, [anotherAccount]);
    });

    context('testing roles', function () {
      beforeEach(async function () {
        this.contract = this.member;
      });

      context('testing remove roles', function () {
        beforeEach(async function () {
          this.contract = this.member;
        });

        shouldBehaveLikeRemoveRole(creator, operator, [anotherAccount], 'operator');
      });
    });
  });

  context('like a TokenRecover', function () {
    beforeEach(async function () {
      this.instance = this.member;
    });

    shouldBehaveLikeTokenRecover([creator, anotherAccount]);
  });
});
