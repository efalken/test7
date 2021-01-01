const Token = artifacts.require("Token");
const Betting = artifacts.require("Betting");
const Oracle = artifacts.require("Oracle");

module.exports = function (deployer) {
  deployer.deploy(Token).then(() => {
    return deployer.deploy(Betting, Token.address);
  }).then(() => {
    return deployer.deploy(Oracle, Betting.address, Token.address);
  }).then(() => {
    return Betting.deployed();
  }).then((betting) => {
    betting.setOracleAddress(Oracle.address);
  });
  // Token.deployed().then(token =>
  //   console.log(token.address));
};
