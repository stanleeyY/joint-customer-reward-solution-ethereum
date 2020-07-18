let abi = require('ethereumjs-abi')

let amount = 1;
let nonce = new Date().getTime()
let contractAddress = "0xEc35df7ac0c43f3784c1Ad9a0293caacD11Ae316"
const hash = "0x" + abi.soliditySHA3(
    ["uint256", "uint256", "address"],
    [amount, nonce, contractAddress]
).toString("hex");

console.log(hash);
console.log({fullSignData: [amount, nonce]})
/*
web3.eth.personal.sign(hash, signer, "", (err, value) => {
    console.log({redeemSignature: value, fullSignData: [amount, nonce, signer, value]});
});
*/