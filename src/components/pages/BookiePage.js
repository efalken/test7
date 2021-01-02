import React, {
  Component
} from 'react'
import {
  drizzleConnect
} from '@drizzle/react-plugin'
import PropTypes from 'prop-types'
import web3 from 'web3-utils'
import Split from '../layout/Split'
import {
  Box,
  Flex
} from '@rebass/grid'
import Logo from '../basics/Logo'
import Text from '../basics/Text'
import {
  G,
  H
} from '../basics/Colors'
import LabeledText from '../basics/LabeledText'
import {
  autoBind
} from 'react-extras'
import Form from '../basics/Form.js'
import ButtonEthScan from '../basics/ButtonEthScan.js'
import WarningSign from '../basics/WarningSign'
import Button from '../basics/Button.js';
import TruncatedAddress from '../basics/TruncatedAddress.js';
import VBackgroundCom from '../basics/VBackgroundCom';

class BookiePagejs extends Component {

  constructor(props, context) {
    super(props)
    autoBind(this)

    this.contracts = context.drizzle.contracts

    this.state = {
      fundAmount: "",
      shareAmount: "",
      sharesToSell: "",
      currentWeek: "",
      showDecimalOdds: false,
      teamPick: ""
    }
  }

  componentDidMount() {
    document.title = 'Bookie Page'
    setTimeout(() => {
      this.findValues();
    }, 1000);
  }


  handletakeBookTeam(value) {
    this.setState({ teamPick: value })
  }

  handlefundBook(value) {
    this.setState({
      fundAmount: value
    })
  }

  openEtherscan(txhash) {
    const url = 'https://rinkeby.etherscan.io/tx/' + txhash;
    window.open(url, '_blank');
  }

  handleBookieSell(value) {
    this.setState({
      sharesToSell: value
    })
  }

  wdTaker() {
    this.contracts["BetSwap"].methods.withdrawEth.cacheSend({
      from: this.props.accounts[0]
    });
  }

  sellBookie() {
    //const { sharesToSell } = this.state.sharesToSell
    this.contracts["BetSwap"]
      .methods.withdrawBook.cacheSend(web3.toWei(this.state.sharesToSell.toString(), "finney"), {
        from: this.props.accounts[0]
      });
  }

  fundBook() {
    this.contracts["BetSwap"].methods.fundBook.cacheSend({
      from: this.props.accounts[0],
      value: web3.toWei(this.state.fundAmount, "finney")
    });
  }

  inactivateBook() {
    this.contracts["BetSwap"].methods.inactiveBook.cacheSend();
  }

  findValues() {
    this.unusedKey = this.contracts["BetSwap"].methods.margin.cacheCall(0)

    this.usedKey = this.contracts["BetSwap"].methods.margin.cacheCall(1)

    this.betCapitalKey = this.contracts["BetSwap"].methods.margin.cacheCall(2)

    this.totalSharesKey = this.contracts["BetSwap"].methods.totalShares.cacheCall()

    this.weekKey = this.contracts["BetSwap"].methods.betEpoch.cacheCall()

    this.betsHomeKey = this.contracts["BetSwap"].methods.showLongs.cacheCall(0)

    this.payoffsHomeKey = this.contracts["BetSwap"].methods.showLPGross.cacheCall(0)

    this.betsAwayKey = this.contracts["BetSwap"].methods.showLongs.cacheCall(1)

    this.payoffsAwayKey = this.contracts["BetSwap"].methods.showLPGross.cacheCall(1)

    this.oddsHomeKey = this.contracts["BetSwap"].methods.showdecOdds.cacheCall()

    this.scheduleStringKey = this.contracts["BetSwap"]
      .methods.showSchedString.cacheCall()

    this.startTimeKey = this.contracts["BetSwap"].methods.showStartTime.cacheCall()

    this.sharesKey = this.contracts["BetSwap"].methods.lpStruct
      .cacheCall(this.props.accounts[0])
  }

  getSpreadText(spreadnumber) {
    let outspread = spreadnumber / 10
    if (outspread > 0) {
      outspread = "+" + outspread
    }
    return outspread
  }

