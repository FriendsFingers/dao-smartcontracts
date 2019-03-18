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
  const tokenBalance = new BN(10000);

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
        mainColor: '97168a',
        backgroundColor: 'ffffff',
        borderColor: 'fae596',
        data: JSON.stringify({ key: 'value' }),
        kyc: true,
        stackedTokens: new BN(5),
      };

      this.token = await ERC1363.new(creator, tokenBalance);
      this.notAcceptedToken = await ERC1363.new(creator, tokenBalance);

      this.memberContract = await DAOMember.new(this.token.address, { from: creator });
    });

    context('as an ERC1363Payable', function () {
      beforeEach(async function () {
        this.mock = this.memberContract;
      });

      describe('if a member is calling ERC1363 functions', function () {
        beforeEach(async function () {
          await this.mock.newMember(
            creator,
            web3.utils.utf8ToHex(this.structure.mainColor),
            web3.utils.utf8ToHex(this.structure.backgroundColor),
            web3.utils.utf8ToHex(this.structure.borderColor),
            web3.utils.utf8ToHex(this.structure.data),
            this.structure.kyc,
            this.structure.stackedTokens,
            { from: creator }
          );
        });

        shouldBehaveLikeERC1363Payable(DAOMember, [creator, spender], tokenBalance);
      });

      describe('if not a member is calling ERC1363 functions', function () {
        const value = tokenBalance;

        describe('via transferFromAndCall', function () {
          beforeEach(async function () {
            await this.token.approve(spender, value, { from: creator });
          });

          const transferFromAndCallWithData = function (from, to, value, opts) {
            return this.token.methods['transferFromAndCall(address,address,uint256,bytes)'](
              from, to, value, web3.utils.utf8ToHex(this.structure.data), opts
            );
          };

          const transferFromAndCallWithoutData = function (from, to, value, opts) {
            return this.token.methods['transferFromAndCall(address,address,uint256)'](from, to, value, opts);
          };

          it('reverts', async function () {
            await shouldFail.reverting(
              transferFromAndCallWithData.call(this, creator, this.mock.address, value, { from: spender })
            );
            await shouldFail.reverting(
              transferFromAndCallWithoutData.call(this, creator, this.mock.address, value, { from: spender })
            );
          });
        });

        describe('via transferAndCall', function () {
          const value = tokenBalance;

          const transferAndCallWithData = function (to, value, opts) {
            return this.token.methods['transferAndCall(address,uint256,bytes)'](
              to, value, web3.utils.utf8ToHex(this.structure.data), opts
            );
          };

          const transferAndCallWithoutData = function (to, value, opts) {
            return this.token.methods['transferAndCall(address,uint256)'](to, value, opts);
          };

          it('reverts', async function () {
            await shouldFail.reverting(
              transferAndCallWithData.call(this, this.mock.address, value, { from: creator })
            );
            await shouldFail.reverting(
              transferAndCallWithoutData.call(this, this.mock.address, value, { from: creator })
            );
          });
        });

        describe('via approveAndCall', function () {
          const approveAndCallWithData = function (spender, value, opts) {
            return this.token.methods['approveAndCall(address,uint256,bytes)'](
              spender, value, web3.utils.utf8ToHex(this.structure.data), opts
            );
          };

          const approveAndCallWithoutData = function (spender, value, opts) {
            return this.token.methods['approveAndCall(address,uint256)'](spender, value, opts);
          };

          it('reverts', async function () {
            await shouldFail.reverting(
              approveAndCallWithData.call(this, this.mock.address, value, { from: creator })
            );
            await shouldFail.reverting(
              approveAndCallWithoutData.call(this, this.mock.address, value, { from: creator })
            );
          });
        });
      });
    });

    context('testing DAOMember behaviors', function () {
      beforeEach(async function () {
        await this.memberContract.addOperator(operator, { from: creator });
      });

      context('creating a new member', function () {
        let memberId;

        beforeEach(async function () {
          ({ logs: this.logs } = await this.memberContract.newMember(
            member,
            web3.utils.utf8ToHex(this.structure.mainColor),
            web3.utils.utf8ToHex(this.structure.backgroundColor),
            web3.utils.utf8ToHex(this.structure.borderColor),
            web3.utils.utf8ToHex(this.structure.data),
            this.structure.kyc,
            this.structure.stackedTokens,
            { from: operator }
          )
          );

          memberId = await this.memberContract.membersNumber();
        });

        it('emits a MemberAdded event', async function () {
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

              await this.memberContract.newMember(
                anotherAccount,
                web3.utils.utf8ToHex(this.structure.mainColor),
                web3.utils.utf8ToHex(this.structure.backgroundColor),
                web3.utils.utf8ToHex(this.structure.borderColor),
                web3.utils.utf8ToHex(this.structure.data),
                this.structure.kyc,
                this.structure.stackedTokens,
                { from: operator }
              );
              const newMembersNumber = await this.memberContract.membersNumber();
              newMembersNumber.should.be.bignumber.equal(oldMembersNumber.add(new BN(1)));
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

                it('has an main color', async function () {
                  const toCheck = memberStructure[1];
                  assert.equal(web3.utils.hexToUtf8(toCheck), this.structure.mainColor);
                });

                it('has an background color', async function () {
                  const toCheck = memberStructure[2];
                  assert.equal(web3.utils.hexToUtf8(toCheck), this.structure.backgroundColor);
                });

                it('has an border color', async function () {
                  const toCheck = memberStructure[3];
                  assert.equal(web3.utils.hexToUtf8(toCheck), this.structure.borderColor);
                });

                it('has a data value', async function () {
                  const toCheck = memberStructure[4];
                  assert.equal(web3.utils.hexToUtf8(toCheck), this.structure.data);
                });

                it('has a kyc value', async function () {
                  const toCheck = memberStructure[5];
                  assert.equal(toCheck, this.structure.kyc);
                });

                it('has a stacked tokens value', async function () {
                  const toCheck = memberStructure[6];
                  toCheck.should.be.bignumber.equal(this.structure.stackedTokens);
                });

                it('has a creation date', async function () {
                  const toCheck = memberStructure[7];
                  toCheck.should.be.bignumber.equal(await time.latest());
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

                it('has an main color', async function () {
                  const toCheck = memberStructure[1];
                  assert.equal(web3.utils.hexToUtf8(toCheck), this.structure.mainColor);
                });

                it('has an background color', async function () {
                  const toCheck = memberStructure[2];
                  assert.equal(web3.utils.hexToUtf8(toCheck), this.structure.backgroundColor);
                });

                it('has an border color', async function () {
                  const toCheck = memberStructure[3];
                  assert.equal(web3.utils.hexToUtf8(toCheck), this.structure.borderColor);
                });

                it('has a data value', async function () {
                  const toCheck = memberStructure[4];
                  assert.equal(web3.utils.hexToUtf8(toCheck), this.structure.data);
                });

                it('has a kyc value', async function () {
                  const toCheck = memberStructure[5];
                  assert.equal(toCheck, this.structure.kyc);
                });

                it('has a stacked tokens value', async function () {
                  const toCheck = memberStructure[6];
                  toCheck.should.be.bignumber.equal(this.structure.stackedTokens);
                });

                it('has a creation date', async function () {
                  const toCheck = memberStructure[7];
                  toCheck.should.be.bignumber.equal(await time.latest());
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
              await shouldFail.reverting(
                this.memberContract.newMember(
                  member,
                  web3.utils.utf8ToHex(this.structure.mainColor),
                  web3.utils.utf8ToHex(this.structure.backgroundColor),
                  web3.utils.utf8ToHex(this.structure.borderColor),
                  web3.utils.utf8ToHex(this.structure.data),
                  this.structure.kyc,
                  this.structure.stackedTokens,
                  { from: operator }
                )
              );
            });
          });

          describe('if member is the zero address', function () {
            it('reverts', async function () {
              await shouldFail.reverting(
                this.memberContract.newMember(
                  ZERO_ADDRESS,
                  web3.utils.utf8ToHex(this.structure.mainColor),
                  web3.utils.utf8ToHex(this.structure.backgroundColor),
                  web3.utils.utf8ToHex(this.structure.borderColor),
                  web3.utils.utf8ToHex(this.structure.data),
                  this.structure.kyc,
                  this.structure.stackedTokens,
                  { from: operator }
                )
              );
            });
          });

          describe('if caller has not operator permission', function () {
            it('reverts', async function () {
              await shouldFail.reverting(
                this.memberContract.newMember(
                  anotherAccount,
                  web3.utils.utf8ToHex(this.structure.mainColor),
                  web3.utils.utf8ToHex(this.structure.backgroundColor),
                  web3.utils.utf8ToHex(this.structure.borderColor),
                  web3.utils.utf8ToHex(this.structure.data),
                  this.structure.kyc,
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
            const toStake = new BN(1);

            describe('if an operator is calling', function () {
              describe('if user is member', function () {
                let receipt;

                beforeEach(async function () {
                  receipt = await this.memberContract.stake(member, toStake, { from: operator });
                  memberStructure = await this.memberContract.getMemberByAddress(member);
                });

                it('should increase member staked tokens', async function () {
                  memberStructure[6].should.be.bignumber.equal(this.structure.stackedTokens.add(toStake));
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
              describe('if member has enough staked token', function () {
                let receipt;

                beforeEach(async function () {
                  receipt = await this.memberContract.unstake(
                    this.structure.stackedTokens,
                    { from: member }
                  );

                  memberStructure = await this.memberContract.getMemberByAddress(member);
                });

                it('should decrease member staked tokens', async function () {
                  memberStructure[6].should.be.bignumber.equal(new BN(0));
                });

                it('should emit StakedTokens', async function () {
                  await expectEvent.inTransaction(receipt.tx, DAOMember, 'UnstakedTokens', {
                    account: member,
                    value: this.structure.stackedTokens,
                  });
                });
              });

              describe('if member has not enough staked token', function () {
                it('reverts', async function () {
                  await shouldFail.reverting(
                    this.memberContract.unstake(
                      this.structure.stackedTokens.add(new BN(1)),
                      { from: operator }
                    )
                  );
                });
              });
            });

            describe('if user is not member', function () {
              it('reverts', async function () {
                await shouldFail.reverting(
                  this.memberContract.unstake(this.structure.stackedTokens, { from: anotherAccount })
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
