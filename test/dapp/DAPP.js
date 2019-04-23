const { BN, constants, shouldFail, expectEvent, time } = require('openzeppelin-test-helpers');
const { ZERO_ADDRESS } = constants;

const { structDecode } = require('../utils/structDecode');

const ERC1363 = artifacts.require('ERC1363Mock');
const DAO = artifacts.require('DAOMock');
const DAPP = artifacts.require('DAPPMock');

contract('DAPP', function (
  [
    creator,
    operator,
    member,
    anotherAccount,
    ...accounts
  ]
) {
  const fee = new BN(5);
  const tokenBalance = new BN(20000);

  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
    await time.advanceBlock();
  });

  beforeEach(async function () {
    this.structure = {
      data: JSON.stringify({ key: 'value' }),
      stakedTokens: new BN(5),
    };

    this.token = await ERC1363.new(creator, tokenBalance);

    await this.token.mintMock(member, tokenBalance);

    this.dao = await DAO.new(this.token.address, { from: creator });

    await this.dao.addOperator(operator, { from: creator });

    await this.dao.newMember(member, { from: operator });

    this.memberCreationDate = await time.latest();
  });

  context('if invalid constructor', function () {
    describe('if accepted token is the zero address', function () {
      it('reverts', async function () {
        await shouldFail.reverting(DAPP.new(ZERO_ADDRESS, fee));
      });
    });

    describe('if fee is equal to 0', function () {
      it('reverts', async function () {
        await shouldFail.reverting(DAPP.new(this.dao.address, 0));
      });
    });
  });

  context('if valid constructor', function () {
    beforeEach(async function () {
      this.dapp = await DAPP.new(this.dao.address, fee);
    });

    it('should have DAO set', async function () {
      (await this.dapp.dao()).should.be.equal(this.dao.address);
    });

    it('should have fee set', async function () {
      (await this.dapp.fee()).should.be.bignumber.equal(fee);
    });

    context('testing onlyMember actions', function () {
      describe('from member', function () {
        it('allows access', async function () {
          await this.dapp.onlyMemberAction({ from: member });
        });
      });

      describe('from another account', function () {
        it('reverts', async function () {
          await shouldFail.reverting(this.dapp.onlyMemberAction({ from: anotherAccount }));
        });
      });
    });

    context('testing tokenPayable', function () {
      context('if member is calling', function () {
        describe('if member has enough tokens staked', function () {
          beforeEach(async function () {
            await this.token.transferAndCall(this.dao.address, fee, { from: member });
          });

          describe('if dapp is not authorized', function () {
            it('reverts', async function () {
              await shouldFail.reverting(this.dapp.tokenPayableAction({ from: member }));
            });
          });

          describe('if dapp is authorized', function () {
            let receipt;

            let preMemberStructure;
            let preStakedTokens;
            let daoPreBalance;
            let dappPreBalance;

            beforeEach(async function () {
              await this.dao.addDapp(this.dapp.address, { from: operator });

              preMemberStructure = structDecode(await this.dao.getMemberByAddress(member));
              preStakedTokens = await this.dao.totalStakedTokens();
              daoPreBalance = await this.token.balanceOf(this.dao.address);
              dappPreBalance = await this.token.balanceOf(this.dapp.address);

              receipt = await this.dapp.tokenPayableAction({ from: member });
            });

            it('should decrease member staked tokens', async function () {
              const memberStructure = structDecode(await this.dao.getMemberByAddress(member));
              memberStructure.stakedTokens.should.be.bignumber.equal(
                preMemberStructure.stakedTokens.sub(this.structure.stakedTokens)
              );
            });

            it('should decrease dao total staked tokens', async function () {
              (await this.dao.totalStakedTokens())
                .should.be.bignumber.equal(preStakedTokens.sub(this.structure.stakedTokens));
            });

            it('should decrease dao token balance', async function () {
              (await this.token.balanceOf(this.dao.address))
                .should.be.bignumber.equal(daoPreBalance.sub(this.structure.stakedTokens));
            });

            it('should increase dapp token balance', async function () {
              (await this.token.balanceOf(this.dapp.address))
                .should.be.bignumber.equal(dappPreBalance.add(this.structure.stakedTokens));
            });

            it('should emit TokensUsed', async function () {
              await expectEvent.inTransaction(receipt.tx, DAO, 'TokensUsed', {
                account: member,
                dapp: this.dapp.address,
                value: this.structure.stakedTokens,
              });
            });
          });
        });

        describe('if member has not enough tokens staked', function () {
          beforeEach(async function () {
            await this.token.transferAndCall(this.dao.address, fee.subn(1), { from: member });
          });

          describe('if dapp is not authorized', function () {
            it('reverts', async function () {
              await shouldFail.reverting(this.dapp.tokenPayableAction({ from: member }));
            });
          });

          describe('if dapp is authorized', function () {
            beforeEach(async function () {
              await this.dao.addDapp(this.dapp.address, { from: operator });
            });

            it('reverts', async function () {
              await shouldFail.reverting(this.dapp.tokenPayableAction({ from: member }));
            });
          });
        });
      });

      context('if another account is calling', function () {
        describe('if dapp is authorized', function () {
          beforeEach(async function () {
            await this.dao.addDapp(this.dapp.address, { from: operator });
          });

          it('reverts', async function () {
            await shouldFail.reverting(this.dapp.tokenPayableAction({ from: anotherAccount }));
          });
        });
      });
    });

    context('testing memberSince sample function', function () {
      describe('if member', function () {
        it('return true if date is greater than creation', async function () {
          (await this.dapp.memberSince(member, this.memberCreationDate.addn(1))).should.be.equal(true);
        });

        it('return false if date is lower than creation', async function () {
          (await this.dapp.memberSince(member, this.memberCreationDate.subn(1))).should.be.equal(false);
        });
      });

      describe('if another account', function () {
        it('return false', async function () {
          (await this.dapp.memberSince(anotherAccount, this.memberCreationDate.addn(1))).should.be.equal(false);
        });
      });
    });
  });
});
