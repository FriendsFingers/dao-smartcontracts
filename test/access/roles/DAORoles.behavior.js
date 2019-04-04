const { shouldFail, constants, expectEvent } = require('openzeppelin-test-helpers');
const { ZERO_ADDRESS } = constants;

function capitalize (str) {
  return str.replace(/\b\w/g, l => l.toUpperCase());
}

function shouldBehaveLikeDAORole (owner, authorized, otherAuthorized, [anyone], rolename, manager) {
  rolename = capitalize(rolename);

  describe(`should behave like ${rolename} role`, function () {
    beforeEach('check preconditions', async function () {
      (await this.contract[`is${rolename}`](authorized)).should.equal(true);
      (await this.contract[`is${rolename}`](otherAuthorized)).should.equal(true);
      (await this.contract[`is${rolename}`](anyone)).should.equal(false);
    });

    it('reverts when querying roles for the null account', async function () {
      await shouldFail.reverting(this.contract[`is${rolename}`](ZERO_ADDRESS));
    });

    describe('access control', function () {
      context('from authorized account', function () {
        const from = authorized;

        it('allows access', async function () {
          await this.contract[`only${rolename}Mock`]({ from });
        });
      });

      context('from unauthorized account', function () {
        const from = anyone;

        it('reverts', async function () {
          await shouldFail.reverting(this.contract[`only${rolename}Mock`]({ from }));
        });
      });
    });

    describe('add', function () {
      context(`from ${manager ? 'the manager' : 'an owner'} account`, function () {
        const from = manager === undefined ? owner : manager;

        it('adds role to a new account', async function () {
          await this.contract[`add${rolename}`](anyone, { from });
          (await this.contract[`is${rolename}`](anyone)).should.equal(true);
        });

        it(`emits a ${rolename}Added event`, async function () {
          const { logs } = await this.contract[`add${rolename}`](anyone, { from });
          expectEvent.inLogs(logs, `${rolename}Added`, { account: anyone });
        });

        it('reverts when adding role to an already assigned account', async function () {
          await shouldFail.reverting(this.contract[`add${rolename}`](authorized, { from }));
        });

        it('reverts when adding role to the null account', async function () {
          await shouldFail.reverting(this.contract[`add${rolename}`](ZERO_ADDRESS, { from }));
        });
      });

      context('from anyone', function () {
        const from = anyone;

        it('reverts', async function () {
          await shouldFail.reverting(this.contract[`add${rolename}`](owner, { from }));
        });
      });
    });

    describe('remove', function () {
      context(`from ${manager ? 'the manager' : 'an owner'} account`, function () {
        const from = manager === undefined ? owner : manager;

        it('removes role from an already assigned account', async function () {
          await this.contract[`remove${rolename}`](authorized, { from });
          (await this.contract[`is${rolename}`](authorized)).should.equal(false);
          (await this.contract[`is${rolename}`](otherAuthorized)).should.equal(true);
        });

        it(`emits a ${rolename}Removed event`, async function () {
          const { logs } = await this.contract[`remove${rolename}`](authorized, { from });
          expectEvent.inLogs(logs, `${rolename}Removed`, { account: authorized });
        });

        it('reverts when removing from an unassigned account', async function () {
          await shouldFail.reverting(this.contract[`remove${rolename}`](anyone, { from }));
        });

        it('reverts when removing role from the null account', async function () {
          await shouldFail.reverting(this.contract[`remove${rolename}`](ZERO_ADDRESS, { from }));
        });
      });

      context('from anyone', function () {
        const from = anyone;

        it('reverts', async function () {
          await shouldFail.reverting(this.contract[`remove${rolename}`](authorized, { from }));
        });
      });
    });
  });
}

module.exports = {
  shouldBehaveLikeDAORole,
};
