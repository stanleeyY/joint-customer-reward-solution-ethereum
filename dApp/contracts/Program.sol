// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.7.0;

import './Token.sol';

contract Program {
    Token public token;
    address payable admin;

    event Redeem(string indexed inpid, string pid, string pName, address indexed user, uint amount);
    event EarnToken(string indexed inpid, string pid, string pName, address indexed user, uint amount);
    event UserWithdraw(address indexed user, uint amount);
    event UserDeposit(address indexed user, uint amount);

    event AddNewPartner(string indexed inpid, string pid);
    event AddPartnerBalance(string indexed inpid, string pid, string pName, uint amount);

    mapping(string => Partner) public partnerMap;
    mapping(address => User) public userMap;

    struct Partner {
        string id;
        string name;
        uint balance;
        bool isActive;
    }

    struct User {
        address payable wallet;
        uint balance;
        string name;
        string contact;
        bool active;

        mapping(uint256 => bool) usedNonces;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only Admin call call this function");
        _;
    }

    function getUserBalance(address userAddress) public onlyAdmin view returns (uint balance){
        return userMap[userAddress].balance;
    }

    function getMyBalance() public view returns (uint balance){
        return userMap[msg.sender].balance;
    }

    function getPartnerBalance(string memory pid) public onlyAdmin view returns (uint balance) {
        return partnerMap[pid].balance;
    }

    function getPartnerActive(string memory pid) public view returns (bool isActive) {
        return partnerMap[pid].isActive;
    }

    function getPartnerName(string memory pid) public view returns (string memory name) {
        return partnerMap[pid].name;
    }

    function addPartner(string memory pid, string memory _name) public onlyAdmin {
        partnerMap[pid] = Partner({id : pid, name : _name, balance : 0, isActive : true});
        emit AddNewPartner(pid, pid);
    }

    function addPartnerBalance(string memory pid, uint amount) public onlyAdmin {
        token.transferFrom(msg.sender, address(this), amount);
        partnerMap[pid].balance += amount;
        emit AddPartnerBalance(pid, pid, partnerMap[pid].name, amount);
    }

    function earnToken(string memory pid, address payable receiver, uint amount) public onlyAdmin {
        Partner storage sender = partnerMap[pid];
        User storage user = userMap[receiver];

        sender.balance -= amount;
        user.balance += amount;

        emit EarnToken(pid, pid, sender.name, receiver, amount);
    }

    function userWithdrawToken(uint amount) public {
        User storage user = userMap[msg.sender];

        require(user.balance >= amount, "Exceed Max available amount");

        user.balance -= amount;
        token.transfer(msg.sender, amount);

        emit UserWithdraw(msg.sender, amount);
    }

    function userDepositToken(uint amount) public {
        require(token.balanceOf(msg.sender) >= amount);

        User storage user = userMap[msg.sender];
        token.transferFrom(msg.sender, address(this), amount);

        user.balance += amount;

        emit UserDeposit(msg.sender, amount);
    }

    constructor(Token _token) public {
        token = _token;
        admin = msg.sender;
    }

    function redeemToken(uint256 amount, uint256 nonce, address userAddress, bytes memory signature, string memory pid) public onlyAdmin {
        User storage user = userMap[userAddress];
        Partner storage partner = partnerMap[pid];

        require(user.usedNonces[nonce] == false, "nonce is used");
        user.usedNonces[nonce] = true;

        // this recreates the message that was signed on the client
        bytes32 message = prefixed(keccak256(abi.encodePacked(amount, nonce, this)));

        require(recoverSigner(message, signature) == userAddress, "Signer not match");

        require(amount > 0, "amount is <= 0");
        require(user.balance >= amount, "User don't have enough token to redeem!");
        require(partner.isActive = true, "Partner is not active");

        partner.balance += amount;
        user.balance -= amount;

        emit Redeem(pid, pid, partner.name, userAddress, amount);
    }

    /// signature methods. ref from https://solidity.readthedocs.io/en/v0.6.11/solidity-by-example.html#micropayment-channel
    function splitSignature(bytes memory sig)
    internal
    pure
    returns (uint8 v, bytes32 r, bytes32 s)
    {
        require(sig.length == 65);

        assembly {
        // first 32 bytes, after the length prefix.
            r := mload(add(sig, 32))
        // second 32 bytes.
            s := mload(add(sig, 64))
        // final byte (first byte of the next 32 bytes).
            v := byte(0, mload(add(sig, 96)))
        }
        return (v, r, s);
    }

    function recoverSigner(bytes32 message, bytes memory sig)
    internal
    pure
    returns (address)
    {
        (uint8 v, bytes32 r, bytes32 s) = splitSignature(sig);
        return ecrecover(message, v, r, s);
    }

    /// builds a prefixed hash to mimic the behavior of eth_sign.
    function prefixed(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }

    /// destroy the contract and reclaim the leftover funds.
    function shutdown() public onlyAdmin {
        selfdestruct(msg.sender);
    }

    function hashSeriesNumber(string memory series, uint256 number) internal pure returns (bytes32)
    {
        return keccak256(abi.encode(number, series));
    }
}

