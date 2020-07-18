var express = require('express');
var secured = require('../lib/middleware/secured');
let Web3 = require('web3');
let ProgramContract = require("/Users/s09wsa5a/WebstormProjects/Reward/client/src/contracts/Program.json");
let TokenContract = require("/Users/s09wsa5a/WebstormProjects/Reward/client/src/contracts/Token.json");
var router = express.Router();
const networkId = "5777";
const fs = require('fs')
const jwt = require("jsonwebtoken")

let privateKey = fs.readFileSync('./private.pem', 'utf8');
let web3 = new Web3('http://localhost:7545');
let deployer = "";

const deployedNetwork = ProgramContract.networks[networkId];
const deployedNetwork2 = TokenContract.networks[networkId];

let contract = new web3.eth.Contract(
    ProgramContract.abi,
    deployedNetwork && deployedNetwork.address,
);

let tokenContract = new web3.eth.Contract(
    TokenContract.abi,
    deployedNetwork2 && deployedNetwork2.address,
);

web3.eth.getAccounts().then((value) => {
    web3.eth.defaultAccount = value[0];
    deployer = value[0];
});

/* GET user profile. */
router.get('/user', secured(), async function (req, res, next) {
    const {_raw, _json, ...userProfile} = req.user;
    console.log(userProfile.id);
    let balance = await contract.methods.getPartnerBalance(userProfile.id).call({from: deployer});

    res.render('user', {
        userProfile: JSON.stringify(userProfile, null, 2),
        title: 'Profile page',
        balance: balance
    });
});


router.get('/sign-up', secured(), async function (req, res, next) {
    const {...userProfile} = req.user;
    let balance = await contract.methods.getPartnerBalance(userProfile.id).call({from: deployer});
    let name = await contract.methods.getPartnerName(userProfile.id).call({from: deployer});

    res.render('partner', {
        title: 'Profile page',
        balance: balance,
        name: name
    });
});

router.post('/submit-partner-form', async function (req, res, next) {
    const {...userProfile} = req.user;
    const name = req.body.name;

    await contract.methods.addPartner(userProfile.id, name).send({
        from: deployer,
        gas: 5000000
    }, function (error, transactionHash) {
        if (error) return next(error);

        res.render('signup_success', {
            title: 'Finish sign-up form'
        });
    });
});

router.get('/partner', secured(), async function (req, res, next) {
    const {...userProfile} = req.user;
    let isActive = await contract.methods.getPartnerActive(userProfile.id).call({from: deployer});
    if (isActive === false) {

        res.render('signup', {
            title: 'Sign Up'
        });
    } else {
        next();
    }
});

router.get('/partner', secured(), async function (req, res, next) {
    const {...userProfile} = req.user;
    let balance = await contract.methods.getPartnerBalance(userProfile.id).call({from: deployer});
    let name = await contract.methods.getPartnerName(userProfile.id).call({from: deployer});
    let transData = [];


    await contract.getPastEvents('AddPartnerBalance', {
        fromBlock: 0,
        toBlock: 'latest'
    }, (error, events) => {
        //console.log(events);
    }).then((events) => {

        for (value of events) {
            if (value.returnValues.pid == userProfile.id)
                this.addRecord(value.blockNumber, value.returnValues.amount, transData)
        }
    });

    transData.sort(compare);
    for (const tran of transData) {
        let block = await web3.eth.getBlock(tran.blockNum);
        let d = new Date(block.timestamp * 1000);
        tran.time = d.toLocaleString();
    }

    res.render('partner', {
        title: 'Profile page',
        trans: transData,
        balance: balance,
        name: name
    });
});

router.get('/api-info', secured(), async function (req, res, next) {
    const {...userProfile} = req.user;
    let token = jwt.sign({"pid": userProfile.id}, privateKey, {algorithm: 'HS256'});

    res.render('api', {
        title: 'API Information',
        api_token: token,
    });
});

