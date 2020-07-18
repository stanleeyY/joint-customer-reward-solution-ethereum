let express = require('express');
let router = express.Router();
let Web3 = require('web3');
let ProgramContract = require("/Users/s09wsa5a/WebstormProjects/Reward/client/src/contracts/Program.json");
let TokenContract = require("/Users/s09wsa5a/WebstormProjects/Reward/client/src/contracts/Token.json");

const jwt = require("jsonwebtoken");
const fs = require('fs');

let contract;
let tokenContract;
let accounts;
let web3 = new Web3('http://localhost:7545');
let deployer = "";

// Get the contract instance.
const networkId = "5777";
const deployedNetwork = ProgramContract.networks[networkId];
const deployedNetwork2 = TokenContract.networks[networkId];

contract = new web3.eth.Contract(
    ProgramContract.abi,
    deployedNetwork && deployedNetwork.address,
);

tokenContract = new web3.eth.Contract(
    TokenContract.abi,
    deployedNetwork2 && deployedNetwork2.address,
);

web3.eth.getAccounts().then((value) => {
    // set the default account
    web3.eth.defaultAccount = value[0];
    deployer = value[0];
    accounts = value;
    console.log(value);
});

router.use(function (req, res, next) {
    console.log('Time: ', Date.now());
    if (typeof req.headers.authorization !== "undefined") {
        // retrieve the authorization header and parse out the
        // JWT using the split function
        let token = req.headers.authorization.split(" ")[0];

        let privateKey = fs.readFileSync('./private.pem', 'utf8');
        // Here we validate that the JSON Web Token is valid and has been
        // created using the same private pass phrase
        jwt.verify(token, privateKey, {algorithm: "HS256"}, (err, user) => {

            // if there has been an error...
            if (err) {
                // shut them out!
                res.status(500).json({error: "Not Authorized"});
            }
            // if the JWT is valid, allow them to hit
            // the intended endpoint

            res.locals.pid = user.pid;
            next();
        });
    } else {
        // No authorization header exists on the incoming
        // request, return not authorized
        res.status(500).json({error: "Not Authorized"});
    }
})

router.get('/balance', function (req, res, next) {
    //tokenContract.methods.mintToken(1000).send({from: deployer});
    console.log(res.locals.pid);

    contract.methods.getPartnerBalance(res.locals.pid).call({from: deployer}, (error, value) => {
        //console.log(value);
        if (error) return res.send({message: error});
        res.send({message: "Success", balance: value});
    });
});

//send token to customer

router.post('/send_token', function (req, res, next) {
    //tokenContract.methods.mintToken(1000).send({from: deployer});
    console.log(res.locals.pid);

    contract.methods.earnToken(res.locals.pid, req.query.address, req.query.amount).send({from: deployer}, (error, value) => {
        //console.log(value);
        if (error) return res.send({message: error});
        res.send({message: "Success"});
    });
});

router.post('/redeem_token', function (req, res, next) {
    //tokenContract.methods.mintToken(1000).send({from: deployer});
    console.log(res.locals.pid );

    contract.methods.redeemToken(Number(req.query.amount), Number(req.query.nonce), req.query.address, req.query.signature, res.locals.pid).send({from: deployer}, (error, value) => {
        //console.log(value);
        if (error) {
            console.log(error);
            return res.send({message: "Fail"});
        }

        res.send({message: "Success"});
    });
});

router.get('/authorized', function (req, res) {
    res.send({message: 'Secured Resource'});
});

module.exports = router;
