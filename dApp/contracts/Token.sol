// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.7.0;
import "./contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
    address payable owner;

    constructor() ERC20("Union Money Token", "UMT") public{
        owner = msg.sender;
    }

    function mintToken(uint amount) public onlyOwner{
        _mint(msg.sender, amount);
    }
    modifier onlyOwner() {
        require(msg.sender == owner, "Only Admin call call this function");
        _;
    }
}
