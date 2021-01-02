import React, { Component } from 'react'
import { drizzleConnect } from '@drizzle/react-plugin'
import PropTypes from 'prop-types'
import Split from '../layout/Split'
import web3 from 'web3-utils'
import {
  Box,
  Flex
} from '@rebass/grid'
import Logo from '../basics/Logo'
import Text from '../basics/Text'
import { G } from '../basics/Colors'
import { autoBind } from 'react-extras'
import ButtonEthScan from '../basics/ButtonEthScan.js'
import Input from '../basics/Input.js';
import Button from '../basics/Button.js';
import ButtonI from '../basics/ButtonI.js';
import TruncatedAddress from '../basics/TruncatedAddress.js';
import VBackgroundCom from '../basics/VBackgroundCom'
import BettingContract from '../../abis/Betting.json'
var moment = require("moment");

class BetPagejs extends Component {
  constructor(props, context) {
    super(props)
    autoBind(this)

    this.contracts = context.drizzle.contracts;
    this.web3 = web3;
    this.betHistory = {};
    this.checker1 = false;
    this.checker2 = false;
    this.takekeys = {};
    this.scheduleStringkey = [];

    this.state = {
      betAmount: "",
      fundAmount: "",
      gameResult: "",
      sharesToSell: "",
      teamPick: null,
      matchPick: null,
      currentWeek: "",
      showDecimalOdds: false
    }
  }

  componentDidMount() {
    document.title = 'Bet Page'
    setTimeout(() => {
      this.findValues();
      this.getbetHistoryArray();
    }, 1000);
  }

  handleBetSize(betAmount) {
    this.setState({ betAmount });
  }

  openEtherscan(txhash) {
    const url = 'https://rinkeby.etherscan.io/tx/' + txhash;
    window.open(url, '_blank');
  }

  handletakeBookTeam(teamPick) {
    this.setState({ teamPick });
  }

  takeBet() {
    this.contracts[
      "BetSwap"
    ].methods.bet.cacheSend(
      this.state.matchPick, this.state.teamPick, {
      from: this.props.accounts[0],
      value: web3.toWei(this.state.betAmount.toString(), "finney")
    })
  }

  switchOdds() {
    this.setState({ showDecimalOdds: !this.state.showDecimalOdds });
  }

  redeemBet(x) {
    this.contracts["BetSwap"].methods.redeem.cacheSend(x, {
      from: this.props.accounts[0]
    });
  }

  async getbetHistoryArray() {
    const web3b = this.context.drizzle.web3;
    const id = await web3b.eth.net.getId();
    const bettingContractAddress = BettingContract.networks[id].address;
    const contractweb3b = new web3b.eth.Contract(BettingContract.abi, bettingContractAddress);
    var eventdata = [];
    var takes = {};
    const events = await contractweb3b.getPastEvents(
      'BetRecord',
      {
        fromBlock: 0,
        toBlock: 'latest'
      }
    );
    events.forEach(function (element) {
      if (element.returnValues.bettor === this.props.accounts[0])
        this.checker1 = true;
      eventdata.push({
        Hashoutput: element.returnValues.contractHash,
        BettorAddress: element.returnValues.bettor,
        Epoch: element.returnValues.epoch,
        timestamp: element.returnValues.timestamp,
        BetSize: web3.fromWei(element.returnValues.betsize.toString(), "szabo"),
        LongPick: Number(element.returnValues.pick),
        MatchNum: Number(element.returnValues.matchnum),
        //    DecimalOdds: web3.fromWei(element.returnValues.payoff.toString(),"szabo"),
        DecimalOdds: (element.returnValues.payoff / element.returnValues.betsize * 1000).toFixed(0),
        Payoff: web3.fromWei(element.returnValues.payoff.toString(), "szabo")
      });
      takes[element.returnValues.contractHash] = this.contracts["BetSwap"].methods
        .checkRedeem.cacheCall(element.returnValues.contractHash)
    }, this);
    // console.log(eventdata);
    this.betHistory[0] = eventdata
    this.takekeys = takes
  }

  radioMatchHome(teampic) {
    this.setState({ matchPick: teampic, teamPick: 0 })
  }

  radioMatchAway(teampic) {
    this.setState({ matchPick: teampic, teamPick: 1 })
  }

