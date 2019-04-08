#!/usr/bin/env bash

surya inheritance dist/DAO.dist.sol | dot -Tpng > analysis/inheritance-tree/DAO.png

surya graph dist/DAO.dist.sol | dot -Tpng > analysis/control-flow/DAO.png

surya mdreport analysis/description-table/DAO.md dist/DAO.dist.sol
