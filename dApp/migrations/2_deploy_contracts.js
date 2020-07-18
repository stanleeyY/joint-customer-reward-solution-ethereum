var SimpleStorage = artifacts.require("./SimpleStorage.sol");
var Token = artifacts.require("./Token.sol");
var Program = artifacts.require("./Program.sol");


module.exports = async function(deployer) {
    await deployer.deploy(SimpleStorage);

    await deployer.deploy(Token);
    const token = await Token.deployed()

    await deployer.deploy(Program,token.address);
    const program = await Program.deployed()

};
