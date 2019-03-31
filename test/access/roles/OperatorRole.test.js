const { shouldBehaveLikeOwnable } = require('../../ownership/Ownable.behavior');
const { shouldBehaveLikePublicRole } = require('./PublicRole.behavior');

const OperatorRoleMock = artifacts.require('OperatorRoleMock');

contract('OperatorRole', function ([owner, operator, otherOperator, thirdParty, ...otherAccounts]) {
  beforeEach(async function () {
    this.contract = await OperatorRoleMock.new({ from: owner });
    await this.contract.addOperator(operator, { from: owner });
    await this.contract.addOperator(otherOperator, { from: owner });
  });

  context('testing roles behaviour', function () {
    shouldBehaveLikePublicRole(owner, operator, otherOperator, otherAccounts, 'operator');
  });

  context('testing ownership', function () {
    beforeEach(async function () {
      this.ownable = this.contract;
    });

    shouldBehaveLikeOwnable(owner, [thirdParty]);
  });
});
