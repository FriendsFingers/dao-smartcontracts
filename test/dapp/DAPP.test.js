const { BN, constants, expectRevert, expectEvent, time } = require('openzeppelin-test-helpers');
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
    this.token = await ERC1363.new(creator, tokenBalance);

    await this.token.mintMock(member, tokenBalance);

    this.dao = await DAO.new(this.token.address, { from: creator });

    await this.dao.addOperator(operator, { from: creator });

    await this.dao.newMember(member, { from: operator });

    this.memberCreationDate = await time.latest();
  });

  context('testing constructor', function () {
    describe('if accepted token is the zero address', function () {
      it('reverts', async function () {
        await expectRevert.unspecified(DAPP.new(ZERO_ADDRESS, fee));
      });
    });

    describe('if fee is equal to 0', function () {
      it('success', async function () {
        DAPP.new(this.dao.address, 0);
      });
    });
  });

  context('if valid constructor with fee greater than zero', function () {
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
          await expectRevert.unspecified(this.dapp.onlyMemberAction({ from: anotherAccount }));
        });
      });
    });

    context('testing onlyApproved actions', function () {
      describe('from approved member', function () {
        it('allows access', async function () {
          await this.dao.setApproved(member, true, { from: operator });
          await this.dapp.onlyApprovedAction({ from: member });
        });
      });

      describe('from not approved member', function () {
        it('reverts', async function () {
          await expectRevert.unspecified(this.dapp.onlyApprovedAction({ from: member }));
        });
      });

      describe('from another account', function () {
        it('reverts', async function () {
          await expectRevert.unspecified(this.dapp.onlyApprovedAction({ from: anotherAccount }));
        });
      });
    });

    context('testing useFee', function () {
      context('if member is calling', function () {
        describe('if member has enough tokens staked', function () {
          beforeEach(async function () {
            await this.token.transferAndCall(this.dao.address, fee, { from: member });
          });

          describe('if dapp is not authorized', function () {
            it('reverts', async function () {
              await expectRevert.unspecified(this.dapp.useFeeAction({ from: member }));
            });
          });

          describe('if dapp is authorized', function () {
            let receipt;

            let preMemberStructure;
            let preStakedTokens;
            let preUseddTokens;
            let daoPreBalance;
            let dappPreBalance;

            beforeEach(async function () {
              await this.dao.addDapp(this.dapp.address, { from: operator });

              preMemberStructure = structDecode(await this.dao.getMemberByAddress(member));
              preStakedTokens = await this.dao.totalStakedTokens();
              preUseddTokens = await this.dao.totalUsedTokens();
              daoPreBalance = await this.token.balanceOf(this.dao.address);
              dappPreBalance = await this.token.balanceOf(this.dapp.address);

              receipt = await this.dapp.useFeeAction({ from: member });
            });

            it('should decrease member staked tokens', async function () {
              const memberStructure = structDecode(await this.dao.getMemberByAddress(member));
              memberStructure.stakedTokens.should.be.bignumber.equal(
                preMemberStructure.stakedTokens.sub(fee)
              );
            });

            it('should decrease dao total staked tokens', async function () {
              (await this.dao.totalStakedTokens()).should.be.bignumber.equal(
                preStakedTokens.sub(fee)
              );
            });

            it('should increase member used tokens', async function () {
              const memberStructure = structDecode(await this.dao.getMemberByAddress(member));
              memberStructure.usedTokens.should.be.bignumber.equal(
                preMemberStructure.usedTokens.add(fee)
              );
            });

            it('should increase dao total used tokens', async function () {
              (await this.dao.totalUsedTokens()).should.be.bignumber.equal(
                preUseddTokens.add(fee)
              );
            });

            it('should decrease dao token balance', async function () {
              (await this.token.balanceOf(this.dao.address)).should.be.bignumber.equal(
                daoPreBalance.sub(fee)
              );
            });

            it('should increase dapp token balance', async function () {
              (await this.token.balanceOf(this.dapp.address)).should.be.bignumber.equal(
                dappPreBalance.add(fee)
              );
            });

            it('should emit TokensUsed', async function () {
              await expectEvent.inTransaction(receipt.tx, DAO, 'TokensUsed', {
                account: member,
                dapp: this.dapp.address,
                value: fee,
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
              await expectRevert.unspecified(this.dapp.useFeeAction({ from: member }));
            });
          });

          describe('if dapp is authorized', function () {
            beforeEach(async function () {
              await this.dao.addDapp(this.dapp.address, { from: operator });
            });

            it('reverts', async function () {
              await expectRevert.unspecified(this.dapp.useFeeAction({ from: member }));
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
            await expectRevert.unspecified(this.dapp.useFeeAction({ from: anotherAccount }));
          });
        });
      });
    });

    context('testing useTokens', function () {
      const amount = new BN(500);

      context('with zero amount', function () {
        context('if member is calling', function () {
          describe('if member has tokens staked', function () {
            beforeEach(async function () {
              await this.token.transferAndCall(this.dao.address, amount, { from: member });
            });

            describe('if dapp is not authorized', function () {
              it('reverts', async function () {
                await expectRevert.unspecified(this.dapp.useTokensAction(0, { from: member }));
              });
            });

            describe('if dapp is authorized', function () {
              let receipt;

              let preMemberStructure;
              let preStakedTokens;
              let preUseddTokens;
              let daoPreBalance;
              let dappPreBalance;

              beforeEach(async function () {
                await this.dao.addDapp(this.dapp.address, { from: operator });

                preMemberStructure = structDecode(await this.dao.getMemberByAddress(member));
                preStakedTokens = await this.dao.totalStakedTokens();
                preUseddTokens = await this.dao.totalUsedTokens();
                daoPreBalance = await this.token.balanceOf(this.dao.address);
                dappPreBalance = await this.token.balanceOf(this.dapp.address);

                receipt = await this.dapp.useTokensAction(0, { from: member });
              });

              it('should not decrease member staked tokens', async function () {
                const memberStructure = structDecode(await this.dao.getMemberByAddress(member));
                memberStructure.stakedTokens.should.be.bignumber.equal(preMemberStructure.stakedTokens);
              });

              it('should not decrease dao total staked tokens', async function () {
                (await this.dao.totalStakedTokens()).should.be.bignumber.equal(preStakedTokens);
              });

              it('should not increase member used tokens', async function () {
                const memberStructure = structDecode(await this.dao.getMemberByAddress(member));
                memberStructure.usedTokens.should.be.bignumber.equal(preMemberStructure.usedTokens);
              });

              it('should not increase dao total used tokens', async function () {
                (await this.dao.totalUsedTokens()).should.be.bignumber.equal(preUseddTokens);
              });

              it('should not decrease dao token balance', async function () {
                (await this.token.balanceOf(this.dao.address)).should.be.bignumber.equal(daoPreBalance);
              });

              it('should not increase dapp token balance', async function () {
                (await this.token.balanceOf(this.dapp.address)).should.be.bignumber.equal(dappPreBalance);
              });

              it('should emit TokensUsed', async function () {
                await expectEvent.inTransaction(receipt.tx, DAO, 'TokensUsed', {
                  account: member,
                  dapp: this.dapp.address,
                  value: new BN(0),
                });
              });
            });
          });

          describe('also if member has not tokens staked', function () {
            describe('if dapp is not authorized', function () {
              it('reverts', async function () {
                await expectRevert.unspecified(this.dapp.useTokensAction(0, { from: member }));
              });
            });

            describe('if dapp is authorized', function () {
              let receipt;

              let preMemberStructure;
              let preStakedTokens;
              let preUseddTokens;
              let daoPreBalance;
              let dappPreBalance;

              beforeEach(async function () {
                await this.dao.addDapp(this.dapp.address, { from: operator });

                preMemberStructure = structDecode(await this.dao.getMemberByAddress(member));
                preStakedTokens = await this.dao.totalStakedTokens();
                preUseddTokens = await this.dao.totalUsedTokens();
                daoPreBalance = await this.token.balanceOf(this.dao.address);
                dappPreBalance = await this.token.balanceOf(this.dapp.address);

                receipt = await this.dapp.useTokensAction(0, { from: member });
              });

              it('should not decrease member staked tokens', async function () {
                const memberStructure = structDecode(await this.dao.getMemberByAddress(member));
                memberStructure.stakedTokens.should.be.bignumber.equal(preMemberStructure.stakedTokens);
              });

              it('should not decrease dao total staked tokens', async function () {
                (await this.dao.totalStakedTokens()).should.be.bignumber.equal(preStakedTokens);
              });

              it('should not increase member used tokens', async function () {
                const memberStructure = structDecode(await this.dao.getMemberByAddress(member));
                memberStructure.usedTokens.should.be.bignumber.equal(preMemberStructure.usedTokens);
              });

              it('should not increase dao total used tokens', async function () {
                (await this.dao.totalUsedTokens()).should.be.bignumber.equal(preUseddTokens);
              });

              it('should not decrease dao token balance', async function () {
                (await this.token.balanceOf(this.dao.address)).should.be.bignumber.equal(daoPreBalance);
              });

              it('should not increase dapp token balance', async function () {
                (await this.token.balanceOf(this.dapp.address)).should.be.bignumber.equal(dappPreBalance);
              });

              it('should emit TokensUsed', async function () {
                await expectEvent.inTransaction(receipt.tx, DAO, 'TokensUsed', {
                  account: member,
                  dapp: this.dapp.address,
                  value: new BN(0),
                });
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
              await expectRevert.unspecified(this.dapp.useTokensAction(0, { from: anotherAccount }));
            });
          });
        });
      });

      context('with an amount greater than zero', function () {
        context('if member is calling', function () {
          describe('if member has enough tokens staked', function () {
            beforeEach(async function () {
              await this.token.transferAndCall(this.dao.address, amount, { from: member });
            });

            describe('if dapp is not authorized', function () {
              it('reverts', async function () {
                await expectRevert.unspecified(this.dapp.useTokensAction(amount, { from: member }));
              });
            });

            describe('if dapp is authorized', function () {
              let receipt;

              let preMemberStructure;
              let preStakedTokens;
              let preUseddTokens;
              let daoPreBalance;
              let dappPreBalance;

              beforeEach(async function () {
                await this.dao.addDapp(this.dapp.address, { from: operator });

                preMemberStructure = structDecode(await this.dao.getMemberByAddress(member));
                preStakedTokens = await this.dao.totalStakedTokens();
                preUseddTokens = await this.dao.totalUsedTokens();
                daoPreBalance = await this.token.balanceOf(this.dao.address);
                dappPreBalance = await this.token.balanceOf(this.dapp.address);

                receipt = await this.dapp.useTokensAction(amount, { from: member });
              });

              it('should decrease member staked tokens', async function () {
                const memberStructure = structDecode(await this.dao.getMemberByAddress(member));
                memberStructure.stakedTokens.should.be.bignumber.equal(
                  preMemberStructure.stakedTokens.sub(amount)
                );
              });

              it('should decrease dao total staked tokens', async function () {
                (await this.dao.totalStakedTokens()).should.be.bignumber.equal(
                  preStakedTokens.sub(amount)
                );
              });

              it('should increase member used tokens', async function () {
                const memberStructure = structDecode(await this.dao.getMemberByAddress(member));
                memberStructure.usedTokens.should.be.bignumber.equal(
                  preMemberStructure.usedTokens.add(amount)
                );
              });

              it('should increase dao total used tokens', async function () {
                (await this.dao.totalUsedTokens()).should.be.bignumber.equal(
                  preUseddTokens.add(amount)
                );
              });

              it('should decrease dao token balance', async function () {
                (await this.token.balanceOf(this.dao.address)).should.be.bignumber.equal(
                  daoPreBalance.sub(amount)
                );
              });

              it('should increase dapp token balance', async function () {
                (await this.token.balanceOf(this.dapp.address)).should.be.bignumber.equal(
                  dappPreBalance.add(amount)
                );
              });

              it('should emit TokensUsed', async function () {
                await expectEvent.inTransaction(receipt.tx, DAO, 'TokensUsed', {
                  account: member,
                  dapp: this.dapp.address,
                  value: amount,
                });
              });
            });
          });

          describe('if member has not enough tokens staked', function () {
            beforeEach(async function () {
              await this.token.transferAndCall(this.dao.address, amount.subn(1), { from: member });
            });

            describe('if dapp is not authorized', function () {
              it('reverts', async function () {
                await expectRevert.unspecified(this.dapp.useTokensAction(amount, { from: member }));
              });
            });

            describe('if dapp is authorized', function () {
              beforeEach(async function () {
                await this.dao.addDapp(this.dapp.address, { from: operator });
              });

              it('reverts', async function () {
                await expectRevert.unspecified(this.dapp.useTokensAction(amount, { from: member }));
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
              await expectRevert.unspecified(this.dapp.useTokensAction(amount, { from: anotherAccount }));
            });
          });
        });
      });
    });

    context('testing both', function () {
      const amount = new BN(500);
      const totalAmount = fee.add(amount);

      context('if member is calling', function () {
        describe('if member has enough tokens staked', function () {
          beforeEach(async function () {
            await this.token.transferAndCall(this.dao.address, totalAmount, { from: member });
          });

          describe('if dapp is not authorized', function () {
            it('reverts', async function () {
              await expectRevert.unspecified(this.dapp.useDappAction(amount, { from: member }));
            });
          });

          describe('if dapp is authorized', function () {
            let receipt;

            let preMemberStructure;
            let preStakedTokens;
            let preUseddTokens;
            let daoPreBalance;
            let dappPreBalance;

            beforeEach(async function () {
              await this.dao.addDapp(this.dapp.address, { from: operator });

              preMemberStructure = structDecode(await this.dao.getMemberByAddress(member));
              preStakedTokens = await this.dao.totalStakedTokens();
              preUseddTokens = await this.dao.totalUsedTokens();
              daoPreBalance = await this.token.balanceOf(this.dao.address);
              dappPreBalance = await this.token.balanceOf(this.dapp.address);

              receipt = await this.dapp.useDappAction(amount, { from: member });
            });

            it('should decrease member staked tokens', async function () {
              const memberStructure = structDecode(await this.dao.getMemberByAddress(member));
              memberStructure.stakedTokens.should.be.bignumber.equal(
                preMemberStructure.stakedTokens.sub(totalAmount)
              );
            });

            it('should decrease dao total staked tokens', async function () {
              (await this.dao.totalStakedTokens()).should.be.bignumber.equal(
                preStakedTokens.sub(totalAmount)
              );
            });

            it('should increase member used tokens', async function () {
              const memberStructure = structDecode(await this.dao.getMemberByAddress(member));
              memberStructure.usedTokens.should.be.bignumber.equal(
                preMemberStructure.usedTokens.add(totalAmount)
              );
            });

            it('should increase dao total used tokens', async function () {
              (await this.dao.totalUsedTokens()).should.be.bignumber.equal(
                preUseddTokens.add(totalAmount)
              );
            });

            it('should decrease dao token balance', async function () {
              (await this.token.balanceOf(this.dao.address)).should.be.bignumber.equal(
                daoPreBalance.sub(totalAmount)
              );
            });

            it('should increase dapp token balance', async function () {
              (await this.token.balanceOf(this.dapp.address)).should.be.bignumber.equal(
                dappPreBalance.add(totalAmount)
              );
            });

            it('should emit TokensUsed', async function () {
              await expectEvent.inTransaction(receipt.tx, DAO, 'TokensUsed', {
                account: member,
                dapp: this.dapp.address,
                value: fee,
              });

              await expectEvent.inTransaction(receipt.tx, DAO, 'TokensUsed', {
                account: member,
                dapp: this.dapp.address,
                value: amount,
              });
            });
          });
        });

        describe('if member has not enough tokens staked', function () {
          beforeEach(async function () {
            await this.token.transferAndCall(this.dao.address, totalAmount.subn(1), { from: member });
          });

          describe('if dapp is not authorized', function () {
            it('reverts', async function () {
              await expectRevert.unspecified(this.dapp.useDappAction(amount, { from: member }));
            });
          });

          describe('if dapp is authorized', function () {
            beforeEach(async function () {
              await this.dao.addDapp(this.dapp.address, { from: operator });
            });

            it('reverts', async function () {
              await expectRevert.unspecified(this.dapp.useDappAction(amount, { from: member }));
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
            await expectRevert.unspecified(this.dapp.useDappAction(amount, { from: anotherAccount }));
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
