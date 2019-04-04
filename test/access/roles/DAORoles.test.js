const { shouldBehaveLikeOwnable } = require('../../ownership/Ownable.behavior');
const { shouldBehaveLikeDAORole } = require('./DAORoles.behavior');

const DAORolesMock = artifacts.require('DAORolesMock');

contract('DAORoles', function (
  [
    owner,
    operator,
    otherOperator,
    dapp,
    otherDapp,
    ...otherAccounts
  ]
) {
  beforeEach(async function () {
    this.contract = await DAORolesMock.new({ from: owner });
  });

  context('testing "operator" behaviour', function () {
    beforeEach(async function () {
      await this.contract.addOperator(operator, { from: owner });
      await this.contract.addOperator(otherOperator, { from: owner });
    });

    shouldBehaveLikeDAORole(owner, operator, otherOperator, otherAccounts, 'operator');
  });

  context('testing "dapp" behaviour', function () {
    beforeEach(async function () {
      await this.contract.addOperator(operator, { from: owner });
      await this.contract.addDapp(dapp, { from: operator });
      await this.contract.addDapp(otherDapp, { from: operator });
    });

    shouldBehaveLikeDAORole(owner, dapp, otherDapp, otherAccounts, 'dapp', operator);
  });

  context('testing ownership', function () {
    beforeEach(async function () {
      this.ownable = this.contract;
    });

    shouldBehaveLikeOwnable(owner, otherAccounts);
  });
});
