const { advanceBlock } = require('openzeppelin-solidity/test/helpers/advanceToBlock');
const shouldFail = require('openzeppelin-solidity/test/helpers/shouldFail');
const expectEvent = require('openzeppelin-solidity/test/helpers/expectEvent');
const time = require('openzeppelin-solidity/test/helpers/time');

const { ZERO_ADDRESS } = require('openzeppelin-solidity/test/helpers/constants');

const { shouldBehaveLikeOwnable } = require('openzeppelin-solidity/test/ownership/Ownable.behavior');
const { shouldBehaveLikeTokenRecover } = require('eth-token-recover/test/TokenRecover.behaviour');
const { shouldBehaveLikeRemoveRole } = require('../access/roles/RemoveRole.behavior');

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

const DAOMember = artifacts.require('DAOMember');

contract('DAOMember', function (
  [
    creator,
    operator,
    member,
    anotherAccount,
    ...accounts
  ]
) {
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

    this.member = await DAOMember.new({ from: creator });
  });

  context('testing DAOMember behaviors', function () {
    beforeEach(async function () {
      await this.member.addOperator(operator, { from: creator });
    });

    context('creating a new member', function () {
      let memberId;

      beforeEach(async function () {
        ({ logs: this.logs } = await this.member.newMember(
          member,
          this.structure.mainColor,
          this.structure.backgroundColor,
          this.structure.borderColor,
          web3.fromUtf8(this.structure.data),
          this.structure.stackedTokens,
          { from: operator }
        )
        );

        memberId = await this.member.membersNumber();
      });

      it('emits a MemberAdded event', async function () {
        const newMembersNumber = await this.member.membersNumber();

        expectEvent.inLogs(this.logs, 'MemberAdded', {
          account: member,
          id: newMembersNumber,
        });
      });

      context('check properties', function () {
        describe('check isMember', function () {
          it('returns true', async function () {
            (await this.member.isMember(member)).should.be.equal(true);
          });
        });

        describe('members number', function () {
          it('should increase', async function () {
            const oldMembersNumber = await this.member.membersNumber();

            await this.member.newMember(
              anotherAccount,
              this.structure.mainColor,
              this.structure.backgroundColor,
              this.structure.borderColor,
              web3.fromUtf8(this.structure.data),
              this.structure.stackedTokens,
              { from: operator }
            );
            const newMembersNumber = await this.member.membersNumber();

            newMembersNumber.should.be.bignumber.equal(oldMembersNumber.add(1));
          });
        });
      });

      context('testing metadata', function () {
        context('check by id', function () {
          let memberStructure;

          beforeEach(async function () {
            memberStructure = await this.member.getMemberById(memberId);
          });

          describe('when member exists', function () {
            describe('check metadata', function () {
              it('has a member', async function () {
                const toCheck = memberStructure[0];
                toCheck.should.be.equal(member);
              });

              it('has an main color', async function () {
                const toCheck = memberStructure[1];
                assert.equal(web3.toUtf8(toCheck), this.structure.mainColor);
              });

              it('has an background color', async function () {
                const toCheck = memberStructure[2];
                assert.equal(web3.toUtf8(toCheck), this.structure.backgroundColor);
              });

              it('has an border color', async function () {
                const toCheck = memberStructure[3];
                assert.equal(web3.toUtf8(toCheck), this.structure.borderColor);
              });

              it('has a data value', async function () {
                const toCheck = memberStructure[4];
                assert.equal(web3.toUtf8(toCheck), this.structure.data);
              });

              it('has a stacked tokens value', async function () {
                const toCheck = memberStructure[5];
                toCheck.should.be.bignumber.equal(this.structure.stackedTokens);
              });

              it('has a creation date', async function () {
                const toCheck = memberStructure[6];
                toCheck.should.be.bignumber.equal(await time.latest());
              });
            });
          });
        });

        context('check by address', function () {
          let memberStructure;

          beforeEach(async function () {
            memberStructure = await this.member.getMemberByAddress(member);
          });

          describe('when member exists', function () {
            describe('check metadata', function () {
              it('has a member', async function () {
                const toCheck = memberStructure[0];
                toCheck.should.be.equal(member);
              });

              it('has an main color', async function () {
                const toCheck = memberStructure[1];
                assert.equal(web3.toUtf8(toCheck), this.structure.mainColor);
              });

              it('has an background color', async function () {
                const toCheck = memberStructure[2];
                assert.equal(web3.toUtf8(toCheck), this.structure.backgroundColor);
              });

              it('has an border color', async function () {
                const toCheck = memberStructure[3];
                assert.equal(web3.toUtf8(toCheck), this.structure.borderColor);
              });

              it('has a data value', async function () {
                const toCheck = memberStructure[4];
                assert.equal(web3.toUtf8(toCheck), this.structure.data);
              });

              it('has a stacked tokens value', async function () {
                const toCheck = memberStructure[5];
                toCheck.should.be.bignumber.equal(this.structure.stackedTokens);
              });

              it('has a creation date', async function () {
                const toCheck = memberStructure[6];
                toCheck.should.be.bignumber.equal(await time.latest());
              });
            });
          });
        });

        describe('when member does not exist', function () {
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
      });

      context('creating another member', function () {
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

      context('testing stake/unstake', function () {
        let memberStructure;

        describe('stake tokens', function () {
          const toStake = new BigNumber(1);

          describe('if an operator is calling', function () {
            describe('if user is member', function () {
              beforeEach(async function () {
                await this.member.stake(member, toStake, { from: operator });
                memberStructure = await this.member.getMemberByAddress(member);
              });

              it('should increase member staked tokens', async function () {
                memberStructure[5].should.be.bignumber.equal(this.structure.stackedTokens.add(toStake));
              });
            });

            describe('if user is not member', function () {
              it('reverts', async function () {
                await shouldFail.reverting(this.member.stake(anotherAccount, toStake, { from: operator }));
              });
            });
          });

          describe('if another account is calling', function () {
            it('reverts', async function () {
              await shouldFail.reverting(this.member.stake(member, toStake, { from: anotherAccount }));
            });
          });
        });

        describe('unstake tokens', function () {
          describe('if an operator is calling', function () {
            describe('if user is member', function () {
              describe('if member has enough staked token', function () {
                beforeEach(async function () {
                  await this.member.unstake(member, this.structure.stackedTokens, { from: operator });
                  memberStructure = await this.member.getMemberByAddress(member);
                });

                it('should decrease member staked tokens', async function () {
                  memberStructure[5].should.be.bignumber.equal(0);
                });
              });
              describe('if member has not enough staked token', function () {
                it('reverts', async function () {
                  await shouldFail.reverting(
                    this.member.unstake(member, this.structure.stackedTokens.add(1), { from: operator })
                  );
                });
              });
            });

            describe('if user is not member', function () {
              it('reverts', async function () {
                await shouldFail.reverting(
                  this.member.unstake(anotherAccount, this.structure.stackedTokens, { from: operator })
                );
              });
            });
          });

          describe('if another account is calling', function () {
            it('reverts', async function () {
              await shouldFail.reverting(
                this.member.unstake(member, this.structure.stackedTokens, { from: anotherAccount })
              );
            });
          });
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
