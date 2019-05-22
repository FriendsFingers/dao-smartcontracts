function structDecode (struct) {
  return {
    id: struct[0],
    account: struct[1],
    fingerprint: struct[2],
    creationDate: struct[3],
    stakedTokens: struct[4],
    usedTokens: struct[5],
    data: struct[6],
    approved: struct[7],
  };
}

module.exports = {
  structDecode,
};
