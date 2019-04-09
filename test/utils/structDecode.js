function structDecode (struct) {
  return {
    id: struct[0],
    member: struct[1],
    fingerprint: struct[2],
    creationDate: struct[3],
    stakedTokens: struct[4],
    data: struct[5],
    kyc: struct[6],
  };
}

module.exports = {
  structDecode,
};
