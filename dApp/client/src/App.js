import React, {Component} from "react";
import ProgramContract from "./contracts/Program.json";
import TokenContract from "./contracts/Token.json";
import MaUTable from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import getWeb3 from "./getWeb3";
import ReactDOM from 'react-dom';

import {CopyToClipboard} from 'react-copy-to-clipboard';

import './App.css';
import {
    useTable,
    useGroupBy,
    useFilters,
    useSortBy,
    useExpanded,
    usePagination
} from 'react-table'

var abi = require('ethereumjs-abi')
var QRCode = require('qrcode.react');
let web3;
let accounts;
let instance;
let instance2;
let waitTime = 1000;
let signData = [];

let transData = [];

const columns = [
    {
        Header: "Transaction Records",
        columns: [
            {
                Header: "Date",
                accessor: "time"
            },
            {
                Header: "Type",
                accessor: "type"
            },
            {
                Header: "From",
                accessor: "from"
            },
            {
                Header: "To",
                accessor: "to"
            },
            {
                Header: "Amount",
                accessor: "amount"
            }
        ]
    }
];

const Table = ({columns, data}) => {
    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        rows,
        prepareRow
    } = useTable({
        columns,
        data
    });

    return (
        <MaUTable {...getTableProps()}>
            <TableHead>
                {headerGroups.map(headerGroup => (
                    <TableRow {...headerGroup.getHeaderGroupProps()}>
                        {headerGroup.headers.map(column => (
                            <TableCell {...column.getHeaderProps()}>
                                {column.render("Header")}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableHead>
            <TableBody>
                {rows.map((row, i) => {
                    prepareRow(row);
                    return (
                        <TableRow {...row.getRowProps()}>
                            {row.cells.map(cell => {
                                return (
                                    <TableCell {...cell.getCellProps()}>
                                        {cell.render("Cell")}
                                    </TableCell>
                                );
                            })}
                        </TableRow>
                    );
                })}
            </TableBody>
        </MaUTable>
    );
};

function compare(a, b) {
    if (a.blockNum > b.blockNum) return -1;
    if (b.blockNum > a.blockNum) return 1;
    return 0;
}

class App extends Component {

    state = {
        platformBalance: 0,
        walletBalance: 0,
        web3: null,
        accounts: null,
        contract: null,
        tokenContract: null,
        redeemSignature: null,
        redeemAmount: "",
        depositAmount: "",
        withdrawAmount: "",
        fullSignData: [],
        depositSuccess: false,
        depositSuccessAmount: 0,
        withdrawSuccess: false,
        withdrawSuccessAmount: 0,
        eventList: [],
    };

    componentDidMount = async () => {
        try {
            // Get network provider and web3 instance.
            web3 = await getWeb3();

            // Use web3 to get the user's accounts.
            accounts = await web3.eth.getAccounts();

            // Get the contract instance.
            const networkId = await web3.eth.net.getId();
            const deployedNetwork = ProgramContract.networks[networkId];
            const deployedNetwork2 = TokenContract.networks[networkId];
            instance = new web3.eth.Contract(
                ProgramContract.abi,
                deployedNetwork && deployedNetwork.address,
            );

            instance2 = new web3.eth.Contract(
                TokenContract.abi,
                deployedNetwork2 && deployedNetwork2.address,
            );

            // Set web3, accounts, and contract to the state, and then proceed with an
            // example of interacting with the contract's methods.
            this.setState({web3, accounts, contract: instance, tokenContract: instance2}, this.runExample);
        } catch (error) {
            // Catch any errors for any of the above operations.
            alert(
                `Failed to load web3, accounts, or contract. Check console for details.`,
            );
            console.error(error);
        }

        this.handleRedeemChange = this.handleRedeemChange.bind(this);
        this.handleDepositChange = this.handleDepositChange.bind(this);
        this.handleWithdrawChange = this.handleWithdrawChange.bind(this);

        setInterval(this.refreshBalance, 4000);
    };

    runExample = async () => {
        const {accounts, contract, tokenContract} = this.state;

        // Stores a given value, 5 by default.
        //await contract.methods.set(5).send({ from: accounts[0] });

        this.refreshBalance();
    };


    signPayment = async (amount, nonce, contractAddress, signer) => {
        const hash = "0x" + abi.soliditySHA3(
            ["uint256", "uint256", "address"],
            [amount, nonce, contractAddress]
        ).toString("hex");

        console.log(contractAddress)
        await web3.eth.personal.sign(hash, signer, "", (err, value) => {
            this.setState({redeemSignature: value, fullSignData: [amount, nonce, signer, value]});

        });
    }

    GetQRCode = () => {
        const {accounts, redeemSignature, fullSignData} = this.state;
        if (redeemSignature != null) {
            return (
                <div>
                    <CopyToClipboard text={this.state.fullSignData.join()}>
                        <span><a className="button is-link">
                                    Copy redeem signature to clipboard
                                </a></span>
                    </CopyToClipboard>
                    <br/>
                    <br/>
                    <QRCode value={fullSignData.join()}/>

                </div>);
        }
        return null;
    }

    GetDepositHTML = () => {
        const {depositSuccess, depositSuccessAmount} = this.state;
        if (depositSuccess) {
            return <p>"Deposit Success! Transferred {depositSuccessAmount} from wallet to platform account"</p>;
        }
        return null;
    }

    GetWithdrawHTML = () => {
        const {withdrawSuccess, withdrawSuccessAmount} = this.state;
        if (withdrawSuccess) {
            return <p>"Withdraw Success! Transferred {withdrawSuccessAmount} from platform to your wallet"</p>;
        }
        return null;
    }

    loadHistory = async () => {
        transData = [];
        const {accounts, contract, withdrawAmount} = this.state;

        await contract.getPastEvents('Redeem', {
            filter: {user: accounts[0]},
            fromBlock: 0,
            toBlock: 'latest'
        }, (error, events) => {
            //console.log(events);
        }).then((events) => {
            events.forEach(this.redeemToTran)
        });

        await contract.getPastEvents('EarnToken', {
            filter: {user: accounts[0]},
            fromBlock: 0,
            toBlock: 'latest'
        }, (error, events) => {
            //console.log(events);
        }).then((events) => {
            events.forEach(this.earnTokenToTran)
        });

        await contract.getPastEvents('UserWithdraw', {
            filter: {user: accounts[0]},
            fromBlock: 0,
            toBlock: 'latest'
        }, (error, events) => {
            console.log(events);
        }).then((events) => {
            events.forEach(this.withdrawToTran);
        });

        await contract.getPastEvents('UserDeposit', {
            filter: {user: accounts[0]},
            fromBlock: 0,
            toBlock: 'latest'
        }, (error, events) => {
            //console.log(events);
        }).then((events) => {
            events.forEach(this.depositToTran);
        });
        transData.sort(compare);

        for (const tran of transData) {
            await web3.eth.getBlock(tran.blockNum).then((block) => {
                let d = new Date(block.timestamp * 1000);
                tran.time = d.toLocaleString();
            });
        }
        this.setState({eventList: transData});
    }
    redeemToTran = (value, index, array) => {
        this.addTran(value.blockNumber, "Redeem", "Platform wallet", value.returnValues.pName, value.returnValues.amount)
    }
    earnTokenToTran = (value, index, array) => {
        this.addTran(value.blockNumber, "Earn", value.returnValues.pName, "Platform wallet", value.returnValues.amount)
    }

    withdrawToTran = (value, index, array) => {
        this.addTran(value.blockNumber, "Withdraw", "Platform wallet", value.returnValues.user, value.returnValues.amount)
    }

    depositToTran = (value, index, array) => {
        this.addTran(value.blockNumber, "Deposit", value.returnValues.user, "Platform wallet", value.returnValues.amount)
    }

    addTran = (blockNum, type, from, to, amount) => {
        let newTran = {
            blockNum: blockNum,
            type: type,
            from: from,
            to: to,
            amount: amount
        };
        transData.push(newTran);
    }

    clickRedeem = async (e) => {
        e.preventDefault();
        const {accounts, contract, redeemAmount} = this.state;
        let timeForSign = new Date().getTime();

        signData = [redeemAmount, timeForSign, contract.address, accounts[0]];
        await this.signPayment(redeemAmount, timeForSign, contract._address, accounts[0]);
    };
    clickDeposit = async (e) => {
        e.preventDefault();
        const {accounts, contract, tokenContract, depositAmount} = this.state;

        tokenContract.methods.approve(contract._address, depositAmount).send({from: accounts[0]}, (error, transactionHash) => {
            if (error) return console.error('Error', error)
            contract.methods.userDepositToken(depositAmount).send({from: accounts[0]}, (error, transactionHash) => {
                if (error) return console.error('Error', error)
                this.setState({depositSuccess: true, depositSuccessAmount: depositAmount});

                // setTimeout(() => {
                //     this.refreshBalance();
                // }, waitTime);

            });
        });
    };

    clickWithdraw = async (e) => {
        e.preventDefault();
        const {accounts, contract, withdrawAmount} = this.state;

        contract.methods.userWithdrawToken(withdrawAmount).send({from: accounts[0]}, (error, transactionHash) => {
            if (error) return console.error('Error', error)

            this.setState({withdrawSuccess: true, withdrawSuccessAmount: withdrawAmount})

            /*
                        setTimeout(() => {
                            this.refreshBalance();
                        }, waitTime);
                        */
        });
    };

    refreshBalance = () => {
        this.loadHistory();
        const {accounts, contract, tokenContract} = this.state;
        // Get the value from the contract to prove it worked.
        contract.methods.getMyBalance().call({from: accounts[0]}, (error, value) => {
            if (error) return console.error('Error', error)
            this.setState({platformBalance: value});

        });

        tokenContract.methods.balanceOf(accounts[0]).call({from: accounts[0]}, (error, value) => {
            if (error) return console.error('Error', error)
            this.setState({walletBalance: value});
        });
    }

    handleRedeemChange = (event) => {
        this.setState({redeemAmount: event.target.value});
    }

    handleDepositChange = (event) => {
        this.setState({depositAmount: event.target.value});
    }

    handleWithdrawChange = (event) => {
        this.setState({withdrawAmount: event.target.value});
    }

    render() {
        if (!this.state.web3) {
            return <div>Loading Web3, accounts, and contract...</div>;
        }
        return (


            <section className="section">
                <div className="container">


                    <div className="columns is-mobile has-text-centered">

                        <div className="column is-half is-offset-one-quarter">
                            <h2 className="title">Union Money</h2>
                            <p>The platform balance: {this.state.platformBalance}</p>
                            <p>The wallet balance: {this.state.walletBalance}</p>

                            <h2>User QR Code:</h2>
                            <QRCode value={this.state.accounts[0]}/>

                            <div>
                                <h1>Redeem</h1>

                                <label>
                                    Redeem amount:
                                    <input type="number" value={this.state.redeemAmount}
                                           onChange={this.handleRedeemChange}
                                           required/>
                                </label>
                                <br/>

                                <a className="button is-primary" onClick={this.clickRedeem}>
                                    Submit
                                </a>

                                <p>
                                    {/*{this.state.fullSignData.join()}*/}
                                </p>
                                <this.GetQRCode/>
                            </div>

                            <div>
                                <h1>Deposit</h1>

                                <label>
                                    Deposit amount:
                                    <input type="number" value={this.state.depositAmount}
                                           onChange={this.handleDepositChange}
                                           required/>
                                </label>
                                <br/>

                                <a className="button is-primary" onClick={this.clickDeposit}>
                                    Submit
                                </a>
                                <this.GetDepositHTML/>
                            </div>

                            <div>
                                <h1>Withdraw</h1>

                                <label>
                                    Withdraw amount:
                                    <input type="number" value={this.state.withdrawAmount}
                                           onChange={this.handleWithdrawChange}
                                           required/>
                                </label>
                                <br/>

                                <a className="button is-primary" onClick={this.clickWithdraw}>
                                    Submit
                                </a>

                                <this.GetWithdrawHTML/>
                            </div>

                        </div>
                    </div>
                    <Table columns={columns} data={this.state.eventList}/>
                </div>
            </section>
        );
    }
}

export default App;
