pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;
import "./Token.sol";
import "./Betting.sol";

/**
SPDX-License-Identifier: MIT
*/

contract Oracle {
    constructor(address payable bettingk, address _token) {
        bettingContract = Betting(bettingk);
        token = Token(_token);
        timer = 2e9;
        betEpoch = 1;
    }

    // after each settlement, a new epoch commences. Bets cannot consummate on games referring to prior epochs
    uint8 public betEpoch;
    // This is true if there is a proposal under consideration, other proposals are not allowed while a current proposal
    // is under review
    bool public underReview;
    /** the schedule is a record of "sport:home:away", such as "NFL:NYG:SF" for us football, New York Giants vs San Francisco */
    string[32] public propSchedule;
    // result are coded where 0 is a tie/cancellation or postponement, 1 for home team win, 2 for away team win.
    uint8[32] public propResults;
    // this tracking number is for submissions, needed for tracking whether someone already voted on a data proposal
    // incremented at each processing
    uint16 public propNumber;
    // propStartTime in UTC is used to stop active betting. No bets are taken after this time.
    uint256[32] public propStartTime;
    // odds are entered as decimal odds, such that 1.909 is 909, and 2.543 is 1543.
    // betAmount*(propOdds/1000+1) is the gross payoff for a winning bet,
    // betAmount*propOdds/1000 is the next payoff for a winning bet
    uint256[32] public propOdds;
    // this is the UTC at which LPs can no longer withdraw or deposit until the next settlement
    // it is the time of the earliest game start. It is more efficient to load this in separately rather than
    // take the minimum of the times it the 'propStartTime' array
    uint256 public earliestStart;
    // timer is used so that each proposal has at least a 3 hours for voters to respond
    uint256 public timer;
    // timerEthDiv is used so that each quarterly dividend allocation gives token holders 24 hours to claim their eth
    // without fear of dilution by double counting.
    uint256 public timerEthDiv;
    // bond for submitting a proposal
    uint256 public bond;
    // tracks the current local token balance of active oracle contract administrators, as
    // documented by the deposit of their tokens within this contract
    uint256 public localSupply;
    // for 'minimum bet size' and 'concentration limit'
    // these variables have little ability to scam anyone, so they have a shorter review time
    uint256[2] public propMiscParams;
    // A proposal goes through via a simple rule of more yes than no votes. Thus, a trivial vote does not need more yes votes
    // if a troll rejects a vote that has few Yes votes, a vote later than evening takes a large bond amount, so
    // and submitters should anticipate such an event
    uint256 public voteYes;
    uint256 public voteNo;
    // keeps track of those who supplied data proposals. Proposers have to deposit tokens as a bond, and if their
    // proposal is rejected, they lose that bond.
    // thus, there is no selfish incentive for non-proposers to reject a proposal, other than it hurts the value of
    // their tokens. A proposer has only downside directly, but major token holders appreciate that the contract needs
    // administering. It should be  unambiguous. While odds can differ across alternative betting sites
    // arbitrage keeps them within the vig
    address public proposer;
    // this allows the oracle administrators to vote on new betting/oracle contracts without withdrawing their tokens
    Token public token;
    Betting public bettingContract;
    // these are tokens held in the custody of this contract. Only tokens deposited in this contract can
    // be used for voting, or for claiming ether at the end of the season. Note these tokens are owned by the oracle contract
    // as far as the ERC-20 contract is concerned, but they are credited to the token depositors within this contract for
    // voting and receiving eth
    mapping(address => uint256) public tokenBalances;
    // this variable allows the token contract to lock tokens in the oracle contract if a token holder has voted
    // on a proposal in the token contract. It prevents double-voting on token votes.
    mapping(address => uint256) public tokenVoteTime;
    // keeps track of the proposals in this contract, so that token holders can only vote once for each proposal
    // with the tokens they have in this contract. They cannot withdraw their tokens until a proposal under review has finished
    mapping(address => uint32) public voteTracker;

    event Proposal(string process, uint256 timestamp, address proposer);

    event ResultsPosted(uint8[32] winner, uint8 epoch, uint256 timestamp);

    event DecOddsPosted(uint256[32] decOdds, uint8 epoch, uint256 timestamp);

    event ParamsPosted(
        uint256 minBet,
        uint256 concLimit,
        uint8 epoch,
        uint256 timestamp
    );

    event SchedulePosted(string[32] sched, uint8 epoch, uint256 timestamp);

    event StartTimesPosted(
        uint256[32] starttimes,
        uint8 epoch,
        uint256 timestamp
    );

    function vote(bool sendData) external {
        // voter must have votes to allocate
        require(tokenBalances[msg.sender] > 0);
        // can only vote if there is a proposal
        require(underReview);
        // voter must not have voted on this proposal
        require(voteTracker[msg.sender] != propNumber);
        // this prevents this account from voting again on this data proposal (see above)
        voteTracker[msg.sender] = propNumber;
        // votes are simply one's entire token balance deposited in this oracle contract
        if (sendData) {
            voteYes += tokenBalances[msg.sender];
        } else {
            voteNo += tokenBalances[msg.sender];
        }
    }

    function voteToken(bool isYes) external {
        // voter must have votes
        require(tokenBalances[msg.sender] > 0);
        // voter must not have voted
        require(tokenVoteTime[msg.sender] < block.timestamp);
        // voting cannot occur until the proposal period has ended
        // votes for token proposals are yes/no, like those for data submissions in this contract
        token.voteFromOracle(tokenBalances[msg.sender], isYes);
        // change to 7 days
        tokenVoteTime[msg.sender] = block.timestamp + 7 seconds;
    }

    // this allows the oracle contract to receive eth from the betting contract
    receive() external payable {}

    function dividendClaim() external {
        // eth dividends are claimed every 13 periods.
        require(betEpoch % 13 == 0);
        require(tokenBalances[msg.sender] > 0);
        uint256 sharesToSell = tokenBalances[msg.sender];
        tokenBalances[msg.sender] = 0;
        token.transfer(msg.sender, sharesToSell);
        // Once a quarter there is a window where token depositors in this contract
        // access their pro-rata share of the eth transferred to this contract from the betting contracteth back with their tokens
        uint256 ethTrans = (sharesToSell * address(this).balance) / localSupply;
        payable(msg.sender).transfer(ethTrans);
        localSupply -= sharesToSell;
    }

    function initPost(
        string[32] memory teamsched,
        uint256[32] memory starts,
        uint256[32] memory decimalOdds,
        uint256 earlyStart
    ) external {
        // this requirement makes sure a post occurs only if there is not a current post under consideration, or
        // it is an amend for an earlier post with these data
        require(!underReview, "Under Review");
        post();
        propSchedule = teamsched;
        propStartTime = starts;
        propOdds = decimalOdds;
        earliestStart = earlyStart;
        // this tells users that an initial proposal has been sent, which is useful for oracle administrators who are monitoring this contract
        emit Proposal("initial", block.timestamp, msg.sender);
    }

    function oddsPost(uint256[32] memory adjDecimalOdds) external {
        require(!underReview);
        post();
        emit Proposal("oddsSent", block.timestamp, proposer);
        propOdds = adjDecimalOdds;
        // this tells users that an odds proposal has been sent, which is useful for oracle administrators who are monitoring this contract
        emit Proposal("odds", block.timestamp, msg.sender);
    }

    function settlePost(uint8[32] memory resultVector) external {
        // this prevents a settle post when other posts have been made
        require(!underReview);
        post();
        propResults = resultVector;
        // this tells users that a results proposal has been sent, which is useful for oracle administrators who are monitoring this contract
        emit Proposal("results", block.timestamp, msg.sender);
    }

    function paramPost(uint256[2] memory minbetMaxParam) external {
        // this prevents a settle post when other posts have been made
        require(!underReview);
        post();
        propMiscParams = minbetMaxParam;
        // this tells users that a params proposal has been sent, which is useful for oracle administrators who are monitoring this contract
        emit Proposal("params", block.timestamp, msg.sender);
    }

    function initProcess() external {
        // this prevents an odds or results proposal from being sent
        require(propStartTime[0] != 0);

        // needs at least 3 hours or a clear majority decision
        // there are only 10 million tokens
        // require (block.timestamp > timer || voteYes > 5e24 ||  voteNo > 5e24);
        // only sent if 'null' vote does not win
        if (voteYes > voteNo) {
            // successful submitter gets their bonded tokens back
            tokenBalances[proposer] += bond;
            // sends to the betting contract
            bettingContract.transmitInit(
                propSchedule,
                propStartTime,
                propOdds,
                earliestStart
            );
            emit SchedulePosted(propSchedule, betEpoch, block.timestamp);
            emit StartTimesPosted(propStartTime, betEpoch, block.timestamp);
            emit DecOddsPosted(propOdds, betEpoch, block.timestamp);
        }
        // resets various data (eg, timer)
        reset();
        // resets data arrays for next submission
        delete propSchedule;
        delete propOdds;
        delete propStartTime;
        delete earliestStart;
        if (betEpoch % 13 == 0) timerEthDiv = block.timestamp + 1 days;
    }

    // these have the same logic as for the initProcess, just for the different datasets
    function oddsProcess() external {
        // this prevents an 'initProcess' set being sent as an odds transmit
        require(propStartTime[0] == 0 && propOdds[0] != 0);
        // needs at least 3 hours or a clear majority decision
        // require (block.timestamp > timer || voteYes > 5e5 ether ||  voteNo > 5e5 ether);
        if (voteYes > voteNo) {
            // proposer gets back their bonding amount
            tokenBalances[proposer] += bond;
            bettingContract.transmitDecOdds(propOdds);
            emit DecOddsPosted(propOdds, betEpoch, block.timestamp);
        }
        // resets various data (eg, timer)
        reset();
        delete propOdds;
    }

    function settleProcess() external {
        require(propResults[0] != 0);
        // needs at least 3 hours or a clear majority decision
        // require (block.timestamp > timer || voteYes > 5e24 || voteNo > 5e24);
        if (voteYes > voteNo) {
            // proposer gets back their bonding amount
            tokenBalances[proposer] += bond;
            bettingContract.settle(propResults);
            betEpoch++;
            emit ResultsPosted(propResults, betEpoch, block.timestamp);
        }
        // resets various data (eg, timer)
        reset();
        delete propResults;
    }

    function paramProcess() external {
        require(propMiscParams[0] != 0);
        // needs at least 3 hours or a clear majority decision
        // require (block.timestamp > timer || voteYes > 5e24 || voteNo > 5e24);
        if (voteYes > voteNo) {
            tokenBalances[proposer] += bond;
            bettingContract.adjustParams(propMiscParams[0], propMiscParams[1]);
            emit ParamsPosted(
                propMiscParams[0],
                propMiscParams[1],
                betEpoch,
                block.timestamp
            );
        }
        // resets various data (eg, timer)
        reset();
        delete propMiscParams;
    }

    function withdrawTokens(uint256 amt) external {
        require(
            amt <= localSupply && amt <= tokenBalances[msg.sender],
            "Not enough tokens"
        );
        // this prevents voting more than once or oracle proposals with token balance.
        require(!underReview, "no wd during vote");
        // prevents multiple votes on token contract proposals
        require(tokenVoteTime[msg.sender] < block.timestamp);
        tokenBalances[msg.sender] -= amt;
        localSupply -= amt;
        token.transfer(msg.sender, amt);
    }

    function depositTokens(uint256 amt) external {
        // cannot add tokens during eth dividend capture period
        // this prevents multiple withdrawals from the same person using different accounts
        require(block.timestamp > timerEthDiv);
        localSupply += amt;
        tokenBalances[msg.sender] += amt;
        token.transferFrom(msg.sender, address(this), amt);
    }

    // these allow for an easy way to grab an array in web3.js
    function showSched() external view returns (string[32] memory teamSched) {
        teamSched = propSchedule;
    }

    function showpropStartTimes()
        external
        view
        returns (uint256[32] memory teamStart)
    {
        teamStart = propStartTime;
    }

    function showResults()
        external
        view
        returns (uint8[32] memory resultVector)
    {
        resultVector = propResults;
    }

    function showOdds() external view returns (uint256[32] memory adjOdds) {
        adjOdds = propOdds;
    }

    function showVotes()
        external
        view
        returns (
            uint256 proposalEndTime,
            uint256 yesVotes,
            uint256 noVotes
        )
    {
        proposalEndTime = timer;
        yesVotes = voteYes;
        noVotes = voteNo;
    }

    function post() internal {
        // change hourOfDay to 10
        // constraining the hourOfDay to be >10 gives users a block of time where they can be confident that their
        // inattention to the contract poses no risk of a malicious data submission.
        // require (hourOfDay() > 1);
        // cannot repost while a current submission is under review
        require(!underReview);
        // small holders with littleownership may troll the contract with useless data just to screw things up
        // later in the day, a higher threshold is needed to submit proposals
        // requiring an exponential increase in tokens caps the number of submissions
        bond = 1e4 ether;
        // to mitigate potential trolling problems, only very large token holders can  propose later in the day
        if (hourOfDay() > 17) bond = 1e5 ether;
        require(tokenBalances[msg.sender] >= bond, "Low Balance");
        // this also gives voters at least 3 hours after last proposed post
        // to vote on the set of proposed submissions
        timer = block.timestamp + 3 seconds;
        voteYes = tokenBalances[msg.sender];
        // this prevents proposer from voting again with his tokens on this submission
        voteTracker[msg.sender] = propNumber;
        underReview = true;
        // check above makes this safemath
        tokenBalances[msg.sender] -= bond;
        proposer = msg.sender;
    }

    function reset() internal {
        // if the collective has sufficient time, or the majority has a preference registered, one can submit asap
        delete proposer;
        voteYes = 0;
        voteNo = 0;
        underReview = false;
        propNumber++;
        timer = 2e9;
    }

    // this is used so users do not have to delegate someone else to monitor the contract 24/7
    // 86400 is seconds in a day, and 3600 is seconds in an hour
    function hourOfDay() internal view returns (uint256 hour1) {
        hour1 = (block.timestamp % 86400) / 3600;
    }
}