  findValues() {
    // getMinBet
    this.minBetKey = this.contracts["BetSwap"].methods.minBet.cacheCall()

    // getOdds
    this.oddsHomeKey = this.contracts["BetSwap"].methods.showdecOdds.cacheCall()

    // getBetsHome
    this.betsHomeKey = this.contracts["BetSwap"].methods.showLongs.cacheCall(0)

    // getBetsAway
    this.betsAwayKey = this.contracts["BetSwap"].methods.showLongs.cacheCall(1)

    // getPayoffsHome
    this.payoffsHomeKey = this.contracts["BetSwap"].methods.showLPGross.cacheCall(0)

    // getPayoffsAway
    this.payoffsAwayKey = this.contracts["BetSwap"].methods.showLPGross.cacheCall(1)

    // getConcKey
    this.concKey = this.contracts["BetSwap"].methods.concentrationLimit.cacheCall()

    // getStartTime
    this.startTimeKey = this.contracts["BetSwap"].methods.showStartTime.cacheCall()

    // getSharesBalance
    this.sharesKey = this.contracts["BetSwap"].methods.lpStruct.cacheCall(this.props.accounts[0])

    // getWeek
    this.weekKey = this.contracts["BetSwap"].methods.betEpoch.cacheCall()

    // getUsed
    this.usedKey = this.contracts["BetSwap"].methods.margin.cacheCall(1)

    // getUnused
    this.unusedKey = this.contracts["BetSwap"].methods.margin.cacheCall(0)

    // getBetCapital
    this.betCapitalKey = this.contracts["BetSwap"].methods.margin.cacheCall(2)

    // getScheduleString
    this.scheduleStringKey = this.contracts["BetSwap"]
      .methods.showSchedString.cacheCall()
  }

  getMaxSize(unused0, used0, climit0, long0) {
    let unused = Number(unused0)
    let used = Number(used0)
    let climit = Number(climit0)
    let long = Number(long0)
    let maxSize = (unused + used) / climit - long
    let maxSize2 = unused
    if (maxSize2 < maxSize) {
      maxSize = maxSize2
    }
    return maxSize
  }

  getMoneyLine(decOddsi) {
    let moneyline = 0
    if (decOddsi < 1000) {
      moneyline = -1000 * (1 + (100 - decOddsi) / decOddsi)
    } else {
      moneyline = decOddsi / 10
    }
    moneyline = moneyline.toFixed(0)
    if (moneyline > 0) {
      moneyline = "+" + moneyline
    }
    return moneyline
  }

  render() {
    let concentrationLimit = 0;
    if (this.concKey in this.props.contracts["BetSwap"].concentrationLimit) {
      concentrationLimit = this.props.contracts["BetSwap"].concentrationLimit[this.concKey].value
    }

    let subcontracts = {}
    Object.keys(this.takekeys).forEach(function (id) {
      if (
        this.takekeys[id] in
        this.props.contracts["BetSwap"]
          .checkRedeem
      ) {
        subcontracts[id] = this.props.contracts["BetSwap"]
          .checkRedeem[this.takekeys[id]].value;
      }
    }, this);

    let unusedCapital = "0";
    if (this.unusedKey in this.props.contracts["BetSwap"].margin) {
      unusedCapital = web3.fromWei(this.props.contracts["BetSwap"].margin[this.unusedKey].value.toString(), "szabo")
    }


    let usedCapital = "0";
    if (this.usedKey in this.props.contracts["BetSwap"].margin) {
      usedCapital = web3.fromWei(this.props.contracts["BetSwap"].margin[this.usedKey].value.toString(), "szabo")
    }

    if (this.weekKey in this.props.contracts["BetSwap"].betEpoch) {
      this.currentWeek = this.props.contracts["BetSwap"].betEpoch[this.weekKey].value
    }

    let startTimeColumn = [];
    if (this.startTimeKey in this.props.contracts["BetSwap"].showStartTime) {
      startTimeColumn = this.props.contracts["BetSwap"].showStartTime[this.startTimeKey].value
    }

    let oddsHome0 = [];
    if (this.oddsHomeKey in this.props.contracts["BetSwap"].showdecOdds) {
      oddsHome0 = this.props.contracts["BetSwap"].showdecOdds[this.oddsHomeKey].value
    }

    let betsHome = [];
    if (this.betsHomeKey in this.props.contracts["BetSwap"].showLongs) {
      betsHome = this.props.contracts["BetSwap"].showLongs[this.betsHomeKey].value
    }

    let betsAway = [];
    if (this.betsAwayKey in this.props.contracts["BetSwap"].showLongs) {
      betsAway = this.props.contracts["BetSwap"].showLongs[this.betsAwayKey].value
    }

    let payoffHome = [];
    if (this.payoffsHomeKey in this.props.contracts["BetSwap"].showLPGross) {
      payoffHome = this.props.contracts["BetSwap"].showLPGross[this.payoffsHomeKey].value
    }

    let payoffAway = [];
    if (this.payoffsAwayKey in this.props.contracts["BetSwap"].showLPGross) {
      payoffAway = this.props.contracts["BetSwap"].showLPGross[this.payoffsAwayKey].value
    }

    let scheduleString = ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""
      , "", "", "", "", "", "", "", ""]
    if (this.scheduleStringKey in this.props.contracts["BetSwap"].showSchedString) {
      scheduleString = this.props.contracts["BetSwap"].showSchedString[this.scheduleStringKey].value;
    }


