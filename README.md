# FriendsFingers platform's DAO Smart Contracts

[![Build Status](https://travis-ci.org/FriendsFingers/dao-smartcontracts.svg?branch=master)](https://travis-ci.org/FriendsFingers/dao-smartcontracts) 
[![Coverage Status](https://coveralls.io/repos/github/FriendsFingers/dao-smartcontracts/badge.svg)](https://coveralls.io/github/FriendsFingers/dao-smartcontracts)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/FriendsFingers/dao-smartcontracts/blob/master/LICENSE)


Smart Contracts defining the FriendsFingers platform's DAO.


## Development

Install Truffle if you want to run your own node

Version 4.1.15 required

```bash
npm install -g truffle@4.1.15
```

### Install dependencies

```bash
npm install
```

## Usage
 
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

```bash
truffle-flattener contracts/token/ERC721/ShakaCard.sol > dist/ShakaCard.dist.sol
```

## Analysis

Note: it is better to analyze the flattened code to have a bigger overview on the entire codebase

```bash
npm run analyze
```

## License

Code released under the [MIT License](https://github.com/FriendsFingers/dao-smartcontracts/blob/master/LICENSE).
