import React, { Component } from 'react'
import { drizzleConnect } from '@drizzle/react-plugin'
import PropTypes from 'prop-types'
import { autoBind } from 'react-extras'
import Text from '../basics/Text'
import Oracle from '../../abis/Oracle.json'
import {
  Box,
  Flex
} from '@rebass/grid'
var moment = require("moment");

class EventSchedule extends Component {

  constructor(props, context) {
    super(props)
    autoBind(this)

    this.assets = [{
      contract: context.drizzle.contracts.OracleJson,
      id: 1
    }
    ]


    this.currentContract = this.props.routeParams.contract;
    this.asset_id = 1
    this.contracts = context.drizzle.contracts
    this.drizzle = context.drizzle
    this.matchHistory = {}
  }


  componentDidMount() {
    document.title = 'Schedule Event Logs';
    Object.keys(this.assets).forEach(function (asset) {
      this.getbetHistoryArray(asset)
    }, this);

  }

  timeConverter(UNIX_timestamp) {
    var a = new Date(UNIX_timestamp * 1000);
    var year = a.getFullYear();
    var month = a.getMonth();
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var time = date + '/' + month + '/' + year + ' ' + hour + ':' + min;
    return time;
  }

  timeDay(UNIX_timestamp) {
    var a = new Date(UNIX_timestamp * 1000);
    var day = a.getDay();
    return day;
  }

  async getbetHistoryArray() {
    const web3 = this.context.drizzle.web3
    const id = await web3.eth.net.getId();
    const oracleContractAddress = Oracle.networks[id].address;
    const contractweb3 = new web3.eth.Contract(Oracle.abi, oracleContractAddress);
    var pricedata = [];
    const events = await contractweb3.getPastEvents(
      'SchedulePosted',
      {
        fromBlock: 6000123,
        toBlock: 'latest'
      }
    )
    events.forEach(function (element) {
      pricedata.push({
        games: element.returnValues.sched,
        Epoch: element.returnValues.epoch,
        time: element.returnValues.timestamp
      })
    }, this);
    this.matchHistory = pricedata
  }


  //  this.priceHistory = [this.matchHistory, this.matcHistory2, this.matchHistory3, this.matchHistory4]


  openEtherscan() {
    const url = "https://rinkeby.etherscan.io/address/0xBA8f31a128f1CF6f1A50B87DAeee0AE1e1cf98f3";
    // new const url = "https://ropsten.etherscan.io/address/0xc9c61e5Ec1b7E7Af5Ccb91b6431733dE6d62cAC3#code";
    window.open(url, "_blank");
  }


  render() {
    if (Object.keys(this.matchHistory).length === 0)
      return (
        <Text size="20px" weight="200">Waiting...</Text>
      )
    else {
      return (
        <div>

          <Text size="20px">
            <a
              className="nav-header"
              style={{
                cursor: "pointer",
              }}
              href="/"
            >
              Back
          </a>
          </Text>
          <Box mt="15px"
            mx="30px" >
            <Flex width="100%"
              justifyContent="marginLeft" >
              <Text size="14px" weight="300"> These event logs are created with every new epoch. Their order
              is consistent with the odds, results, and start time orders. Each item represents a match, and
              has the format "sport:homeTeam:awayTeam". Thus to validate the oracle, apply the most recent
        schedule data listed here to odds, results, and start times.</Text>
            </Flex>
          </Box>
          <br />

          <Text size="12px" weight="200">
            {" "}
                  Time, Week, match0, match1, match2, match3, match4, match5, match6, match7, match8, match9,
                  match10, match11, match2, match13, match14, match15, match16, match17, match18, match19,
                  match20, match21, match22, match23, match24, match25, match26, match27, match28, match29, match30, match31
                </Text>{" "}
          <br />
          {this.matchHistory.map((event) => (
            <div key={event}>
              <Text size="12px" weight="200">
                {" "}
                {moment.unix(event.time).format("DD-MM-YYTHH:mm")},{" "}
                {event.Epoch},
                      {event.time},
                      {event.games[0]},
                      {event.games[1]},
                      {event.games[2]},
                      {event.games[3]},
                      {event.games[4]},
                      {event.games[5]},
                      {event.games[6]},
                      {event.games[7]},
                      {event.games[8]},
                      {event.games[9]},
                      {event.games[10]},
                      {event.games[11]},
                      {event.games[12]},
                      {event.games[13]},
                      {event.games[14]},
                      {event.games[15]},
                      {event.games[16]},
                      {event.games[17]},
                      {event.games[18]},
                      {event.games[19]},
                      {event.games[20]},
                      {event.games[21]},
                      {event.games[22]},
                      {event.games[23]},
                      {event.games[24]},
                      {event.games[25]},
                      {event.games[26]},
                      {event.games[27]},
                      {event.games[28]},
                      {event.games[29]},
                      {event.games[30]},
                      {event.games[31]}
              </Text>
              <br />
            </div>
          ))}


        </div>
      );
    }
  }
}


EventSchedule.contextTypes = {
  drizzle: PropTypes.object
}

// May still need this even with data function to refresh component on updates for this contract.
const mapStateToProps = state => {
  return {
    accounts: state.accounts,
    contracts: state.contracts,
    drizzleStatus: state.drizzleStatus
  }
}

export default drizzleConnect(EventSchedule, mapStateToProps)
