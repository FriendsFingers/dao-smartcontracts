const { BN, constants, shouldFail, time } = require('openzeppelin-test-helpers');
const { ZERO_ADDRESS } = constants;

const { structDecode } = require('./utils/structDecode');

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
              const toCheck = memberStructure.id;
              toCheck.should.be.bignumber.equal(memberId);
            });

            it('has a member', async function () {
              const toCheck = memberStructure.member;
              toCheck.should.be.equal(member);
            });

            it('has a fingerprint', async function () {
              const fingerprint = await this.organization.getFingerprint(member, memberId);

              const toCheck = memberStructure.fingerprint;
              assert.equal(toCheck, fingerprint);
            });

            it('has a creation date', async function () {
              const toCheck = memberStructure.creationDate;
              toCheck.should.be.bignumber.equal(await time.latest());
            });

            it('has a staked tokens value', async function () {
              const toCheck = memberStructure.stakedTokens;
              toCheck.should.be.bignumber.equal(new BN(0));
            });

            it('has a data value', async function () {
              const toCheck = memberStructure.data;
              assert.equal(web3.utils.hexToUtf8(toCheck), '');
            });

            it('has a kyc value', async function () {
              const toCheck = memberStructure.kyc;
              assert.equal(toCheck, false);
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