  // ****************************************
  // render
  //*****************************************
  render() {
    let unusedCapital = "0";
    if (this.unusedKey in this.props.contracts["BetSwap"].margin) {
      unusedCapital = web3.fromWei(this.props.contracts["BetSwap"].margin[this.unusedKey].value.toString(), "szabo")
    }

    let usedCapital = "0";
    if (this.usedKey in this.props.contracts["BetSwap"].margin) {
      usedCapital = web3.fromWei(this.props.contracts["BetSwap"].margin[this.usedKey].value.toString(), "szabo")
    }

    let betCapital = "0";
    if (this.betCapitalKey in this.props.contracts["BetSwap"].margin) {
      betCapital = web3.fromWei(this.props.contracts["BetSwap"].margin[this.betCapitalKey].value.toString(), "szabo")
    }

    let bookieStruct = {
      0: "0",
      1: "0",
      shares: "0",
      weekB: "0",
    }
    let bookieShares = "0";
    if (this.sharesKey in this.props.contracts["BetSwap"].lpStruct) {
      bookieStruct = this.props.contracts["BetSwap"].lpStruct[this.sharesKey].value
      bookieShares = web3.fromWei(bookieStruct.shares.toString(), "finney")
    }

    let totalShares = "0";
    if (this.totalSharesKey in this.props.contracts["BetSwap"].totalShares) {
      totalShares = web3.fromWei(this.props.contracts["BetSwap"]
        .totalShares[this.totalSharesKey].value.toString(), "finney")
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

    let payoffAway = [];
    if (this.payoffsAwayKey in this.props.contracts["BetSwap"].showLPGross) {
      payoffAway = this.props.contracts["BetSwap"].showLPGross[this.payoffsAwayKey].value
    }

    let payoffHome = [];
    if (this.payoffsHomeKey in this.props.contracts["BetSwap"].showLPGross) {
      payoffHome = this.props.contracts["BetSwap"].showLPGross[this.payoffsHomeKey].value
    }

    let scheduleString = ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
      "", "", "", "", "", "", "", "", "", "", "", "", ""];

    if (this.scheduleStringKey in this.props.contracts["BetSwap"].showSchedString) {
      scheduleString = this.props.contracts["BetSwap"].showSchedString[this.scheduleStringKey].value;
    }

    let oddsHome = [];
    let oddsAway = [];
    for (let ii = 0; ii < 32; ii++) {
      oddsHome[ii] = Number(oddsHome0[ii]);
      oddsAway[ii] = 1000000 / (Number(oddsHome[ii]) + 90) - 90;
    }

    let teamSplit = [];

    for (let i = 0; i < 32; i++) {
      teamSplit[i] = scheduleString[i].split(":");
    }

    let allMatches = [];

    for (let i = 0; i < 32; i++) {
      allMatches.push(
        <tr key={i} style={{ width: "25%", textAlign: "center" }}>
          <td>{teamSplit[i][0]}</td>
          <td>{teamSplit[i][1]}</td>
          <td>{teamSplit[i][2]}</td>
          <td>{(betsHome[i] / 1e15).toFixed(3)}</td>
          <td>
            {(betsAway[i] / 1e15).toFixed(3)}
          </td>
          <td>
            {(payoffHome[i] / 1e15 - betsAway[i] / 1e15).toFixed(1)}
          </td>
          <td>
            {(payoffAway[i] / 1e15 - betsHome[i] / 1e15).toFixed(1)}
          </td>
        </tr>
      );
    }


    return (
      <div>
        <VBackgroundCom />
        <Split
          page={"bookie"}
          side={
            <Box mt="30px" ml="25px" mr="35px">
              <Logo />
              <Flex mt="15px"></Flex>
              <Box
                mt="20px"
                pt="10px"
                style={{ borderTop: `thin solid ${G}` }}
              ></Box>

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
                        // textDecoration: "none",
                        cursor: "pointer",
                      }}
                      href="/betpage"
                      target="_blank"
                    >
                      Betting Page
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
                      Home Page
                  </a>
                  </Text>
                </Flex>
              </Box>

              <Box>
                <Flex mt="10px" pt="10px"></Flex>
              </Box>
              <Box mb="10px" mt="10px">
                <TruncatedAddress
                  label="Your Address"
                  addr={this.props.accounts[0]}
                  start="8"
                  end="6"
                  transform="uppercase"
                  spacing="1px"
                />
              </Box>

              <Box>
                <Flex
                  mt="10px"
                  pt="10px"
                  alignItems="center"
                  style={{ borderTop: `thin solid ${G}` }}
                ></Flex>
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
                <Text
                  size="16px"
                  justifyContent="space-between"
                  buttonWidth="95px"
                >
                  Fund Book
                </Text>
              </Box>
              <Form
                onChange={this.handlefundBook}
                value={this.state.fundAmount}
                onSubmit={this.fundBook}
                mb="20px"
                justifyContent="flex-start"
                buttonWidth="155px"
                inputWidth="150px"
                placeholder="ether"
                buttonLabel="funding amount"
              />

              <Box>
                <Flex>
                  <Flex width="100%" flexDirection="column">
                    <Flex
                      mt="10px"
                      pt="10px"
                      alignItems="center"
                      style={{
                        borderTop: `thin solid ${G}`,
                      }}
                    >
                      <Text size="16px" weight="400" style={{ marginLeft: "1%" }}>
                        Margin
                            </Text>
                    </Flex>
                    <Flex pt="10px" justifyContent="space-around">
                      <Box>
                        <LabeledText
                          big
                          label="Unpledged Capital"
                          text={(Number(unusedCapital) / 1e3).toFixed(0)}
                          spacing="4px"
                        />
                      </Box>

                      <Box>
                        <LabeledText
                          big
                          label="Pledged Capital"
                          text={(Number(usedCapital) / 1e3).toFixed(0)}
                          spacing="1px"
                        />
                      </Box>
                      <Box>
                        <LabeledText
                          big
                          label="Current Gross Bets"
                          text={(Number(betCapital) / 1e3).toFixed(0)}
                          spacing="1px"
                        />
                      </Box>
                    </Flex>
                  </Flex>
                </Flex>
              </Box>

              <Box>
                <Flex
                  mt="10px"
                  pt="10px"
                  style={{ borderTop: `thin solid ${G}` }}
                ></Flex>
              </Box>

              <Box>
                {" "}
                <Text size="14px">
                  {"You own: " + (Number(bookieShares)).toFixed(2) + "  out of " +
                    (Number(totalShares)).toFixed(2) + " total shares"}
                </Text>
              </Box>
              <Box>
                {Number(bookieShares) > 0 ? (
                  <Form
                    onChange={this.handleBookieSell}
                    value={this.state.sharesToSell}
                    onSubmit={this.sellBookie}
                    mb="20px"
                    justifyContent="flex-start"
                    buttonWidth="95px"
                    inputWidth="210px"
                    placeholder="Shares to Sell (Ether, ie 1e18)"
                    buttonLabel="sell"
                  />
                ) : null}
              </Box>

              <Box>
                <Flex
                  mt="20px"
                  pt="10px"
                  style={{ borderTop: `thin solid ${G}` }}
                ></Flex>
              </Box>
              <Button
                width="171px"
                bgColor={H}
                onClick={() => this.inactivateBook()}
              >
                <Flex justifyContent="center">
                  <Box mr="20px">
                    <WarningSign width="13" />
                  </Box>{" "}
                  <Box>Inactive Book</Box>
                </Flex>
              </Button>
            </Box>
          }
        >
          <div className="bookie-page-wrapper" style={{ width: "100%" }}>
            <Flex justifyContent="center">
              <Text size="25px">Bookie  Page</Text>
            </Flex>

