#!/usr/bin/env bash

surya inheritance dist/ProofOfFriends.dist.sol | dot -Tpng > analysis/inheritance-tree/ProofOfFriends.png

surya graph dist/ProofOfFriends.dist.sol | dot -Tpng > analysis/control-flow/ProofOfFriends.png

surya mdreport analysis/description-table/ProofOfFriends.md dist/ProofOfFriends.dist.sol
