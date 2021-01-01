const Betting = artifacts.require("Betting");
const Token = artifacts.require("Token");
const Oracle = artifacts.require("Oracle");

require('chai').use(require('chai-as-promised')).should();

contract('Betting', function (accounts) {
    let betting, oracle, token;

    before(async () => {
        betting = await Betting.deployed();
        oracle = await Oracle.deployed();
        token = await Token.deployed();
    })

    describe('Oracle', async () => {
        it('Get Oracle Contract Address', async () => {
            console.log(`Oracle Address is ${oracle.address}`);
        })
    })


    describe("token", async () => {
        it('Send Betting/Oracle contract to Token', async () => {
            await token.proposeContract(betting.address, oracle.address);
        })

        it('Finalize Betting/Oracle contract to Token', async () => {
            await token.processVote();
        })

        it('Authorize Oracle Token', async () => {
            await token.approve(oracle.address, "100000000000000000000000");
        })
    })

    describe("Oracle Operations", async () => {
        it("Deposit Tokens in Oracle Contract", async () => {
            await oracle.depositTokens("100000000000000000000000");
        })

        it("send initial data", async () => {
            await oracle.initPost(["NFL:Ariz:Lv", "NFL:Atl:LAC", "NFL:Bal:LAR", "NFL:Buf:Mia", "NFL:Car:Min", "NFL:Chi:NE", "NFL:Cin:NO", "NFL:Cle:NYG", "NFL:Dal:NYJ", "NFL:Den:Phi", "NFL:Det:Pitt", "NFL:GB:SF", "NFL:Hou:Sea", "NFL:Ind:TB", "NFL:Jac:Ten", "NFL:Kan:Wash", "UFC:Figueiredo:Moreno", "UFC:Oliveira:Ferguson", "UFC:Dern:Jandiroba", "UFC:Holland:Souza", "UFC:Gane:dosSantos", "UFC:Swanson:Pineda", "NA:NA:NA", "NA:NA:NA", "NA:NA:NA", "NA:NA:NA", "NA:NA:NA", "NA:NA:NA", "NA:NA:NA", "NA:NA:NA", "NA:NA:NA", "NA:NA:NA"], [1619466400, 1619466400, 1619466400, 1618843600, 1619466400, 1618843600, 1619466400, 1619466400, 1619466400, 1618843600, 1619466400, 1619466400, 1619466400, 1619466400, 1619466400, 1619466400, 1619466400, 1619466400, 1619466400, 1619466400, 1619466400, 1619466400, 1618843600, 1618843600, 1618843600, 1618843600, 1618843600, 1618843600, 1618843600, 1618843600, 1618843600, 1618843600], [909, 1500, 1000, 2450, 909, 1505, 2505, 1005, 909, 1505, 1005, 1005, 909, 1505, 2505, 1005, 1005, 1005, 1005, 1005, 1005, 1005, 1005, 1005, 1005, 1005, 1005, 1005, 1005, 1005, 1005, 1000], 1619466400);
        })

        it("Finalize Initial Data", async () => {
            await oracle.initProcess();
        })
        it("Fund Betting Contract", async () => {
            await betting.fundBook({ from: accounts[0], value: '100000000000000000' });
        })

    });

    describe("Send Some Bets", async () => {
        it("Send Wrong Bet (Excess Amount Should Fail)", async () => {
            // 50 finney
            await betting.bet(0, 0, { from: accounts[1], value: '50000000000000000' });
        })

        it("Send Correct Bet #1", async () => {
            // 10 finney
            await betting.bet(0, 0, { from: accounts[1], value: '10000000000000000' });
        })

        it("Send Correct Bet #2", async () => {
            // 15 finney
            await betting.bet(0, 1, { from: accounts[1], value: '15000000000000000' });
        })

        it("Send Correct Bet #3", async () => {
            // 10 finney
            await betting.bet(0, 0, { from: accounts[1], value: '10000000000000000' });
        })

        let contractHash;
        it("Offer Big Bet", async () => {
            // 100 finney
            const result = await betting.betBig(1, 0, { from: accounts[1], value: '100000000000000000' });
            contractHash = result.logs[0].args.contractHash;
        })

        it("Take Big Bet", async () => {
            // 100 finney
            await betting.takeBig(contractHash, { from: accounts[1], value: '150000000000000000' });
        })
    })

    describe("Oracle Result", async () => {
        it("Send Event Results", async () => {
            await oracle.settlePost([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
        });

        it("send initial data", async () => {
            await oracle.settleProcess();
        });
    })

    describe("Get Final Data", async () => {
        it("Check State Variables in Betting Contract", async () => {
            const result = await betting.showMargin();
            const { unusedCapital, usedCapital, betCapital, oraclBalance, redeemPot, kontractEthBal } = result;
            console.log(`\nUnused Capital = ${unusedCapital.toNumber()}`);
            console.log(`Used Capital = ${usedCapital.toNumber()}`);
            console.log(`Bet Capital = ${betCapital.toNumber()}`);
            console.log(`Oracle Capital = ${oraclBalance.toNumber()}`);
            console.log(`Redeem Pot = ${redeemPot.toNumber()}`);
            console.log(`Contract Eth Balance = ${kontractEthBal.toNumber()}\n`);
        })
    })
})
