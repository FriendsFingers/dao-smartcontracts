#!/usr/bin/env bash

surya inheritance dist/DAOMember.dist.sol | dot -Tpng > analysis/inheritance-tree/DAOMember.png

surya graph dist/DAOMember.dist.sol | dot -Tpng > analysis/control-flow/DAOMember.png

surya mdreport analysis/description-table/DAOMember.md dist/DAOMember.dist.sol
