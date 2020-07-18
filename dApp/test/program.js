const Token = artifacts.require("./Token.sol");
const Program = artifacts.require("./Program.sol");


contract("Program", ([deployer, user1]) => {

    let token, program;

    before(async () => {
        //token = await Token.new();
        //program = await Program.new(token.address);

        token = await Token.deployed();
        program = await Program.deployed();

        //token = await Token.at("0x256DbD3c41045c101636b0Ec33B2cbf8D1F710F7");
        //program = await Program.at("0x256DbD3c41045c101636b0Ec33B2cbf8D1F710F7");

    })

    it("Transfer token to deployer", async () => {
        const value = 10000000;

        // Set value of 89
        await token.mintToken(value, {from: deployer});

        // Get stored value
        let balance = await token.balanceOf(deployer);

        assert.equal(balance, value);
    });

    it("Add 1 Partner", async () => {
        const partnerId = 1;
        const partnerName = "First Store"


        await program.addPartner(partnerId, partnerName, {from: deployer});

        let name = await program.getPartnerName([partnerId], {from: deployer});

        assert.equal(partnerName, name);
    });

    it("Fund Partner", async () => {
        const partnerId = 1;
        const fundAmount = 100000

        await token.approve(program.address, fundAmount, {from: deployer});
        await program.addPartnerBalance(partnerId, fundAmount, {from: deployer});

        let partnerBalance = await program.getPartnerBalance(partnerId, {from: deployer});

        assert.equal(fundAmount, partnerBalance);
    });

    it("1 User Earn Token", async () => {
        const partnerId = 1;
        const amount = 100

        await program.earnPoint(partnerId, user1, amount, {from: deployer});

        const balance = await program.getUserBalance(user1, {from: deployer});

        assert.equal(amount, balance);
    });

    it("User Withdraw Token", async () => {
        const amount = 100

        let contractBalance = await program.getMyBalance({from: user1});

        assert.equal(amount, contractBalance);

        await program.userWithdrawToken(amount, {from: user1});

        let balance = await token.balanceOf(user1);
        assert.equal(amount, balance);

        contractBalance = await program.getMyBalance({from: user1});
        assert.equal(0, contractBalance);
    });

    it("User Deposit Token", async () => {
        const amount = 100

        await token.approve(program.address, amount, {from: user1});
        await program.userDepositToken(amount, {from: user1});

        let contractBalance = await program.getMyBalance({from: user1});
        let balance = await token.balanceOf(user1);


        assert.equal(amount, contractBalance);
        assert.equal(0, balance);
    });

    /*
    it("Redeem Token", async () => {
        let oldUserBalance = await program.getMyBalance({from: user1});
        let oldPartnerBalance = await program.getPartnerBalance(1, {from: deployer});

        const amount = 50
        const nonce = Math.floor(new Date().getTime());
        const pid = 1;

        //client side
        await signPayment(amount, nonce, program.address);

        //partner side
        //await program.redeemToken(amount, nonce, signature, user1, pid, {from: deployer});

        //let newUserBalance = await program.getMyBalance({from: user1});
        //let newPartnerBalance = await program.getPartnerBalance(1, {from: deployer});

        //console.log(newUserBalance);
        //console.log(newPartnerBalance);
        //console.log("DSDSS")

        //assert.equal(50, newUserBalance, "user balance");
        //assert.equal(oldPartnerBalance + amount, newPartnerBalance, "partnerbalance");

        assert.equal(1,1);
    });

    let signature;
    var signatureRPC;
    async function signPayment(amount, nonce, contractAddress) {
        let hash = web3.utils.soliditySha3(amount, nonce, contractAddress);

        //await web3.eth.personal.sign(hash, web3.eth.defaultAccount, (a) => (signature = a));

        signature = ethUtil.ecsign(hash, new Buffer(privateKey, 'hex'));
        //var signatureRPC = EthUtil.toRpcSig(signature.v, signature.r, signature.s)
    }
**/

    /*
    it("...should store the value 89.", async () => {

        const simpleStorageInstance = await SimpleStorage.deployed();

        // Set value of 89
        await simpleStorageInstance.set(89, { from: accounts[0] });

        // Get stored value
        const storedData = await simpleStorageInstance.get.call();

        assert.equal(storedData, 89, "The value 89 was not stored.");
    });
    */

});
