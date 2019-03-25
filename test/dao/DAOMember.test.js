const { BN, constants, shouldFail, expectEvent, time } = require('openzeppelin-test-helpers');
const { ZERO_ADDRESS } = constants;

const { shouldBehaveLikeTokenRecover } = require('eth-token-recover/test/TokenRecover.behaviour');
const { shouldBehaveLikeERC1363Payable } = require('../ERC1363/ERC1363Payable.behaviour');
const { shouldBehaveLikeRemoveRole } = require('../access/roles/RemoveRole.behavior');

const ERC20 = artifacts.require('ERC20');
const ERC1363 = artifacts.require('ERC1363Mock');
const DAOMember = artifacts.require('DAOMemberMock');

contract('DAOMember', function (
  [
    creator,
    operator,
    member,
    spender,
    anotherAccount,
    ...accounts
  ]
) {
  const tokenBalance = new BN(20000);

  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
    await time.advanceBlock();
  });

  context('if invalid constructor', function () {
    describe('if accepted token is the zero address', function () {
      it('reverts', async function () {
        await shouldFail.reverting(DAOMember.new(ZERO_ADDRESS));
      });
    });

    describe('if token does not support ERC1363 interface', function () {
      it('reverts', async function () {
        const erc20Token = await ERC20.new();
        await shouldFail.reverting(DAOMember.new(erc20Token.address));
      });
    });
  });

  context('if valid constructor', function () {
    beforeEach(async function () {
      this.structure = {
        data: JSON.stringify({ key: 'value' }),
        stakedTokens: new BN(5),
      };

      this.token = await ERC1363.new(creator, tokenBalance);
      this.notAcceptedToken = await ERC1363.new(creator, tokenBalance);

      await this.token.mintMock(tokenBalance, { from: member });

      this.memberContract = await DAOMember.new(this.token.address, { from: creator });
    });

    context('as an ERC1363Payable', function () {
      beforeEach(async function () {
        this.mock = this.memberContract;
      });

      describe('if a member is calling ERC1363 functions', function () {
        beforeEach(async function () {
          await this.mock.newMember(creator, { from: creator });
        });

        shouldBehaveLikeERC1363Payable(DAOMember, [creator, spender], tokenBalance);
      });

      describe('if not a member is calling ERC1363 functions', function () {
        const value = tokenBalance;

        describe('via transferFromAndCall', function () {
          beforeEach(async function () {
            await this.token.approve(spender, value, { from: member });
          });

          const transferFromAndCallWithData = function (from, to, value, opts) {
            return this.token.methods['transferFromAndCall(address,address,uint256,bytes)'](
              from, to, value, web3.utils.utf8ToHex(this.structure.data), opts
            );
          };

          describe('should add a member', function () {
            let memberStructure;

            beforeEach(async function () {
              await transferFromAndCallWithData.call(
                this, member, this.memberContract.address, value, { from: spender }
              );
              memberStructure = await this.memberContract.getMemberByAddress(member);
            });

            describe('check isMember', function () {
              it('returns true', async function () {
                (await this.memberContract.isMember(member)).should.be.equal(true);
              });
            });

            describe('check stacked tokens', function () {
              it('should be equal to sent tokens', async function () {
                memberStructure[3].should.be.bignumber.equal(value);
              });
            });
          });
        });

        describe('via transferAndCall', function () {
          const value = tokenBalance;

          const transferAndCallWithData = function (to, value, opts) {
            return this.token.methods['transferAndCall(address,uint256,bytes)'](
              to, value, web3.utils.utf8ToHex(this.structure.data), opts
            );
          };

          describe('should add a member', function () {
            let memberStructure;

            beforeEach(async function () {
              await transferAndCallWithData.call(this, this.memberContract.address, value, { from: member });
              memberStructure = await this.memberContract.getMemberByAddress(member);
            });

            describe('check isMember', function () {
              it('returns true', async function () {
                (await this.memberContract.isMember(member)).should.be.equal(true);
              });
            });

            describe('check stacked tokens', function () {
              it('should be equal to sent tokens', async function () {
                memberStructure[3].should.be.bignumber.equal(value);
              });
            });
          });
        });

        describe('via approveAndCall', function () {
          const approveAndCallWithData = function (spender, value, opts) {
            return this.token.methods['approveAndCall(address,uint256,bytes)'](
              spender, value, web3.utils.utf8ToHex(this.structure.data), opts
            );
          };

          describe('should add a member', function () {
            let memberStructure;

            beforeEach(async function () {
              await approveAndCallWithData.call(this, this.memberContract.address, value, { from: member });
              memberStructure = await this.memberContract.getMemberByAddress(member);
            });

            describe('check isMember', function () {
              it('returns true', async function () {
                (await this.memberContract.isMember(member)).should.be.equal(true);
              });
            });

            describe('check stacked tokens', function () {
              it('should be equal to sent tokens', async function () {
                memberStructure[3].should.be.bignumber.equal(value);
              });
            });
          });
        });
      });
    });

    context('testing DAOMember behaviors', function () {
      beforeEach(async function () {
        await this.memberContract.addOperator(operator, { from: creator });
      });

      it('should start with zero totalStakedTokens', async function () {
        (await this.memberContract.totalStakedTokens()).should.be.bignumber.equal(new BN(0));
      });

      context('creating a new member', function () {
        let memberId;

        beforeEach(async function () {
          ({ logs: this.logs } = await this.memberContract.newMember(member, { from: operator }));

          memberId = await this.memberContract.membersNumber();
        });

        it('should emit a MemberAdded event', async function () {
          const newMembersNumber = await this.memberContract.membersNumber();

          expectEvent.inLogs(this.logs, 'MemberAdded', {
            account: member,
            id: newMembersNumber,
          });
        });

        context('check properties', function () {
          describe('check isMember', function () {
            it('returns true', async function () {
              (await this.memberContract.isMember(member)).should.be.equal(true);
            });
          });

          describe('members number', function () {
            it('should increase', async function () {
              const oldMembersNumber = await this.memberContract.membersNumber();

              await this.memberContract.newMember(anotherAccount, { from: operator });

              const newMembersNumber = await this.memberContract.membersNumber();
              newMembersNumber.should.be.bignumber.equal(oldMembersNumber.addn(1));
            });
          });
        });

        context('testing metadata', function () {
          context('check by id', function () {
            let memberStructure;

            beforeEach(async function () {
              memberStructure = await this.memberContract.getMemberById(memberId);
            });

            describe('when member exists', function () {
              describe('check metadata', function () {
                it('has a member', async function () {
                  const toCheck = memberStructure[0];
                  toCheck.should.be.equal(member);
                });

                it('has a fingerprint', async function () {
                  const fingerprint = await this.memberContract.getFingerprint(member, memberId);

                  const toCheck = memberStructure[1];
                  assert.equal(toCheck, fingerprint);
                });

                it('has a creation date', async function () {
                  const toCheck = memberStructure[2];
                  toCheck.should.be.bignumber.equal(await time.latest());
                });

                it('has a staked tokens value', async function () {
                  const toCheck = memberStructure[3];
                  toCheck.should.be.bignumber.equal(new BN(0));
                });

                it('has a data value', async function () {
                  const toCheck = memberStructure[4];
                  assert.equal(web3.utils.hexToUtf8(toCheck), '');
                });

                it('has a kyc value', async function () {
                  const toCheck = memberStructure[5];
                  assert.equal(toCheck, false);
                });
              });
            });
          });

          context('check by address', function () {
            let memberStructure;

            beforeEach(async function () {
              memberStructure = await this.memberContract.getMemberByAddress(member);
            });

            describe('when member exists', function () {
              describe('check metadata', function () {
                it('has a member', async function () {
                  const toCheck = memberStructure[0];
                  toCheck.should.be.equal(member);
                });

                it('has a fingerprint', async function () {
                  const fingerprint = await this.memberContract.getFingerprint(member, memberId);

                  const toCheck = memberStructure[1];
                  assert.equal(toCheck, fingerprint);
                });

                it('has a creation date', async function () {
                  const toCheck = memberStructure[2];
                  toCheck.should.be.bignumber.equal(await time.latest());
                });

                it('has a staked tokens value', async function () {
                  const toCheck = memberStructure[3];
                  toCheck.should.be.bignumber.equal(new BN(0));
                });

                it('has a data value', async function () {
                  const toCheck = memberStructure[4];
                  assert.equal(web3.utils.hexToUtf8(toCheck), '');
                });

                it('has a kyc value', async function () {
                  const toCheck = memberStructure[5];
                  assert.equal(toCheck, false);
                });
              });
            });
          });

          describe('when member does not exist', function () {
            describe('check metadata', function () {
              it('reverts using id', async function () {
                await shouldFail.reverting(this.memberContract.getMemberById(999));
              });

              it('reverts using address', async function () {
                await shouldFail.reverting(this.memberContract.getMemberByAddress(anotherAccount));
              });
            });

            describe('check isMember', function () {
              it('returns false', async function () {
                (await this.memberContract.isMember(anotherAccount)).should.be.equal(false);
              });
            });
          });
        });

        context('creating another member', function () {
          describe('if member already exists', function () {
            it('reverts', async function () {
              await shouldFail.reverting(this.memberContract.newMember(member, { from: operator }));
            });
          });

          describe('if member is the zero address', function () {
            it('reverts', async function () {
              await shouldFail.reverting(this.memberContract.newMember(ZERO_ADDRESS, { from: operator }));
            });
          });

          describe('if caller has not operator permission', function () {
            it('reverts', async function () {
              await shouldFail.reverting(this.memberContract.newMember(anotherAccount, { from: anotherAccount }));
            });
          });
        });

        context('testing stake/unstake', function () {
          let memberStructure;

          describe('stake tokens', function () {
            const toStake = new BN(1);

            describe('if an operator is calling', function () {
              describe('if user is member', function () {
                let receipt;

                beforeEach(async function () {
                  receipt = await this.memberContract.stake(member, toStake, { from: operator });
                  memberStructure = await this.memberContract.getMemberByAddress(member);
                });

                it('should increase member staked tokens', async function () {
                  memberStructure[3].should.be.bignumber.equal(toStake);
                });

                it('should increase total staked tokens', async function () {
                  (await this.memberContract.totalStakedTokens())
                    .should.be.bignumber.equal(toStake);
                });

                it('should emit StakedTokens', async function () {
                  await expectEvent.inTransaction(receipt.tx, DAOMember, 'StakedTokens', {
                    account: member,
                    value: toStake,
                  });
                });
              });

              describe('if user is not member', function () {
                it('reverts', async function () {
                  await shouldFail.reverting(this.memberContract.stake(anotherAccount, toStake, { from: operator }));
                });
              });
            });

            describe('if another account is calling', function () {
              it('reverts', async function () {
                await shouldFail.reverting(this.memberContract.stake(member, toStake, { from: anotherAccount }));
              });
            });
          });

          describe('unstake tokens', function () {
            describe('if user is member', function () {
              beforeEach(async function () {
                await this.memberContract.stake(member, this.structure.stakedTokens, { from: operator });
              });

              describe('if member has enough staked token', function () {
                let receipt;

                beforeEach(async function () {
                  receipt = await this.memberContract.unstake(
                    this.structure.stakedTokens,
                    { from: member }
                  );

                  memberStructure = await this.memberContract.getMemberByAddress(member);
                });

                it('should decrease member staked tokens', async function () {
                  memberStructure[3].should.be.bignumber.equal(new BN(0));
                });

                it('should decrease total staked tokens', async function () {
                  (await this.memberContract.totalStakedTokens()).should.be.bignumber.equal(new BN(0));
                });

                it('should emit UnstakedTokens', async function () {
                  await expectEvent.inTransaction(receipt.tx, DAOMember, 'UnstakedTokens', {
                    account: member,
                    value: this.structure.stakedTokens,
                  });
                });
              });

              describe('if member has not enough staked token', function () {
                it('reverts', async function () {
                  await shouldFail.reverting(
                    this.memberContract.unstake(
                      this.structure.stakedTokens.addn(1),
                      { from: member }
                    )
                  );
                });
              });
            });

            describe('if user is not member', function () {
              it('reverts', async function () {
                await shouldFail.reverting(
                  this.memberContract.unstake(this.structure.stakedTokens, { from: anotherAccount })
                );
              });
            });
          });
        });
      });

      context('testing roles', function () {
        beforeEach(async function () {
          this.contract = this.memberContract;
        });

        context('testing remove roles', function () {
          beforeEach(async function () {
            this.contract = this.memberContract;
          });

          shouldBehaveLikeRemoveRole(creator, operator, [anotherAccount], 'operator');
        });
      });
    });

    context('like a TokenRecover', function () {
      beforeEach(async function () {
        this.instance = this.memberContract;
      });

      shouldBehaveLikeTokenRecover([creator, anotherAccount]);
    });
  });
});