            <Box mt="15px"
              mx="30px" >
              <Flex width="100%"
                justifyContent="marginLeft" >
                <Text size="14px" weight="300">
                  This page helps LPs understand their netLiab
                  exposure to this week's events. The NetLiability is the amount paid out by
                  the contract if the Home or Away Team wins. If negative this means the LPs
                  are credited eth.  LPs can fund and withdraw using the left-hand
                  fields.
                </Text>
              </Flex>
            </Box>
            <Box>
              <Flex>
                <Flex width="100%" flexDirection="column">
                  <Flex pt="10px" justifyContent="space-between"></Flex>
                </Flex>
              </Flex>
            </Box>

            <Box>
              <Flex>
                <Flex width="100%" flexDirection="column">
                  <Flex
                    mt="10px"
                    pt="10px"
                    alignItems="center"
                    style={{
                      borderTop: `thin solid ${G}`,
                    }}
                  ></Flex>
                  <table style={{ width: "100%", borderRight: "1px solid", float: "left" }}>
                    <tbody>
                      <tr style={{ width: "50%", textAlign: "center" }}>
                        <th>sport</th>
                        <th>Home Team</th>
                        <th>Away Team</th>
                        <th>HomeBets</th>
                        <th>AwayBets</th>
                        <th>NetLiabHome</th>
                        <th>NetLiabAway</th>
                      </tr>
                      {allMatches}
                    </tbody>
                  </table>

                </Flex>
              </Flex>
            </Box>
          </div>
        </Split>
      </div>
    );
  }
}

BookiePagejs.contextTypes = {
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

export default drizzleConnect(BookiePagejs, mapStateToProps)
