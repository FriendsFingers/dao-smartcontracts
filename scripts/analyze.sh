#!/usr/bin/env bash
surya inheritance dist/ShakaCard.dist.sol | dot -Tpng > analysis/inheritance-tree/ShakaCard.png

surya graph dist/ShakaCard.dist.sol | dot -Tpng > analysis/control-flow/ShakaCard.png

surya mdreport analysis/description-table/ShakaCard.md dist/ShakaCard.dist.sol