router.get('/transaction', secured(), async function (req, res, next) {
    const {_raw, _json, ...userProfile} = req.user;
    let transData = [];

    let balance = await contract.methods.getPartnerBalance(userProfile.id).call({from: deployer});

    await contract.getPastEvents('Redeem', {
        fromBlock: 0,
        toBlock: 'latest'
    }, (error, events) => {
        //console.log(events);
    }).then((events) => {

        for (value of events) {
            if (value.returnValues.pid == userProfile.id)
                this.addTran(value.blockNumber, "Redeem", value.returnValues.user, value.returnValues.pName, value.returnValues.amount, transData)
        }
    });

    await contract.getPastEvents('EarnToken', {
        fromBlock: 0,
        toBlock: 'latest'
    }, (error, events) => {
        //console.log(events);
    }).then((events) => {
        for (value of events) {
            if (value.returnValues.pid == userProfile.id)
                this.addTran(value.blockNumber, "Earn", value.returnValues.pName, value.returnValues.user, value.returnValues.amount, transData)
        }
    });
    transData.sort(compare);
    for (const tran of transData) {
        let block = await web3.eth.getBlock(tran.blockNum);
        let d = new Date(block.timestamp * 1000);
        tran.time = d.toLocaleString();
    }

    res.render('tran', {
        trans: transData,
        title: 'Partners Record',
        balance: balance
    });
});

router.get('/partners-record', secured(), async function (req, res, next) {
    const {_raw, _json, ...userProfile} = req.user;
    let transData = [];


    await contract.getPastEvents('AddPartnerBalance', {
        fromBlock: 0,
        toBlock: 'latest'
    }, (error, events) => {
        //console.log(events);
    }).then((events) => {

        for (value of events) {
            this.addPartnerDepos(value.blockNumber, value.returnValues.pName, value.returnValues.amount, transData)
        }
    });


    transData.sort(compare);
    for (const tran of transData) {
        let block = await web3.eth.getBlock(tran.blockNum);
        let d = new Date(block.timestamp * 1000);
        tran.time = d.toLocaleString();
    }

    let transData2 = [];
    await contract.getPastEvents('Redeem', {
        fromBlock: 0,
        toBlock: 'latest'
    }, (error, events) => {
        //console.log(events);
    }).then((events) => {

        for (value of events) {
            this.addTran(value.blockNumber, "Redeem", value.returnValues.user, value.returnValues.pName, value.returnValues.amount, transData2)
        }
    });

    await contract.getPastEvents('EarnToken', {
        fromBlock: 0,
        toBlock: 'latest'
    }, (error, events) => {
        //console.log(events);
    }).then((events) => {
        for (value of events) {
            this.addTran(value.blockNumber, "Earn", value.returnValues.pName, value.returnValues.user, value.returnValues.amount, transData2)
        }
    });

    transData.sort(compare);
    for (const tran of transData2) {
        let block = await web3.eth.getBlock(tran.blockNum);
        let d = new Date(block.timestamp * 1000);
        tran.time = d.toLocaleString();
    }


    res.render('record', {
        trans: transData,
        trans2: transData2,
        title: 'Partners Record'
    });
});

addTran = (blockNum, type, from, to, amount, array) => {
    let newTran = {
        blockNum: blockNum,
        type: type,
        from: from,
        to: to,
        amount: amount
    };
    array.push(newTran);
}

addRecord = (blockNum, amount, array) => {
    let newTran = {
        blockNum: blockNum,
        amount: amount
    };
    array.push(newTran);
}

addPartnerDepos = (blockNum, to, amount, array) => {
    let newTran = {
        blockNum: blockNum,
        amount: amount,
        to: to,
    };
    array.push(newTran);
}

function compare(a, b) {
    if (a.blockNum > b.blockNum) return -1;
    if (b.blockNum > a.blockNum) return 1;
    return 0;
}

module.exports = router