    let oddsHome = [];
    let oddsAway = [];
    for (let ii = 0; ii < 32; ii++) {
      oddsHome[ii] = Number(oddsHome0[ii]);
      oddsAway[ii] = 1000000 / (Number(oddsHome[ii]) + 90) - 90;
    }
    let oddsTot = [];
    oddsTot = [oddsHome, oddsAway];

    let homeLiab = [];
    let awayLiab = [];
    for (let ii = 0; ii < 32; ii++) {
      homeLiab[ii] = (Number(payoffHome[ii]) - Number(betsAway[ii])) / 1e12;
      awayLiab[ii] = (Number(payoffAway[ii]) - Number(betsHome[ii])) / 1e12;
    }

    let netLiab = [];
    netLiab = [homeLiab, awayLiab];

    // console.log("schedString", netLiab[0]);


    let teamSplit = [];
    //  let dayOfWeek =[];

    for (let i = 0; i < 32; i++) {
      teamSplit[i] = scheduleString[i].split(":");
      //         dayOfWeek[i] = Date.getUTCDay(startTimeColumn[i]);
    }

    let firstSixteenTeams = [];
    let secondSixteenTeams = [];


    for (let i = 0; i < 32; i++) {
      firstSixteenTeams.push(
        <tr key={i} style={{ width: "60%", textAlign: "center" }}>
          <td>{i}</td>
          <td>{teamSplit[i][0]}</td>
          <td>
            {moment.unix(startTimeColumn[i]).format("MMM-DD-HH")}
          </td>
          <td style={{ textAlign: "left", paddingLeft: "15px" }}>
            {startTimeColumn[i] > moment().unix() ? (
              <input
                type="radio"
                value={i}
                name={"teamRadio"}
                onChange={({ target: { value } }) => this.radioMatchHome(value)}
                className="teamRadio"
              />
            ) : (
                <span className="circle"></span>
              )}{" "}
            {teamSplit[i][1]}
          </td>
          <td>
            {(oddsHome[i] / 1000 + 1).toFixed(3)}
          </td>
        </tr>
      );
    }

    for (let i = 0; i < 32; i++) {
      secondSixteenTeams.push(
        <tr key={i} style={{ width: "40%", textAlign: "center" }}>
          <td style={{ textAlign: "left", paddingLeft: "50px" }}>
            {startTimeColumn[i] > moment().unix() ? (
              <input
                type="radio"
                value={i}
                name={"teamRadio"}
                onChange={({ target: { value } }) => this.radioMatchAway(value)}
                className="teamRadio"
              />
            ) : (
                <span className="circle"></span>
              )}{" "}
            {teamSplit[i][2]}</td>
          <td>
            {(oddsAway[i] / 1000 + 1).toFixed(3)}
          </td>
        </tr>
      );
    }

