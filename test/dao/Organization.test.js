const { BN, constants, shouldFail, time } = require('openzeppelin-test-helpers');
const { ZERO_ADDRESS } = constants;

const { structDecode } = require('../utils/structDecode');

const Organization = artifacts.require('OrganizationMock');

contract('Organization', function (
  [
    creator,
    operator,
    member,
    spender,
    anotherAccount,
    ...accounts
  ]
) {
  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
    await time.advanceBlock();
  });

  context('once deployed', function () {
    beforeEach(async function () {
      this.organization = await Organization.new({ from: creator });
    });

    it('should start with zero totalStakedTokens', async function () {
      (await this.organization.totalStakedTokens()).should.be.bignumber.equal(new BN(0));
    });

    it('should start with zero totalUsedTokens', async function () {
      (await this.organization.totalUsedTokens()).should.be.bignumber.equal(new BN(0));
    });

    it('should start with zero members', async function () {
      (await this.organization.membersNumber()).should.be.bignumber.equal(new BN(0));
    });

    context('creating a new member', function () {
      let memberId;

      beforeEach(async function () {
        await this.organization.addMember(member, { from: operator });

        memberId = await this.organization.membersNumber();
      });

      context('check properties', function () {
        describe('check isMember', function () {
          it('returns true', async function () {
            (await this.organization.isMember(member)).should.be.equal(true);
          });
        });

        describe('members number', function () {
          it('should increase', async function () {
            const oldMembersNumber = await this.organization.membersNumber();

            await this.organization.addMember(anotherAccount, { from: operator });

            const newMembersNumber = await this.organization.membersNumber();
            newMembersNumber.should.be.bignumber.equal(oldMembersNumber.addn(1));
          });
        });
      });

      context('testing metadata', function () {
        let memberStructure;

        beforeEach(async function () {
          memberStructure = structDecode(await this.organization.getMember(memberId));
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
              const fingerprint = await this.organization.getFingerprint(member, memberId);

              assert.equal(memberStructure.fingerprint, fingerprint);
            });

            it('has a creation date', async function () {
              memberStructure.creationDate.should.be.bignumber.equal(await time.latest());

              (await this.organization.creationDateOf(member)).should.be.bignumber.equal(await time.latest());
            });

            it('has a staked tokens value', async function () {
              memberStructure.stakedTokens.should.be.bignumber.equal(new BN(0));

              (await this.organization.stakedTokensOf(member)).should.be.bignumber.equal(new BN(0));
            });

            it('has a used tokens value', async function () {
              memberStructure.usedTokens.should.be.bignumber.equal(new BN(0));

              (await this.organization.usedTokensOf(member)).should.be.bignumber.equal(new BN(0));
            });

            it('has a data value', async function () {
              assert.equal(web3.utils.hexToUtf8(memberStructure.data), '');
            });

            it('has a approved value', async function () {
              assert.equal(memberStructure.approved, false);

              (await this.organization.isApproved(member)).should.be.equal(false);
            });

            describe('set approved', function () {
              it('setting true, succeed', async function () {
                await this.organization.setApproved(member, true);

                memberStructure = structDecode(await this.organization.getMember(memberId));

                assert.equal(memberStructure.approved, true);
              });

              it('setting false, succeed', async function () {
                await this.organization.setApproved(member, true);
                await this.organization.setApproved(member, false);

                memberStructure = structDecode(await this.organization.getMember(memberId));

                assert.equal(memberStructure.approved, false);
              });
            });

            describe('set data', function () {
              it('succeed', async function () {
                const data = JSON.stringify({ key: 'value' });
                await this.organization.setData(member, web3.utils.utf8ToHex(data));

                memberStructure = structDecode(await this.organization.getMember(memberId));

                assert.equal(web3.utils.hexToUtf8(memberStructure.data), data);
              });
            });
          });
        });

        describe('when member does not exist', function () {
          describe('check metadata', function () {
            it('reverts', async function () {
              await shouldFail.reverting(this.organization.getMember(999));
            });
          });

          describe('check isMember', function () {
            it('returns false', async function () {
              (await this.organization.isMember(anotherAccount)).should.be.equal(false);
            });
          });

          describe('check creationDateOf', function () {
            it('should be zero', async function () {
              (await this.organization.creationDateOf(anotherAccount)).should.be.bignumber.equal(new BN(0));
            });
          });

          describe('check stakedTokensOf', function () {
            it('should be zero', async function () {
              (await this.organization.stakedTokensOf(anotherAccount)).should.be.bignumber.equal(new BN(0));
            });
          });

          describe('check usedTokensOf', function () {
            it('should be zero', async function () {
              (await this.organization.usedTokensOf(anotherAccount)).should.be.bignumber.equal(new BN(0));
            });
          });

          describe('check isApproved', function () {
            it('should be false', async function () {
              (await this.organization.isApproved(anotherAccount)).should.be.equal(false);
            });
          });

          describe('set approved', function () {
            it('reverts', async function () {
              await shouldFail.reverting(this.organization.setApproved(anotherAccount, true));
            });
          });

          describe('set data', function () {
            it('reverts', async function () {
              const data = JSON.stringify({ key: 'value' });
              await shouldFail.reverting(this.organization.setData(anotherAccount, web3.utils.utf8ToHex(data)));
            });
          });
        });
      });

      context('creating another member', function () {
        describe('if member already exists', function () {
          it('reverts', async function () {
            await shouldFail.reverting(this.organization.addMember(member, { from: operator }));
          });
        });

        describe('if member is the zero address', function () {
          it('reverts', async function () {
            await shouldFail.reverting(this.organization.addMember(ZERO_ADDRESS, { from: operator }));
          });
        });
      });

      context('testing stake/unstake/use', function () {
        const tokenAmount = new BN(10);

        describe('stake tokens', function () {
          let preMemberStructure;
          let preStakedTokens;

          beforeEach(async function () {
            preMemberStructure = structDecode(await this.organization.getMember(memberId));
            preStakedTokens = await this.organization.totalStakedTokens();

            await this.organization.stake(member, tokenAmount, { from: operator });
          });

          describe('if user is member', function () {
            it('should increase member staked tokens', async function () {
              const memberStructure = await this.organization.getMember(memberId);
              memberStructure.stakedTokens.should.be.bignumber.equal(preMemberStructure.stakedTokens.add(tokenAmount));

              (await this.organization.stakedTokensOf(member)).should.be.bignumber.equal(
                preMemberStructure.stakedTokens.add(tokenAmount)
              );
            });

            it('should increase total staked tokens', async function () {
              (await this.organization.totalStakedTokens()).should.be.bignumber.equal(
                preStakedTokens.add(tokenAmount)
              );
            });
          });

          describe('if user is not member', function () {
            it('reverts', async function () {
              await shouldFail.reverting(this.organization.stake(anotherAccount, tokenAmount, { from: operator }));
            });
          });
        });

        describe('unstake tokens', function () {
          describe('if user is member', function () {
            beforeEach(async function () {
              await this.organization.stake(member, tokenAmount, { from: operator });
            });

            describe('if member has enough staked token', function () {
              let preMemberStructure;
              let preStakedTokens;

              beforeEach(async function () {
                preMemberStructure = structDecode(await this.organization.getMember(memberId));
                preStakedTokens = await this.organization.totalStakedTokens();

                await this.organization.unstake(tokenAmount, { from: member });
              });

              it('should decrease member staked tokens', async function () {
                const memberStructure = await this.organization.getMember(memberId);
                memberStructure.stakedTokens.should.be.bignumber.equal(
                  preMemberStructure.stakedTokens.sub(tokenAmount)
                );

                (await this.organization.stakedTokensOf(member)).should.be.bignumber.equal(
                  preMemberStructure.stakedTokens.sub(tokenAmount)
                );
              });

              it('should decrease total staked tokens', async function () {
                (await this.organization.totalStakedTokens()).should.be.bignumber.equal(
                  preStakedTokens.sub(tokenAmount)
                );
              });
            });

            describe('if member has not enough staked token', function () {
              it('reverts', async function () {
                await shouldFail.reverting(
                  this.organization.unstake(
                    tokenAmount.addn(1),
                    { from: member }
                  )
                );
              });
            });
          });

          describe('if user is not member', function () {
            it('reverts', async function () {
              await shouldFail.reverting(
                this.organization.unstake(tokenAmount, { from: anotherAccount })
              );
            });
          });
        });

        describe('use tokens', function () {
          describe('if user is member', function () {
            beforeEach(async function () {
              await this.organization.stake(member, tokenAmount, { from: operator });
            });

            describe('if member has enough staked token', function () {
              let preMemberStructure;
              let preStakedTokens;
              let preUsedTokens;

              beforeEach(async function () {
                preMemberStructure = structDecode(await this.organization.getMember(memberId));
                preStakedTokens = await this.organization.totalStakedTokens();
                preUsedTokens = await this.organization.totalUsedTokens();

                await this.organization.use(tokenAmount, { from: member });
              });

              it('should decrease member staked tokens', async function () {
                const memberStructure = await this.organization.getMember(memberId);
                memberStructure.stakedTokens.should.be.bignumber.equal(
                  preMemberStructure.stakedTokens.sub(tokenAmount)
                );

                (await this.organization.stakedTokensOf(member)).should.be.bignumber.equal(
                  preMemberStructure.stakedTokens.sub(tokenAmount)
                );
              });

              it('should decrease total staked tokens', async function () {
                (await this.organization.totalStakedTokens())
                  .should.be.bignumber.equal(preStakedTokens.sub(tokenAmount));
              });

              it('should increase member used tokens', async function () {
                const memberStructure = await this.organization.getMember(memberId);
                memberStructure.usedTokens.should.be.bignumber.equal(preMemberStructure.usedTokens.add(tokenAmount));

                (await this.organization.usedTokensOf(member)).should.be.bignumber.equal(
                  preMemberStructure.usedTokens.add(tokenAmount)
                );
              });

              it('should increase total used tokens', async function () {
                (await this.organization.totalUsedTokens()).should.be.bignumber.equal(
                  preUsedTokens.add(tokenAmount)
                );
              });
            });

            describe('if member has not enough staked token', function () {
              it('reverts', async function () {
                await shouldFail.reverting(
                  this.organization.use(
                    tokenAmount.addn(1),
                    { from: member }
                  )
                );
              });
            });
          });

          describe('if user is not member', function () {
            it('reverts', async function () {
              await shouldFail.reverting(
                this.organization.use(tokenAmount, { from: anotherAccount })
              );
            });
          });
        });
      });
    });
  });
});
