const { BN, constants, shouldFail, expectEvent, time } = require('openzeppelin-test-helpers');
const { ZERO_ADDRESS } = constants;

const { structDecode } = require('../utils/structDecode');

const { shouldBehaveLikeERC1363Payable } = require('../ERC1363/ERC1363Payable.behaviour');

const ERC20Mock = artifacts.require('ERC20Mock');
const ERC1363 = artifacts.require('ERC1363Mock');
const DAO = artifacts.require('DAOMock');

contract('DAO', function (
  [
    creator,
    operator,
    dapp,
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
        await shouldFail.reverting(DAO.new(ZERO_ADDRESS));
      });
    });

    describe('if token does not support ERC1363 interface', function () {
      it('reverts', async function () {
        const erc20Token = await ERC20Mock.new(creator, 0);
        await shouldFail.reverting(DAO.new(erc20Token.address));
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

      await this.token.mintMock(member, tokenBalance);

      this.dao = await DAO.new(this.token.address, { from: creator });

      await this.dao.addOperator(operator, { from: creator });
      await this.dao.addDapp(dapp, { from: operator });
    });

    it('should start with zero totalStakedTokens', async function () {
      (await this.dao.totalStakedTokens()).should.be.bignumber.equal(new BN(0));
    });

    it('should start with zero totalUsedTokens', async function () {
      (await this.dao.totalUsedTokens()).should.be.bignumber.equal(new BN(0));
    });

    it('should start with zero members', async function () {
      (await this.dao.membersNumber()).should.be.bignumber.equal(new BN(0));
    });

    context('creating members', function () {
      let memberId;

      beforeEach(async function () {
        ({ logs: this.logs } = await this.dao.newMember(member, { from: operator }));

        memberId = await this.dao.membersNumber();
      });

      it('should emit a MemberAdded event', async function () {
        const newMembersNumber = await this.dao.membersNumber();

        expectEvent.inLogs(this.logs, 'MemberAdded', {
          account: member,
          id: newMembersNumber,
        });
      });

      context('check properties', function () {
        describe('check isMember', function () {
          it('returns true', async function () {
            (await this.dao.isMember(member)).should.be.equal(true);
          });
        });

        describe('members number', function () {
          it('should increase', async function () {
            const oldMembersNumber = await this.dao.membersNumber();

            await this.dao.newMember(anotherAccount, { from: operator });

            const newMembersNumber = await this.dao.membersNumber();
            newMembersNumber.should.be.bignumber.equal(oldMembersNumber.addn(1));
          });
        });
      });

      context('testing metadata', function () {
        context('check by id', function () {
          let memberStructure;

          beforeEach(async function () {
            memberStructure = structDecode(await this.dao.getMemberById(memberId));
          });

          describe('when member exists', function () {
            describe('check metadata', function () {
              it('has an id', async function () {
                memberStructure.id.should.be.bignumber.equal(memberId);
              });

              it('has an account', async function () {
                memberStructure.account.should.be.equal(member);
              });

              it('has a fingerprint', async function () {
                const fingerprint = await this.dao.getFingerprint(member, memberId);

                assert.equal(memberStructure.fingerprint, fingerprint);
              });

              it('has a creation date', async function () {
                memberStructure.creationDate.should.be.bignumber.equal(await time.latest());
              });

              it('has a staked tokens value', async function () {
                memberStructure.stakedTokens.should.be.bignumber.equal(new BN(0));
              });

              it('has a used tokens value', async function () {
                memberStructure.usedTokens.should.be.bignumber.equal(new BN(0));
              });

              it('has a data value', async function () {
                assert.equal(web3.utils.hexToUtf8(memberStructure.data), '');
              });

              it('has a approved value', async function () {
                assert.equal(memberStructure.approved, false);
              });

              describe('set approved', function () {
                describe('from operator', function () {
                  describe('setting true', function () {
                    beforeEach(async function () {
                      ({ logs: this.logs } = await this.dao.setApproved(member, true, { from: operator }));
                    });

                    it('succeed', async function () {
                      memberStructure = structDecode(await this.dao.getMemberById(memberId));

                      assert.equal(memberStructure.approved, true);
                    });

                    it('emit MemberStatusChanged event', async function () {
                      expectEvent.inLogs(this.logs, 'MemberStatusChanged', {
                        account: member,
                        approved: true,
                      });
                    });
                  });

                  describe('setting false', function () {
                    beforeEach(async function () {
                      await this.dao.setApproved(member, true, { from: operator });

                      ({ logs: this.logs } = await this.dao.setApproved(member, false, { from: operator }));
                    });

                    it('succeed', async function () {
                      memberStructure = structDecode(await this.dao.getMemberById(memberId));

                      assert.equal(memberStructure.approved, false);
                    });

                    it('emit MemberStatusChanged event', async function () {
                      expectEvent.inLogs(this.logs, 'MemberStatusChanged', {
                        account: member,
                        approved: false,
                      });
                    });
                  });
                });

                describe('from another account', function () {
                  it('reverts', async function () {
                    await shouldFail.reverting(this.dao.setApproved(member, true, { from: anotherAccount }));
                  });
                });
              });

              describe('set data', function () {
                describe('from operator', function () {
                  it('succeed', async function () {
                    await this.dao.setData(member, web3.utils.utf8ToHex(this.structure.data), { from: operator });

                    memberStructure = structDecode(await this.dao.getMemberById(memberId));

                    assert.equal(web3.utils.hexToUtf8(memberStructure.data), this.structure.data);
                  });
                });

                describe('from another account', function () {
                  it('reverts', async function () {
                    await shouldFail.reverting(
                      this.dao.setData(member, web3.utils.utf8ToHex(this.structure.data), { from: anotherAccount })
                    );
                  });
                });
              });
            });
          });
        });

        context('check by address', function () {
          let memberStructure;

          beforeEach(async function () {
            memberStructure = structDecode(await this.dao.getMemberByAddress(member));
          });

          describe('when member exists', function () {
            describe('check metadata', function () {
              it('has an id', async function () {
                memberStructure.id.should.be.bignumber.equal(memberId);
              });

              it('has an account', async function () {
                memberStructure.account.should.be.equal(member);
              });

              it('has a fingerprint', async function () {
                const fingerprint = await this.dao.getFingerprint(member, memberId);

                assert.equal(memberStructure.fingerprint, fingerprint);
              });

              it('has a creation date', async function () {
                memberStructure.creationDate.should.be.bignumber.equal(await time.latest());

                (await this.dao.creationDateOf(member)).should.be.bignumber.equal(await time.latest());
              });

              it('has a staked tokens value', async function () {
                memberStructure.stakedTokens.should.be.bignumber.equal(new BN(0));

                (await this.dao.stakedTokensOf(member)).should.be.bignumber.equal(new BN(0));
              });

              it('has a used tokens value', async function () {
                memberStructure.usedTokens.should.be.bignumber.equal(new BN(0));

                (await this.dao.usedTokensOf(member)).should.be.bignumber.equal(new BN(0));
              });

              it('has a data value', async function () {
                assert.equal(web3.utils.hexToUtf8(memberStructure.data), '');
              });

              it('has a approved value', async function () {
                assert.equal(memberStructure.approved, false);

                (await this.dao.isApproved(member)).should.be.equal(false);
              });
            });
          });
        });

        context('when member does not exist', function () {
          describe('check metadata', function () {
            it('reverts using id', async function () {
              await shouldFail.reverting(this.dao.getMemberById(999));
            });

            it('reverts using address', async function () {
              await shouldFail.reverting(this.dao.getMemberByAddress(anotherAccount));
            });
          });

          describe('check isMember', function () {
            it('returns false', async function () {
              (await this.dao.isMember(anotherAccount)).should.be.equal(false);
            });
          });

          describe('check creationDateOf', function () {
            it('should be zero', async function () {
              (await this.dao.creationDateOf(anotherAccount)).should.be.bignumber.equal(new BN(0));
            });
          });

          describe('check stakedTokensOf', function () {
            it('should be zero', async function () {
              (await this.dao.stakedTokensOf(anotherAccount)).should.be.bignumber.equal(new BN(0));
            });
          });

          describe('check usedTokensOf', function () {
            it('should be zero', async function () {
              (await this.dao.usedTokensOf(anotherAccount)).should.be.bignumber.equal(new BN(0));
            });
          });

          describe('check isApproved', function () {
            it('should be false', async function () {
              (await this.dao.isApproved(anotherAccount)).should.be.equal(false);
            });
          });
        });
      });

      context('creating another member', function () {
        context('via newMember function', function () {
          describe('if not an operator is calling', function () {
            it('reverts', async function () {
              await shouldFail.reverting(this.dao.newMember(anotherAccount, { from: anotherAccount }));
            });
          });

          describe('if member already exists', function () {
            it('reverts', async function () {
              await shouldFail.reverting(this.dao.newMember(member, { from: operator }));
            });
          });

          describe('if member is the zero address', function () {
            it('reverts', async function () {
              await shouldFail.reverting(this.dao.newMember(ZERO_ADDRESS, { from: operator }));
            });
          });
        });

        context('via fallback function', function () {
          describe('if sending more than 0', function () {
            it('reverts', async function () {
              await shouldFail.reverting(this.dao.sendTransaction({ value: 1, from: anotherAccount }));
            });
          });

          describe('if sending 0', function () {
            describe('if member already exists', function () {
              it('reverts', async function () {
                await shouldFail.reverting(this.dao.sendTransaction({ value: 0, from: member }));
              });
            });

            describe('if member does not exist', function () {
              it('success and emit MemberAdded event', async function () {
                ({ logs: this.logs } = await this.dao.sendTransaction({ value: 0, from: anotherAccount }));

                const newMembersNumber = await this.dao.membersNumber();

                expectEvent.inLogs(this.logs, 'MemberAdded', {
                  account: anotherAccount,
                  id: newMembersNumber,
                });
              });
            });
          });
        });
      });

      context('testing stake/unstake/use', function () {
        describe('stake tokens', function () {
          let tokenAmount;
          let receipt;

          let preMemberStructure;
          let preStakedTokens;

          beforeEach(async function () {
            tokenAmount = this.structure.stakedTokens;

            preMemberStructure = structDecode(await this.dao.getMemberByAddress(member));
            preStakedTokens = await this.dao.totalStakedTokens();

            receipt = await this.dao.stake(member, tokenAmount, { from: operator });
          });

          describe('if user is not member', function () {
            it('should emit a MemberAdded event', async function () {
              const newMembersNumber = await this.dao.membersNumber();

              expectEvent.inLogs(this.logs, 'MemberAdded', {
                account: member,
                id: newMembersNumber,
              });
            });
          });

          it('should increase member staked tokens', async function () {
            const memberStructure = structDecode(await this.dao.getMemberByAddress(member));
            memberStructure.stakedTokens.should.be.bignumber.equal(preMemberStructure.stakedTokens.add(tokenAmount));

            (await this.dao.stakedTokensOf(member)).should.be.bignumber.equal(
              preMemberStructure.stakedTokens.add(tokenAmount)
            );
          });

          it('should increase total staked tokens', async function () {
            (await this.dao.totalStakedTokens()).should.be.bignumber.equal(
              preStakedTokens.add(tokenAmount)
            );
          });

          it('should emit TokensStaked', async function () {
            await expectEvent.inTransaction(receipt.tx, DAO, 'TokensStaked', {
              account: member,
              value: tokenAmount,
            });
          });
        });

        describe('unstake tokens', function () {
          let tokenAmount;

          beforeEach(async function () {
            tokenAmount = this.structure.stakedTokens;

            await this.dao.stake(member, tokenAmount, { from: operator });

            // the below call is because of staking by ERC1363 functions implies
            // a transfer of tokens but we are using stake mock
            await this.token.transfer(this.dao.address, tokenAmount, { from: member });
          });

          describe('if user is member', function () {
            describe('if member has enough staked token', function () {
              let receipt;

              let preMemberStructure;
              let preStakedTokens;
              let contractPreBalance;
              let accountPreBalance;

              beforeEach(async function () {
                preMemberStructure = structDecode(await this.dao.getMemberByAddress(member));
                preStakedTokens = await this.dao.totalStakedTokens();
                contractPreBalance = await this.token.balanceOf(this.dao.address);
                accountPreBalance = await this.token.balanceOf(member);

                receipt = await this.dao.unstake(
                  tokenAmount,
                  { from: member }
                );
              });

              it('should decrease member staked tokens', async function () {
                const memberStructure = structDecode(await this.dao.getMemberByAddress(member));
                memberStructure.stakedTokens.should.be.bignumber.equal(
                  preMemberStructure.stakedTokens.sub(tokenAmount)
                );

                (await this.dao.stakedTokensOf(member)).should.be.bignumber.equal(
                  preMemberStructure.stakedTokens.sub(tokenAmount)
                );
              });

              it('should decrease total staked tokens', async function () {
                (await this.dao.totalStakedTokens()).should.be.bignumber.equal(
                  preStakedTokens.sub(tokenAmount)
                );
              });

              it('should decrease contract token balance', async function () {
                (await this.token.balanceOf(this.dao.address)).should.be.bignumber.equal(
                  contractPreBalance.sub(tokenAmount)
                );
              });

              it('should increase account token balance', async function () {
                (await this.token.balanceOf(member)).should.be.bignumber.equal(
                  accountPreBalance.add(tokenAmount)
                );
              });

              it('should emit TokensUnstaked', async function () {
                await expectEvent.inTransaction(receipt.tx, DAO, 'TokensUnstaked', {
                  account: member,
                  value: tokenAmount,
                });
              });
            });

            describe('if member has not enough staked token', function () {
              it('reverts', async function () {
                await shouldFail.reverting(
                  this.dao.unstake(
                    tokenAmount.addn(1),
                    { from: member }
                  )
                );
              });
            });
          });

          describe('if user is not member', function () {
            it('reverts', async function () {
              await shouldFail.reverting(this.dao.unstake(tokenAmount, { from: anotherAccount }));
            });
          });
        });

        describe('use tokens', function () {
          let tokenAmount;

          beforeEach(async function () {
            tokenAmount = this.structure.stakedTokens;

            await this.dao.stake(member, tokenAmount, { from: operator });

            // the below call is because of staking by ERC1363 functions implies
            // a transfer of tokens but we are using stake mock
            await this.token.transfer(this.dao.address, tokenAmount, { from: member });
          });

          describe('if user is member', function () {
            describe('if member has enough staked token', function () {
              describe('if not a dapp is calling', function () {
                it('reverts', async function () {
                  await shouldFail.reverting(this.dao.use(member, tokenAmount, { from: creator }));
                  await shouldFail.reverting(this.dao.use(member, tokenAmount, { from: operator }));
                  await shouldFail.reverting(this.dao.use(member, tokenAmount, { from: member }));
                  await shouldFail.reverting(this.dao.use(member, tokenAmount, { from: anotherAccount }));
                });
              });

              describe('if a dapp is calling', function () {
                let receipt;

                let preMemberStructure;
                let preStakedTokens;
                let preUsedTokens;
                let contractPreBalance;
                let dappPreBalance;

                beforeEach(async function () {
                  preMemberStructure = structDecode(await this.dao.getMemberByAddress(member));
                  preStakedTokens = await this.dao.totalStakedTokens();
                  preUsedTokens = await this.dao.totalUsedTokens();
                  contractPreBalance = await this.token.balanceOf(this.dao.address);
                  dappPreBalance = await this.token.balanceOf(dapp);

                  receipt = await this.dao.use(
                    member,
                    tokenAmount,
                    { from: dapp }
                  );
                });

                it('should decrease member staked tokens', async function () {
                  const memberStructure = structDecode(await this.dao.getMemberByAddress(member));
                  memberStructure.stakedTokens.should.be.bignumber.equal(
                    preMemberStructure.stakedTokens.sub(tokenAmount)
                  );

                  (await this.dao.stakedTokensOf(member)).should.be.bignumber.equal(
                    preMemberStructure.stakedTokens.sub(tokenAmount)
                  );
                });

                it('should decrease total staked tokens', async function () {
                  (await this.dao.totalStakedTokens()).should.be.bignumber.equal(
                    preStakedTokens.sub(tokenAmount)
                  );
                });

                it('should increase member used tokens', async function () {
                  const memberStructure = structDecode(await this.dao.getMemberByAddress(member));
                  memberStructure.usedTokens.should.be.bignumber.equal(
                    preMemberStructure.usedTokens.add(tokenAmount)
                  );

                  (await this.dao.usedTokensOf(member)).should.be.bignumber.equal(
                    preMemberStructure.usedTokens.add(tokenAmount)
                  );
                });

                it('should increase total used tokens', async function () {
                  (await this.dao.totalUsedTokens()).should.be.bignumber.equal(
                    preUsedTokens.add(tokenAmount)
                  );
                });

                it('should decrease contract token balance', async function () {
                  (await this.token.balanceOf(this.dao.address)).should.be.bignumber.equal(
                    contractPreBalance.sub(tokenAmount)
                  );
                });

                it('should increase dapp token balance', async function () {
                  (await this.token.balanceOf(dapp)).should.be.bignumber.equal(
                    dappPreBalance.add(tokenAmount)
                  );
                });

                it('should emit TokensUsed', async function () {
                  await expectEvent.inTransaction(receipt.tx, DAO, 'TokensUsed', {
                    account: member,
                    dapp: dapp,
                    value: tokenAmount,
                  });
                });
              });
            });

            describe('if member has not enough staked token', function () {
              it('reverts', async function () {
                await shouldFail.reverting(
                  this.dao.use(
                    member,
                    tokenAmount.addn(1),
                    { from: dapp }
                  )
                );
              });
            });
          });

          describe('if user is not member', function () {
            it('reverts', async function () {
              await shouldFail.reverting(
                this.dao.use(anotherAccount, tokenAmount, { from: dapp })
              );
            });
          });
        });
      });
    });

    context('as an ERC1363Payable', function () {
      context('if a member is calling ERC1363 functions', function () {
        beforeEach(async function () {
          this.mock = this.dao;

          await this.mock.newMember(creator, { from: operator });
        });

        shouldBehaveLikeERC1363Payable(DAO, [creator, spender], tokenBalance);
      });

      context('if not a member is calling ERC1363 functions', function () {
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
                this, member, this.dao.address, value, { from: spender }
              );
              memberStructure = structDecode(await this.dao.getMemberByAddress(member));
            });

            describe('check isMember', function () {
              it('returns true', async function () {
                (await this.dao.isMember(member)).should.be.equal(true);
              });
            });

            describe('check stacked tokens', function () {
              it('should be equal to sent tokens', async function () {
                memberStructure.stakedTokens.should.be.bignumber.equal(value);

                (await this.dao.stakedTokensOf(member)).should.be.bignumber.equal(value);
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
              await transferAndCallWithData.call(this, this.dao.address, value, { from: member });
              memberStructure = structDecode(await this.dao.getMemberByAddress(member));
            });

            describe('check isMember', function () {
              it('returns true', async function () {
                (await this.dao.isMember(member)).should.be.equal(true);
              });
            });

            describe('check stacked tokens', function () {
              it('should be equal to sent tokens', async function () {
                memberStructure.stakedTokens.should.be.bignumber.equal(value);

                (await this.dao.stakedTokensOf(member)).should.be.bignumber.equal(value);
              });
            });

            describe('check creationDateOf', function () {
              it('should be latest time', async function () {
                (await this.dao.creationDateOf(member)).should.be.bignumber.equal(await time.latest());
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
              await approveAndCallWithData.call(this, this.dao.address, value, { from: member });
              memberStructure = structDecode(await this.dao.getMemberByAddress(member));
            });

            describe('check isMember', function () {
              it('returns true', async function () {
                (await this.dao.isMember(member)).should.be.equal(true);
              });
            });

            describe('check stacked tokens', function () {
              it('should be equal to sent tokens', async function () {
                memberStructure.stakedTokens.should.be.bignumber.equal(value);

                (await this.dao.stakedTokensOf(member)).should.be.bignumber.equal(value);
              });
            });
          });
        });
      });
    });

    context('as a recoverable token contract', function () {
      describe('recoverERC20', function () {
        const amount = new BN(100);

        describe('if it is the accepted payable token', function () {
          beforeEach(async function () {
            await this.token.mintMock(this.dao.address, amount);
            await this.token.transferAndCall(this.dao.address, tokenBalance, { from: member });
          });

          describe('if owner is calling', function () {
            describe('if there are more than total staked tokens', function () {
              it('should recover any ERC20', async function () {
                const preCreatorBalance = await this.token.balanceOf(creator);
                const preContractBalance = await this.token.balanceOf(this.dao.address);

                await this.dao.recoverERC20(this.token.address, amount, { from: creator });

                const postCreatorBalance = await this.token.balanceOf(creator);
                const postContractBalance = await this.token.balanceOf(this.dao.address);

                postCreatorBalance.should.be.bignumber.equal(preCreatorBalance.add(amount));
                postContractBalance.should.be.bignumber.equal(preContractBalance.sub(amount));
              });
            });

            describe('if there are not more than total staked tokens', function () {
              it('reverts', async function () {
                await shouldFail.reverting(
                  this.dao.recoverERC20(this.token.address, amount.addn(1), { from: creator })
                );
              });
            });
          });

          describe('if third party is calling', function () {
            it('reverts', async function () {
              await shouldFail.reverting(
                this.dao.recoverERC20(this.token.address, amount, { from: anotherAccount })
              );
            });
          });
        });

        describe('if it is not the accepted payable token', function () {
          beforeEach(async function () {
            this.anotherERC20 = await ERC20Mock.new(this.dao.address, amount, { from: creator });
          });

          describe('if owner is calling', function () {
            it('should recover token', async function () {
              const preCreatorBalance = await this.anotherERC20.balanceOf(creator);

              await this.dao.recoverERC20(this.anotherERC20.address, amount, { from: creator });

              const postCreatorBalance = await this.anotherERC20.balanceOf(creator);
              const postContractBalance = await this.anotherERC20.balanceOf(this.dao.address);

              postCreatorBalance.should.be.bignumber.equal(preCreatorBalance.add(amount));
              postContractBalance.should.be.bignumber.equal(new BN(0));
            });
          });

          describe('if third party is calling', function () {
            it('reverts', async function () {
              await shouldFail.reverting(
                this.dao.recoverERC20(this.anotherERC20.address, amount, { from: anotherAccount })
              );
            });
          });
        });
      });
    });
  });
});