    //  console.log("subcon", subcontracts);
    return (
      <div>

        <VBackgroundCom />
        <Split
          page={"bookies"}
          side={
            <Box
              mt="30px"
              ml="25px"
              mr="35px">
              <Logo />

              <Box >
                <Flex
                  mt="20px"
                  flexDirection="row"
                  justifyContent="space-between" >
                </Flex>
                <Flex
                  style={{ borderTop: `thin solid ${G}` }} >
                </Flex>
              </Box>
              <Box>
                <Flex>
                  <Text size="20px">
                    <a
                      className="nav-header"
                      style={{
                        cursor: "pointer",
                      }}
                      href="/bookiepage"
                      target="_blank"
                    >
                      Go to Bookie Page
                          </a>
                  </Text>

                </Flex>
              </Box>
              <Box>
                <Flex>
                  <Text size="20px">
                    <a
                      className="nav-header"
                      style={{
                        cursor: "pointer",
                      }}
                      href="/bigbetpage"
                      target="_blank"
                    >
                      Go to Big Bet Page
                                  </a>
                  </Text>

                </Flex>
              </Box>
              <Box>
                <Flex
                  width="100%"
                  alignItems="center"
                  justifyContent="marginLeft"
                >
                  <Text size="20px">
                    <a
                      className="nav-header"
                      style={{
                        cursor: "pointer",
                      }}
                      href="/"
                    >
                      HomePage
                          </a>
                  </Text>
                </Flex>
              </Box>
              <Box mb="10px"
                mt="10px" >
                <Text>Your address</Text>
                <TruncatedAddress
                  addr={this.props.accounts[0]}
                  start="8"
                  end="6"
                  transform="uppercase"
                  spacing="1px" />
              </Box>

              <Box>
                <Flex
                  mt="5px"
                  flexDirection="row"
                  justifyContent="space-between" >
                </Flex>
              </Box>

              <Box>
                <Flex
                  mt="20px"
                  flexDirection="row"
                  justifyContent="space-between" >
                </Flex>
                <Flex
                  style={
                    {
                      borderTop: `thin solid ${G}`
                    }
                  } >
                </Flex>
              </Box>

              {(this.props.transactionStack.length > 0 && this.props.transactionStack[0].length === 66) ? (
                <Flex alignItems="center">
                  <ButtonEthScan
                    onClick={() =>
                      this.openEtherscan(this.props.transactionStack[0])
                    }
                    style={{ height: "30px" }}
                  >
                    See Transaction Detail on Ethscan
                          </ButtonEthScan>
                </Flex>
              ) : null}
              <Box>

                <Flex>
                  {Object.keys(this.betHistory).map(id => (
                    <div key={id} style={{ width: "100%", float: "left" }}>
                      <Text> Your active bets</Text>
                      <br />
                      <table style={{ width: "100%", fontSize: "12px" }}>
                        <tbody>
                          <tr style={{ width: "33%" }}>
                            <td>Week</td>
                            <td>Match</td>
                            <td>Pick</td>
                            <td>BetSize</td>
                            <td>DecOdds</td>

                          </tr>
                          {this.betHistory[id].map((event, index) =>
                            (event.Epoch === this.currentWeek) &&
                            (
                              <tr key={index} style={{ width: "33%" }}>
                                <td>{event.Epoch}</td>
                                <td>{teamSplit[event.MatchNum][0]}</td>
                                <td>{teamSplit[event.MatchNum][event.LongPick + 1]}</td>
                                <td>{parseFloat(event.BetSize / 1000).toFixed(2)}</td>
                                <td>{(1 + event.DecimalOdds / 1000).toFixed(3)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </Flex>
              </Box>
              <Box >
                <Flex
                  mt="20px"
                  flexDirection="row"
                  justifyContent="space-between" >
                </Flex>
                <Flex
                  style={
                    {
                      borderTop: `thin solid ${G}`
                    }
                  } >
                </Flex>
              </Box>
              <Box>
                {(this.checker1) ? (
                  <Flex>
                    {Object.keys(this.betHistory).map(id => (
                      <div key={id} style={{ width: "100%", float: "left" }}>
                        <Text size="15px">Active Week: {this.currentWeek}</Text>
                        <br />
                        <Text> Your unclaimed bets</Text>
                        <br />
                        <table style={{ width: "100%", fontSize: "12px", float: "left" }}>
                          <tbody>
                            <tr style={{ width: "33%" }}>
                              <td>Epoch</td>
                              <td>Match</td>
                              <td>Pick</td>
                              <td>Eth</td>
                              <td>Click to Claim</td>
                            </tr>
                            {this.betHistory[id].map((event, index) =>
                              (subcontracts[event.Hashoutput]) &&
                              (
                                <tr key={index} style={{ width: "33%" }}>
                                  <td>{event.Epoch}</td>
                                  <td>{teamSplit[event.MatchNum][0]}</td>
                                  <td>{teamSplit[event.MatchNum][event.LongPick + 1]}</td>
                                  <td>{(event.Payoff / 1e3).toFixed(3)}</td>
                                  <td>
                                    <button
                                      style={
                                        {
                                          backgroundColor: "#424242",
                                          borderRadius: "2px",
                                          cursor: "pointer",
                                        }
                                      }
                                      value={event.Hashoutput}
                                      onClick={(e) => { e.preventDefault(); this.redeemBet(event.Hashoutput) }} >
                                      Redeem</button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </Flex>
                ) : <Text size="14px">you have no unclaimed bets</Text>}
              </Box>
              <Box >
                <Flex
                  mt="20px"
                  flexDirection="row"
                  justifyContent="space-between" >
                </Flex>
                <Flex
                  style={
                    {
                      borderTop: `thin solid ${G}`
                    }
                  } >
                </Flex>
              </Box>
            </Box>
          } >
          <Flex justifyContent="center">
            <Text size="25px">Place Bets Here</Text>
          </Flex>
          <Box mt="15px"
            mx="30px" >
            <Flex width="100%"
              justifyContent="marginLeft" >
              <Text size="14px" weight="300">
                Tiggle radio button on the team/player you want to win.
                Enter eths bet in the box, where you can type decimals (eg, 1.123 eth). Prior win, tie, or cancelled
                bets are redeemable on the left panel. This sends eth directly to your eth address. Scroll down to see all
                of the week's contests.
              </Text>
            </Flex>
          </Box>
          <Box mt="15px" mx="30px" />
          <Flex
            mt="10px"
            pt="10px"
            alignItems="center"
            style={{
              borderTop: `thin solid ${G}`
            }}
          >
          </Flex>
          {this.state.teamPick != null ? (

            <Flex
              mt="5px"
              flexDirection="row"
              justifyContent="flex-start"
              alignItems="center"
            >
              <Text size="16px" weight="400" style={{ paddingLeft: "10px" }}>Bet Amount</Text>
              <Input
                onChange={
                  ({
                    target: {
                      value
                    }
                  }) =>
                    this.handleBetSize(value)
                }
                width="100px"
                placeholder={
                  "Enter Eths"
                }
                marginLeft="10px"
                marginRignt="5px"
                value={
                  this.state.betAmount
                }
              />
              <Box mt="10px"
                mb="10px" >
                <Button
                  style={{
                    height: "30px",
                    width: "100px",
                    float: "right",
                    marginLeft: "5px"
                  }}
                  onClick={() => this.takeBet()} >
                  Bet Now
                </Button>
              </Box>
              <Box mt="10px"
                mb="10px" ml="40px" mr="80px"></Box>
              {(this.state.showDecimalOdds) ? (
                <Box mt="1px"
                  mb="1px" >
                  <ButtonI
                    style={
                      {
                        height: "50px",
                        width: "110px",
                        float: "right",
                        marginLeft: "1px"
                      }
                    }
                    onClick={
                      () => this.switchOdds()
                    } >show MoneyLine
      </ButtonI> </Box>) :
                (<Box><ButtonI
                  style={
                    {
                      height: "50px",
                      width: "110px",
                      float: "right",
                      marginLeft: "1px"
                    }
                  }
                  onClick={
                    () => this.switchOdds()
                  } >show DecimalOdds
      </ButtonI> </Box>)}

            </Flex>
          ) : null}
          <Box>   <Flex
            mt="20px"
            flexDirection="row"
            justifyContent="space-between" >
          </Flex>
          </Box>

          <Flex style={
            {
              color: "#0099ff",
              fontSize: "13px"
            }
          } >
            {this.state.teamPick != null ? (<Text size="16px" weight="400">
              pickgg: {teamSplit[this.state.matchPick][this.state.teamPick + 1]}{"  "}
      Odds: {(oddsTot[this.state.teamPick][this.state.matchPick] / 1000 + 1).toFixed(3)}{"  "}
      MaxBet: {parseFloat(this.getMaxSize(unusedCapital,
              usedCapital, concentrationLimit, netLiab[this.state.teamPick][this.state.matchPick]) / 1e3).toFixed(2)}
              {"  "}
      opponent: {teamSplit[this.state.matchPick][2 - this.state.teamPick]}</Text>
            )
              : null
            }
          </Flex>
          <Box>
            <Flex
              mt="20px"
              flexDirection="row"
              justifyContent="space-between" >
            </Flex>
          </Box>
          <table style={{ width: "60%", float: "left" }}>
            <tbody>
              <tr style={{ width: "25%", textAlign: "center" }}>
                <td>Match</td>
                <th>sport</th>
                <th>BettingEnds</th>
                <th>Home Team</th>
                <th>DecimalOdds</th>
              </tr>
              {firstSixteenTeams}
            </tbody>
          </table>

          <table style={{ width: "40%", borderRight: "1px solid", float: "left" }}>
            <tbody>
              <tr style={{ width: "25%", textAlign: "center" }}>
                <th>Away Team</th>
                <th>DecimalOdds</th>
              </tr>
              {secondSixteenTeams}
            </tbody>
          </table>

        </Split>
      </div>
    );
  }
}

BetPagejs.contextTypes = {
  drizzle: PropTypes.object
}

// May still need this even with data function to refresh component on updates for this contract.
const mapStateToProps = state => {
  return {
    accounts: state.accounts,
    contracts: state.contracts,
    drizzleStatus: state.drizzleStatus,
    transactions: state.transactions,
    transactionStack: state.transactionStack
  }
}

export default drizzleConnect(BetPagejs, mapStateToProps)
