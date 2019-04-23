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

            it('has a data value', async function () {
              assert.equal(web3.utils.hexToUtf8(memberStructure.data), '');
            });

            it('has a verified value', async function () {
              assert.equal(memberStructure.verified, false);

              (await this.organization.isVerified(member)).should.be.equal(false);
            });

            describe('set verified', function () {
              it('succeed', async function () {
                await this.organization.setVerified(member, true);

                memberStructure = structDecode(await this.organization.getMember(memberId));

                assert.equal(memberStructure.verified, true);
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

          describe('check isVerified', function () {
            it('should be false', async function () {
              (await this.organization.isVerified(anotherAccount)).should.be.equal(false);
            });
          });

          describe('set verified', function () {
            it('reverts', async function () {
              await shouldFail.reverting(this.organization.setVerified(anotherAccount, true));
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

      context('testing stake/unstake', function () {
        const toStake = new BN(10);

        describe('stake tokens', function () {
          let preMemberStructure;
          let preStakedTokens;

          beforeEach(async function () {
            preMemberStructure = structDecode(await this.organization.getMember(memberId));
            preStakedTokens = await this.organization.totalStakedTokens();

            await this.organization.stake(member, toStake, { from: operator });
          });

          describe('if user is member', function () {
            it('should increase member staked tokens', async function () {
              const memberStructure = await this.organization.getMember(memberId);
              memberStructure.stakedTokens.should.be.bignumber.equal(preMemberStructure.stakedTokens.add(toStake));

              (await this.organization.stakedTokensOf(member))
                .should.be.bignumber.equal(preMemberStructure.stakedTokens.add(toStake));
            });

            it('should increase total staked tokens', async function () {
              (await this.organization.totalStakedTokens())
                .should.be.bignumber.equal(preStakedTokens.add(toStake));
            });
          });

          describe('if user is not member', function () {
            it('reverts', async function () {
              await shouldFail.reverting(this.organization.stake(anotherAccount, toStake, { from: operator }));
            });
          });
        });

        describe('unstake tokens', function () {
          describe('if user is member', function () {
            beforeEach(async function () {
              await this.organization.stake(member, toStake, { from: operator });
            });

            describe('if member has enough staked token', function () {
              let preMemberStructure;
              let preStakedTokens;

              beforeEach(async function () {
                preMemberStructure = structDecode(await this.organization.getMember(memberId));
                preStakedTokens = await this.organization.totalStakedTokens();

                await this.organization.unstake(toStake, { from: member });
              });

              it('should decrease member staked tokens', async function () {
                const memberStructure = await this.organization.getMember(memberId);
                memberStructure.stakedTokens.should.be.bignumber.equal(preMemberStructure.stakedTokens.sub(toStake));

                (await this.organization.stakedTokensOf(member))
                  .should.be.bignumber.equal(preMemberStructure.stakedTokens.sub(toStake));
              });

              it('should decrease total staked tokens', async function () {
                (await this.organization.totalStakedTokens())
                  .should.be.bignumber.equal(preStakedTokens.sub(toStake));
              });
            });

            describe('if member has not enough staked token', function () {
              it('reverts', async function () {
                await shouldFail.reverting(
                  this.organization.unstake(
                    toStake.addn(1),
                    { from: member }
                  )
                );
              });
            });
          });

          describe('if user is not member', function () {
            it('reverts', async function () {
              await shouldFail.reverting(
                this.organization.unstake(toStake, { from: anotherAccount })
              );
            });
          });
        });
      });
    });
  });
});
