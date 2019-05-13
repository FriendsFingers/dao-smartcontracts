## Sūrya's Description Report

### Files Description Table


|  File Name  |  SHA-1 Hash  |
|-------------|--------------|
| dist/DAO.dist.sol | 68217b34f5649748f6e57d2df7485e610791b29b |


### Contracts Description Table


|  Contract  |         Type        |       Bases      |                  |                 |
|:----------:|:-------------------:|:----------------:|:----------------:|:---------------:|
|     └      |  **Function Name**  |  **Visibility**  |  **Mutability**  |  **Modifiers**  |
||||||
| **ERC165Checker** | Library |  |||
| └ | _supportsERC165 | Internal 🔒 |   | |
| └ | _supportsInterface | Internal 🔒 |   | |
| └ | _supportsAllInterfaces | Internal 🔒 |   | |
| └ | _supportsERC165Interface | Private 🔐 |   | |
| └ | _callERC165SupportsInterface | Private 🔐 |   | |
||||||
| **IERC20** | Interface |  |||
| └ | transfer | External ❗️ | 🛑  |NO❗️ |
| └ | approve | External ❗️ | 🛑  |NO❗️ |
| └ | transferFrom | External ❗️ | 🛑  |NO❗️ |
| └ | totalSupply | External ❗️ |   |NO❗️ |
| └ | balanceOf | External ❗️ |   |NO❗️ |
| └ | allowance | External ❗️ |   |NO❗️ |
||||||
| **IERC165** | Interface |  |||
| └ | supportsInterface | External ❗️ |   |NO❗️ |
||||||
| **ERC165** | Implementation | IERC165 |||
| └ | \<Constructor\> | Internal 🔒 | 🛑  | |
| └ | supportsInterface | External ❗️ |   |NO❗️ |
| └ | _registerInterface | Internal 🔒 | 🛑  | |
||||||
| **IERC1363** | Implementation | IERC20, ERC165 |||
| └ | transferAndCall | Public ❗️ | 🛑  |NO❗️ |
| └ | transferAndCall | Public ❗️ | 🛑  |NO❗️ |
| └ | transferFromAndCall | Public ❗️ | 🛑  |NO❗️ |
| └ | transferFromAndCall | Public ❗️ | 🛑  |NO❗️ |
| └ | approveAndCall | Public ❗️ | 🛑  |NO❗️ |
| └ | approveAndCall | Public ❗️ | 🛑  |NO❗️ |
||||||
| **IERC1363Receiver** | Implementation |  |||
| └ | onTransferReceived | Public ❗️ | 🛑  |NO❗️ |
||||||
| **IERC1363Spender** | Implementation |  |||
| └ | onApprovalReceived | Public ❗️ | 🛑  |NO❗️ |
||||||
| **ERC1363Payable** | Implementation | IERC1363Receiver, IERC1363Spender, ERC165 |||
| └ | \<Constructor\> | Public ❗️ | 🛑  | |
| └ | onTransferReceived | Public ❗️ | 🛑  |NO❗️ |
| └ | onApprovalReceived | Public ❗️ | 🛑  |NO❗️ |
| └ | acceptedToken | Public ❗️ |   |NO❗️ |
| └ | _transferReceived | Internal 🔒 | 🛑  | |
| └ | _approvalReceived | Internal 🔒 | 🛑  | |
||||||
| **Ownable** | Implementation |  |||
| └ | \<Constructor\> | Internal 🔒 | 🛑  | |
| └ | owner | Public ❗️ |   |NO❗️ |
| └ | isOwner | Public ❗️ |   |NO❗️ |
| └ | renounceOwnership | Public ❗️ | 🛑  | onlyOwner |
| └ | transferOwnership | Public ❗️ | 🛑  | onlyOwner |
| └ | _transferOwnership | Internal 🔒 | 🛑  | |
||||||
| **Roles** | Library |  |||
| └ | add | Internal 🔒 | 🛑  | |
| └ | remove | Internal 🔒 | 🛑  | |
| └ | has | Internal 🔒 |   | |
||||||
| **DAORoles** | Implementation | Ownable |||
| └ | \<Constructor\> | Internal 🔒 | 🛑  | |
| └ | isOperator | Public ❗️ |   |NO❗️ |
| └ | isDapp | Public ❗️ |   |NO❗️ |
| └ | addOperator | Public ❗️ | 🛑  | onlyOwner |
| └ | addDapp | Public ❗️ | 🛑  | onlyOperator |
| └ | removeOperator | Public ❗️ | 🛑  | onlyOwner |
| └ | removeDapp | Public ❗️ | 🛑  | onlyOperator |
| └ | _addOperator | Internal 🔒 | 🛑  | |
| └ | _addDapp | Internal 🔒 | 🛑  | |
| └ | _removeOperator | Internal 🔒 | 🛑  | |
| └ | _removeDapp | Internal 🔒 | 🛑  | |
||||||
| **SafeMath** | Library |  |||
| └ | mul | Internal 🔒 |   | |
| └ | div | Internal 🔒 |   | |
| └ | sub | Internal 🔒 |   | |
| └ | add | Internal 🔒 |   | |
| └ | mod | Internal 🔒 |   | |
||||||
| **Organization** | Library |  |||
| └ | isMember | Internal 🔒 |   | |
| └ | creationDateOf | Internal 🔒 |   | |
| └ | stakedTokensOf | Internal 🔒 |   | |
| └ | isApproved | Internal 🔒 |   | |
| └ | getMember | Internal 🔒 |   | |
| └ | addMember | Internal 🔒 | 🛑  | |
| └ | stake | Internal 🔒 | 🛑  | |
| └ | unstake | Internal 🔒 | 🛑  | |
| └ | setApproved | Internal 🔒 | 🛑  | |
| └ | setData | Internal 🔒 | 🛑  | |
| └ | getFingerprint | Private 🔐 |   | |
||||||
| **DAO** | Implementation | ERC1363Payable, DAORoles |||
| └ | \<Constructor\> | Public ❗️ | 🛑  | ERC1363Payable |
| └ | \<Fallback\> | External ❗️ |  💵 |NO❗️ |
| └ | newMember | External ❗️ | 🛑  | onlyOperator |
| └ | setApproved | External ❗️ | 🛑  | onlyOperator |
| └ | setData | External ❗️ | 🛑  | onlyOperator |
| └ | use | External ❗️ | 🛑  | onlyDapp |
| └ | unstake | Public ❗️ | 🛑  |NO❗️ |
| └ | membersNumber | Public ❗️ |   |NO❗️ |
| └ | totalStakedTokens | Public ❗️ |   |NO❗️ |
| └ | isMember | Public ❗️ |   |NO❗️ |
| └ | creationDateOf | Public ❗️ |   |NO❗️ |
| └ | stakedTokensOf | Public ❗️ |   |NO❗️ |
| └ | isApproved | Public ❗️ |   |NO❗️ |
| └ | getMemberByAddress | Public ❗️ |   |NO❗️ |
| └ | getMemberById | Public ❗️ |   |NO❗️ |
| └ | recoverERC20 | Public ❗️ | 🛑  | onlyOwner |
| └ | _transferReceived | Internal 🔒 | 🛑  | |
| └ | _approvalReceived | Internal 🔒 | 🛑  | |
| └ | _newMember | Internal 🔒 | 🛑  | |
| └ | _stake | Internal 🔒 | 🛑  | |


### Legend

|  Symbol  |  Meaning  |
|:--------:|-----------|
|    🛑    | Function can modify state |
|    💵    | Function is payable |
