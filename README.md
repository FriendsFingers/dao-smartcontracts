# FriendsFingers platform's DAO Smart Contracts

[![NPM Package](https://img.shields.io/npm/v/dao-smartcontracts.svg?style=flat-square)](https://www.npmjs.org/package/dao-smartcontracts)
[![Build Status](https://travis-ci.org/FriendsFingers/dao-smartcontracts.svg?branch=master)](https://travis-ci.org/FriendsFingers/dao-smartcontracts) 
[![Coverage Status](https://coveralls.io/repos/github/FriendsFingers/dao-smartcontracts/badge.svg)](https://coveralls.io/github/FriendsFingers/dao-smartcontracts)
[![MIT licensed](https://img.shields.io/github/license/FriendsFingers/dao-smartcontracts.svg)](https://github.com/FriendsFingers/dao-smartcontracts/blob/master/LICENSE)


Smart Contracts defining the [FriendsFingers](https://app.friendsfingers.com) platform's DAO and DAPPs behaviors.


## Development

Install Truffle if you want to run your own node

```bash
npm install -g truffle
```

### Install dependencies

```bash
npm install
```

## Usage

Open the Truffle console

```bash
npm run console
```

### Compile

```bash
npm run compile
```

### Test 

```bash
npm run test 
```

### Code Coverage

```bash
npm run coverage
```

## Linter

Use Solhint

```bash
npm run lint:sol
```

Use ESLint

```bash
npm run lint:js
```

Use ESLint and fix

```bash
npm run lint:fix
```

## Flattener

This allow to flatten the code into a single file

Edit `scripts/flat.sh` to add your contracts

```bash
npm run flat
```

## Analysis

Note: it is better to analyze the flattened code to have a bigger overview on the entire codebase. So run the flattener first.

### Describe

The `describe` command shows a summary of the contracts and methods in the files provided

```bash
surya describe dist/DAO.dist.sol
```

### Dependencies

The `dependencies` command outputs the c3-linearization of a given contract's inheirtance graph. Contracts will be listed starting with most-derived, ie. if the same function is defined in more than one contract, the solidity compiler will use the definition in whichever contract is listed first.

```bash
surya dependencies DAO dist/DAO.dist.sol
```
### Generate Report

Edit `scripts/analyze.sh` to add your contracts 

```bash
npm run analyze
```

The `inheritance` command outputs a DOT-formatted graph of the inheritance tree.

The `graph` command outputs a DOT-formatted graph of the control flow.

The `mdreport` command creates a markdown description report with tables comprising information about the system's files, contracts and their functions.

## License

Code released under the [MIT License](https://github.com/FriendsFingers/dao-smartcontracts/blob/master/LICENSE).
