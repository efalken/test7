pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

import "./Token.sol";

/**
SPDX-License-Identifier: MIT
Copyright © 2020 Eric G. Falkenstein

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, andor sell copies of the Software,
and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
OR OTHER DEALINGS IN THE SOFTWARE.
*/

contract Betting {
    address public admin;
    bool public adminPower;

    constructor(address payable tBAddress) {
        // constructor() {
        minBet = 1e15;
        concentrationLimit = 5;
        betEpoch = 1;
        token = Token(tBAddress);
        // oracleAdmin = payable(
        //     address(new Oracle(payable(address(this)), tBAddress))
        // );
        admin = msg.sender;
        adminPower = true;
    }

    function setOracleAddress(address payable _oracleAddress) public {
        require(msg.sender == admin, "Only Admin Can Perform This Operation");
        require(adminPower, "Oracle Address is already Set");
        oracleAdmin = _oracleAddress;
        adminPower = false;
    }

    // after each settlement, a new epoch commences. Bets cannot consummate on games referring to prior epochs
    uint8 public betEpoch;
    // this counter is used to make bet IDs unique
    uint32 public nonce;
    // Schedule is a string where Sport:homeTeam:awayTeam
    // eg, "NFL:Minnesota:Chicago"
    string[32] public teamSchedule;
    // odds are entered as decimal odds, such that 1.909 is 909, and 2.543 is 1543.   (decOdds/1000+1) is the total payoff for a winning bet,
    // consisting of a profit of decOdds/1000 and a return of the bet.
    uint256[32] public decOdds;
    // startTime in UTC is used to stop active betting. If a game is postponed, it may be updated. No bets are taken after this time.
    uint256[32] public startTime;
    // this is the amount bet on each team to win, and so via the schedule. A 'short' would be on the opponent to win.
    uint256[32][2] public betLong;
    // this is the amount payable to bettors by the contract should their pick win. It is used to determine how much to set
    // aside for future redemptions at settle.
    uint256[32][2] public betPayout;
    // the tokens sent to the contract initially are for distribution to liquidity providers at the end of the season.
    // Linking to the token contract allows this contract to distribute those shares. No shares are deposited in this contract.
    // tokens claimed go straight to the liquidity provider (LP) account.
    Token public token;
    // 0 LP unused capital, 1 LP used Capital, 2 bettor capital, 3 eth reserved for redepmption by bettors
    // margins 1 and 2 are zeroed out each settlement, and adjusted when betting commences
    uint256[4] public margin;
    // this is the only ethereum account that can adjust parameters, set odds, schedule, etc. There is no other party with access to
    // methods that affect payouts
    address payable public oracleAdmin;
    // totalShares is used to monitor an LP's share of LP eth in the contract. These are not tokens, they are just used for internal
    // accounting of the LP's percent ownership of the vig implied by the odds.
    uint256 public totalShares;
    // this is a parameter for a minimum bet, which can be adjusted by the oracle/admin.
    uint256 public minBet;
    // this is used to stop LP funding, because once a game starts, the unused capital account could be worth zero or double
    // based on what happened in the game, and LPs would have an incentive to zero-out of invest too much
    uint256 public earliestStart;
    // this is a parameter for a maximum bet exposure. If LP capital is X, X/concentrationLimit is the largest absolute net
    // exposure for any game. At that point, only bets decreasing the LP exposure are permitted. This prevents a situation where
    // one game uses up all the LP capital for a epoch. It should be adjusted during the playoff, as the number of games will
    // obviously decrease
    uint256 public concentrationLimit;
    // this keeps record of the eth apportioned to the Oracle/Admin. The oracle token holders can pull this over to the oracle contract
    // at any time, as it cannot be accessed by any other party
    uint256 public oracleBalance;
    // this struct holds each bettor's bet contract parameters
    mapping(bytes32 => Subcontract) public subcontracts;
    // this struct holds a big bet's bet parameters, its contractID will become the offeror's bet ID if taken
    // if taken, the offercontract is deleted
    mapping(bytes32 => Offercontract) public offercontracts;
    // this maps the hash of (team number, epoch) to that team/epoch's outcome, where 0 is a loss, 1 is a tie or postponement, 2 a win
    // The outcome defaults to 0, so that initially, when contract epoch = current epoch, all games are 0, When the contract epoch< current epoch,
    // 0 represents a loss
    mapping(bytes32 => uint8) public pickEpochResult;
    // This keeps track of an LP's ownership in the LP ether capital, and also its date of investment to encourage vesting for
    // claiming tokens
    mapping(address => LPStruct) public lpStruct;

    struct Subcontract {
        uint8 pick;
        uint8 matchNum;
        uint8 epoch;
        address bettor;
        uint256 betAmount;
        // the payoff is betAmount * odds/1000, a winning bet gets back its betAmount + payoff
        uint256 payoff;
    }

    struct Offercontract {
        uint8 pick;
        uint8 matchNum;
        uint8 epoch;
        address bettor;
        uint256 betAmount;
        // the payoff here is for the one placing the offer, so if Odds are 909, its payoff is betAmount * 909/1000
        // given the way the opposite side's odds are calculated, this payoff then is equivalent to the bet amount
        // offered to the opponent. In this way we can be certain no LP capital is needed to collateralize the bet.
        uint256 payoff;
        // these are the odds offered for the opponent of the "pick" above, which is the offeror's team
        uint256 oddsOffered;
    }

    struct LPStruct {
        uint256 shares;
        uint8 epoch;
    }

    event BetRecord(
        bytes32 indexed contractHash,
        address indexed bettor,
        uint8 epoch,
        uint8 pick,
        uint8 matchnum,
        uint256 timestamp,
        uint256 betsize,
        uint256 payoff
    );

    event BetBigRecord(
        bytes32 indexed contractHash,
        address indexed bettor,
        uint8 epoch,
        uint8 pick,
        uint8 matchnum,
        uint256 timestamp,
        uint256 betsize,
        uint256 payoff,
        uint256 oddsOffered
    );

    modifier onlyAdmin() {
        require(oracleAdmin == msg.sender);
        _;
    }

    function fundBook() external payable {
        // not allowed when games are played because that game results affect the value of 'house' shares
        // not reflected in the house eth value, so when games start, no LP withdrawal or funding is _allowed
        // at settlement 'earliestStart' is set to 2e9, which is well into the future, so LPs can WD or fund again
        require(
            block.timestamp < earliestStart,
            "not between game start and settle"
        );
        uint256 netinvestment = msg.value;
        uint256 _shares = 0;
        if (margin[0] > 0) {
            // investors receive shares marked at fair value, the current shares/eth ratio for all
            // LP's eth in the book is the sum of pledged, margin[1], and unpledged, margin[0], eth
            _shares = mul(netinvestment, totalShares) / (margin[0] + margin[1]);
        } else {
            _shares = netinvestment;
        }
        margin[0] += msg.value;
        // adding funds to an account resets the 'start date' relevant for withdrawal and claiming tokens
        lpStruct[msg.sender].epoch = betEpoch;
        totalShares += _shares;
        lpStruct[msg.sender].shares += _shares;
    }

    receive() external payable {}

    function withdrawBook(uint256 sharesToSell) external {
        // same reason as given above in fundBook
        require(
            block.timestamp < earliestStart,
            "not between game start and settle"
        );
        require(
            lpStruct[msg.sender].shares >= sharesToSell,
            "user does not have this many shares"
        );
        // investors can only cashout after investing for at least 3 epochs, this allows LPs to better anticipate the
        // economics of investing as an LP
        require(betEpoch - lpStruct[msg.sender].epoch > 0);
        // margin[0] + margin[1] is the total eth amount of the LPs
        uint256 ethTrans =
            mul(sharesToSell, (margin[0] + margin[1])) / totalShares;
        // one can withdraw at any time during the epoch, but only if the LP eth balances that are
        // unpledged, or free, and not acting as collateral
        require(ethTrans <= margin[0], "can only withdraw unpledged capital");
        totalShares -= sharesToSell;
        lpStruct[msg.sender].shares -= sharesToSell;
        margin[0] -= ethTrans;
        payable(msg.sender).transfer(ethTrans);
    }

    function claimTokens() external {
        // This is a bonus for initial LPs
        // can start claiming the 1 million tokens in this contract, with 400 tokens per eth deposited
        // only those who have been LPs for 3 epochs are allowed to claim tokens
        // LPs can claim this bonus more than once if no other LPs arise
        require(betEpoch - lpStruct[msg.sender].epoch > 1);
        uint256 contractTokens = token.balanceOf(address(this));
        uint256 tokenTrans = 50 * lpStruct[msg.sender].shares;
        if (tokenTrans > contractTokens) {
            tokenTrans = contractTokens;
        }
        // the LP is reset at the current epoch, so no need to withdraw and
        // deposit to get in line for the next distribution
        lpStruct[msg.sender].epoch = betEpoch;
        token.transfer(msg.sender, tokenTrans);
    }

    function betTokens(uint256 _minbet, uint256 _maxPos) external onlyAdmin {
        minBet = _minbet * 1e15;
        concentrationLimit = _maxPos;
    }

    function adjustParams(uint256 _minbet, uint256 _maxPos) external onlyAdmin {
        minBet = _minbet * 1e15;
        concentrationLimit = _maxPos;
    }

    function withdrawOracle() external {
        uint256 amt = oracleBalance;
        oracleBalance = 0;
        oracleAdmin.transfer(amt);
    }

    function bet(uint8 matchNumber, uint8 pickLong) external payable {
        require(msg.value >= minBet, "bet below minimum");
        require(
            startTime[matchNumber] > block.timestamp,
            "game started or team not playing"
        );
        // current LP exposure if team/player wins, which is the net of the LP obligation to the winner minus
        // the amount bet on the opponent that will be available to the LPs
        // note for arrays, the arguments are [team][match], where team is either 0 or 1, and matches run from 0 to 31
        int256 netPosTeam0 =
            int256(betPayout[pickLong][matchNumber]) -
                int256(betLong[1 - pickLong][matchNumber]);
        // current liability of LP if opponent team loses
        int256 netPosOpponent0 =
            int256(betPayout[1 - pickLong][matchNumber]) -
                int256(betLong[pickLong][matchNumber]);
        // this is the incremental, stand-alone liability from taking this bet, how much the LP's lose if this bet wins
        uint256 _payoff = (msg.value * odds(matchNumber, pickLong)) / 1000;
        // this function measures the change in the net liability from this bet, which is a function of how
        // much it changes the maximum liability for this match
        int256 marginChange =
            maxZero(
                int256(_payoff) + netPosTeam0,
                -int256(msg.value) + netPosOpponent0
            ) - maxZero(netPosTeam0, netPosOpponent0);
        // this checks to see that exposure on this one game is not too large
        // relative to the amount of LP eth in the contract
        require(
            int256(_payoff) + netPosTeam0 <
                int256((margin[0] + margin[1]) / concentrationLimit),
            "betsize over LP concentration limit"
        );
        // this  requires the LP has enough unpledged capital to cover the new bet
        require(
            marginChange <= int256(margin[0]),
            "betsize over LP unpledged capital"
        );
        // an incrementing nonce and timestamp make a unique bet hash ID
        bytes32 subkID = keccak256(abi.encodePacked(nonce, block.timestamp));
        Subcontract memory order;
        order.bettor = msg.sender;
        order.betAmount = msg.value;
        order.payoff = _payoff;
        order.pick = pickLong;
        order.matchNum = matchNumber;
        order.epoch = betEpoch;
        subcontracts[subkID] = order;
        // the bettor's eth is put into the bettor capital pot. This will be added to the LP's capital pot for
        // extracting payout amounts
        margin[2] += msg.value;
        // if the bet decreases net LP exposure to that game, eth moves from the LP's pledged capital, margin[1]
        // to the unpledged capital, margin[0]
        if (marginChange < 0) {
            margin[1] = sub(margin[1], uint256(-marginChange));
            margin[0] += uint256(-marginChange);
            // if the bet increases net LP exposure to that game, eth moves from unpledged capital
            // to the LP pledged capital from the unpledged capital
        } else {
            margin[1] += uint256(marginChange);
            margin[0] = sub(margin[0], uint256(marginChange));
        }
        // bet adds to the amount bet on team
        betLong[pickLong][matchNumber] += msg.value;
        // the payoff, or profit, paid by the LPs to the bettor if his team wins.
        // it is not paid in the case of a tie
        betPayout[pickLong][matchNumber] += _payoff;
        // increment nonce for subkID uniqueness
        nonce++;
        emit BetRecord(
            subkID,
            msg.sender,
            betEpoch,
            pickLong,
            matchNumber,
            block.timestamp,
            msg.value,
            _payoff
        );
    }

    // this method warehouses bets too large for the current book. They can be placed in hopes of finding another whale
    // they can be cancelled and funds fully refunded at any time if not taken.
    // If the epoch passes, the bet will not be available for takers, so the offeror should redeem it,
    //  this is possible at any time (there is no mechanism that pulls unclaimed eth at a later time to other parties)
    function betBig(uint8 _matchNum, uint8 _pickLong) external payable {
        require(startTime[_matchNum] > block.timestamp, "game started");
        bytes32 subkID = keccak256(abi.encodePacked(nonce, block.timestamp));
        Offercontract memory order;
        order.bettor = msg.sender;
        order.betAmount = msg.value;
        order.matchNum = _matchNum;
        order.payoff = (msg.value * odds(_matchNum, _pickLong)) / 1000;
        order.pick = _pickLong;
        order.oddsOffered = odds(_matchNum, 1 - _pickLong);
        order.epoch = betEpoch;
        offercontracts[subkID] = order;
        nonce++;
        emit BetBigRecord(
            subkID,
            msg.sender,
            betEpoch,
            _pickLong,
            order.matchNum,
            block.timestamp,
            order.betAmount,
            order.payoff,
            order.oddsOffered
        );
    }

    function takeBig(bytes32 subkid) external payable {
        Offercontract storage k = offercontracts[subkid];
        require(startTime[k.matchNum] > block.timestamp, "game started");
        require(
            msg.value >= k.payoff && k.epoch == betEpoch,
            "insufficient eth for betsize or bet for prior epoch"
        );
        // first we create the new bet of the initial bigbet proposer based on their original parameters
        Subcontract memory order;
        order.bettor = k.bettor;
        order.betAmount = k.betAmount;
        order.matchNum = k.matchNum;
        order.payoff = k.payoff;
        order.pick = k.pick;
        order.epoch = betEpoch;
        // the offeror's bet is recorded in this struct
        subcontracts[subkid] = order;
        emit BetRecord(
            subkid,
            order.bettor,
            betEpoch,
            order.pick,
            order.matchNum,
            block.timestamp,
            order.betAmount,
            order.payoff
        );
        // next we create the taker's bet, where the taker is long the offeror's opponent
        bytes32 subkID2 = keccak256(abi.encodePacked(nonce, block.timestamp));
        Subcontract memory order2;
        order2.bettor = msg.sender;
        // note the bet amount for the taker is identical to the payoff of the initial bet
        order2.betAmount = k.payoff;
        order2.payoff = (k.payoff * k.oddsOffered) / 1000;
        order2.matchNum = order.matchNum;
        order2.pick = 1 - k.pick;
        order2.epoch = betEpoch;
        // in these bets only bettor money is liable upon game outcome, so each side covers the liability to the other
        margin[2] += (k.betAmount + order2.betAmount);
        // this is the new gross liability to original bettor team if it wins
        betLong[order.pick][order.matchNum] += order.betAmount;
        betPayout[order.pick][order.matchNum] += order.payoff;
        // this is the new gross liability to this taker's team wins
        betLong[order2.pick][order2.matchNum] += order2.betAmount;
        betPayout[order2.pick][order2.matchNum] += order2.payoff;
        emit BetRecord(
            subkID2,
            msg.sender,
            betEpoch,
            order2.pick,
            order2.matchNum,
            block.timestamp,
            order2.betAmount,
            order2.payoff
        );
        // refunds non-trivial overpayments of bet in case someone inadvertantly overpays
        if (msg.value - order2.betAmount > 1e16) {
            payable(msg.sender).transfer(msg.value - order2.betAmount);
        }
        subcontracts[subkID2] = order2;
        nonce++;
        // deletes the old offer so it cannot be taken again
        delete offercontracts[subkid];
    }

    function killBig(bytes32 subkid2) external {
        Offercontract storage k = offercontracts[subkid2];
        // only the bettor can cancel his bet. Only a bet not yet taken can be cancelled
        // because when taken the struct offercontracts is deleted
        require(k.bettor == msg.sender, "not yours to cancel");
        uint256 refund = k.betAmount;
        delete offercontracts[subkid2];
        payable(msg.sender).transfer(refund);
    }

    function settle(uint8[32] memory winner) external onlyAdmin {
        // LP pledged capital, margin[1], and bettor funds, margin[2], are combined into a pot.
        // Whatever is not paid-out to the bettors is then transferred to the LPs.
        // require (block.timestamp > (earliestStart + 12 hours));
        uint256 housePot = margin[1] + margin[2];
        // this is the account tracking the sum of eth owed to bettors (wins and ties)
        // the amount the bettor can reclaim
        // eth used for bet collateral is set to zero at settlement for the next epoch
        uint256 redemptionPot = 0;
        // resets the margin accounts 'pledged LP capital' and bettor capital for the next epoch
        margin[1] = 0;
        margin[2] = 0;
        uint8 matchSlot;
        for (matchSlot = 0; matchSlot < 32; matchSlot++) {
            // this tracks the match outcome, and is assigned to reduce gas costs
            uint8 winningTeam = winner[matchSlot];
            require(winningTeam < 3);
            // if 0 or 1, there was a win
            if (winningTeam != 2) {
                redemptionPot +=
                    betPayout[winningTeam][matchSlot] +
                    betLong[winningTeam][matchSlot];
                // this unique match&epoch&team hash will map to a win, 2, allowing bettors to claim their winnings
                // via the redeem method.
                bytes32 hashMatchEpochWinner =
                    keccak256(
                        abi.encodePacked(matchSlot, betEpoch, winningTeam)
                    );
                pickEpochResult[hashMatchEpochWinner] = 2;
                // for ties or no-contest or cancellations, both bettors are refunded their bet amounts
            } else {
                bytes32 hashMatchEpochHome =
                    keccak256(
                        abi.encodePacked(matchSlot, betEpoch, winningTeam - 1)
                    );
                bytes32 hashMatchEpochAway =
                    keccak256(
                        abi.encodePacked(matchSlot, betEpoch, winningTeam - 2)
                    );
                redemptionPot += betLong[0][matchSlot] + betLong[1][matchSlot];
                // the bettor's subcontract--match/epoch/team--will now map to a 'tie', coded as 1
                pickEpochResult[hashMatchEpochHome] = 1;
                pickEpochResult[hashMatchEpochAway] = 1;
            }
        }
        // the default value of pickEpochResult[] is 0, which is like a loss in that bettor gets
        // no eth back, so this mapping need not be assigned
        // this subtracts redemptionPot from bettor capital and LP pledged capital
        housePot = sub(housePot, redemptionPot);
        // allocate 1% of payout to the oracle
        uint256 oraclePot = redemptionPot / 100;
        // revalue payout to be 99% of its original value
        redemptionPot = oraclePot * 99;
        // incrementing the epoch affects LP withdrawals, token claimTokens
        // it also makes it so that no one can bet on old games
        betEpoch++;
        // money reallocated to accounts
        oracleBalance += oraclePot;
        margin[0] += housePot;
        margin[3] += redemptionPot;
        // old positions are reset to zero for the next epoch for margin calculations
        delete betLong;
        delete betPayout;
        // resetting startTimes at zero makes sure bets can no longer happen on these matches
        delete startTime;
        // this pushes start times out, allowing LPs to fund and withdraw again
        earliestStart = 2e9;
    }

    function redeem(bytes32 _subkId) external {
        Subcontract storage k = subcontracts[_subkId];
        require(
            k.bettor == msg.sender,
            "can only redeem bets from owner of that bet"
        );
        // checks teamEpochHash to see if bet receives money back
        uint8 _pick = k.pick;
        uint8 _matchNum = k.matchNum;
        uint8 _epoch = k.epoch;
        bytes32 hashMatchEpochWinner =
            keccak256(abi.encodePacked(_matchNum, _epoch, _pick));
        uint256 gameOutcome = pickEpochResult[hashMatchEpochWinner];
        // 0 is for a loss or no outcome reported yet
        require(gameOutcome != 0);
        // both ties and wins receive back their initial bet amount, so this is the start
        // whether a win or tie
        uint256 payoff = k.betAmount;
        // if a winner, add the payoff amount
        if (gameOutcome == 2) {
            payoff += k.payoff;
        }
        // the oracle revenue comes out of a 1% fee applied to bettor payouts
        // paying out the 99% to the subset of payoffs ensures that rounding will not result
        // in a rounding error where there is not enough eth to payout
        // it is in the millionths of eth, so while it accumulates, it doesn't favor anyone
        payoff = (payoff * 99) / 100;
        // subtracts payout from the cumulative redemption pot
        require(payoff <= margin[3]);
        margin[3] -= payoff;
        delete subcontracts[_subkId];
        // eth goes straight to the bettor, no longer in the contract
        payable(msg.sender).transfer(payoff);
    }

    function inactiveBook() external {
        // this is just a safety method in case original oracles die together and money is stuck in the contract
        // it allows all parties--bettors and LPs--to get their eth back as if all the games were ties
        // bettors would have to then redeem, and LPs would have to sell shares
        // 3e6 is about 35 days
        require(
            block.timestamp - earliestStart > 3e6,
            "emergency method for unattended contract"
        );
        uint256 lpPot = margin[1] + margin[2];
        margin[1] = 0;
        margin[2] = 0;
        uint8 i;
        uint8 team = 0;
        // games are treated as if they were all ties, giving users their eth back. They do need to redeem them, however.
        for (i = 0; i < 32; i++) {
            bytes32 hashMatchHome =
                keccak256(abi.encodePacked(i, betEpoch, team));
            pickEpochResult[hashMatchHome] = 1;
            bytes32 hashMatchAway =
                keccak256(abi.encodePacked(i, betEpoch, team + 1));
            pickEpochResult[hashMatchAway] = 1;
            lpPot = sub(lpPot, betLong[0][i] + betLong[1][i]);
        }
        // moves betEpoch up so all LPs are 'vested'
        betEpoch += 5;
        margin[0] += lpPot;
        delete betLong;
        delete betPayout;
    }

    function transmitInit(
        string[32] memory _teamSchedule,
        uint256[32] memory _startTime,
        uint256[32] memory _decOdds,
        uint256 earlyStart
    ) external onlyAdmin {
        // initially the schedule, start times, and odds are supplied all at once
        // in the rare case that the schedule or start times must be adjusted, it would be through another submission
        // of all this data, which is costly in terms of gas, but should be rare
        earliestStart = earlyStart;
        startTime = _startTime;
        decOdds = _decOdds;
        teamSchedule = _teamSchedule;
    }

    // incrementally, odds will be adjusted, though the schedule and start times will not be
    function transmitDecOdds(uint256[32] memory _decOdds) external onlyAdmin {
        decOdds = _decOdds;
    }

    /** these show methods are to make it easier for the web front end to process data */
    function showLongs(uint256 i) external view returns (uint256[32] memory) {
        return betLong[i];
    }

    function showLPGross(uint256 i) external view returns (uint256[32] memory) {
        return betPayout[i];
    }

    function showdecOdds() external view returns (uint256[32] memory) {
        return decOdds;
    }

    function showSchedString() external view returns (string[32] memory) {
        return teamSchedule;
    }

    function showStartTime() external view returns (uint256[32] memory) {
        return startTime;
    }

    // remove after debugging
    function showMargin()
        external
        view
        returns (
            uint256 unusedCapital,
            uint256 usedCapital,
            uint256 betCapital,
            uint256 oraclBalance,
            uint256 redeemPot,
            uint256 kontractEthBal
        )
    {
        unusedCapital = margin[0] / 1e12;
        usedCapital = margin[1] / 1e12;
        betCapital = margin[2] / 1e12;
        redeemPot = margin[3] / 1e12;
        oraclBalance = oracleBalance / 1e12;
        kontractEthBal = address(this).balance / 1e12;
    }

    // this makes it easy for programs to check if a big bet--which is in the event logs--is still active
    function checkOpen(bytes32 _subkID) external view returns (bool) {
        bool openOrder = (offercontracts[_subkID].epoch != 0);
        return openOrder;
    }

    // this makes it easy for programs to check if a bet is redeemable
    function checkRedeem(bytes32 _subkID) external view returns (bool) {
        Subcontract storage k = subcontracts[_subkID];
        bytes32 teamEpochHash =
            keccak256(abi.encodePacked(k.matchNum, k.epoch, k.pick));
        bool redeemable = (pickEpochResult[teamEpochHash] > 0);
        return redeemable;
    }

    // odds are loaded for the home team/player,
    // the away odds  are then a function of this consistent with a 5% house vig
    // thus the standard -110/-110 on games that are essentially evenly matched
    function odds(uint256 _match, uint256 _player)
        public
        view
        returns (uint256)
    {
        uint256 betOdds = decOdds[_match];
        if (_player == 1) {
            betOdds = 1e6 / (90 + betOdds) - 90;
        }
        return betOdds;
    }

    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a * b;
        require(c / a == b, "multiplication overflow");
        return c;
    }

    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b <= a, "subtraction underflow on uints");
        uint256 c = a - b;
        return c;
    }

    // this is used for calculating require d margin
    function maxZero(int256 a, int256 b) internal pure returns (int256) {
        int256 c = a;
        if (a <= b) c = b;
        if (c <= 0) c = 0;
        return c;
    }
}
