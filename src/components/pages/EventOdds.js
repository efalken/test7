import React, { Component } from 'react'
import { drizzleConnect } from '@drizzle/react-plugin'
import PropTypes from 'prop-types'
import { autoBind } from 'react-extras'
import Text from '../basics/Text'
import IndicatorD from "../basics/IndicatorD"
import Oracle from '../../noTruffleContracts/Oracle.json'
import {
  Box,
  Flex
} from '@rebass/grid'
//import moment from 'moment';
var moment = require("moment");
//var momentTz = require("moment-timezone");


class EventOdds extends Component {

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
    this.priceHistory = {}

  }


  componentDidMount() {
    document.title='Posted Odds Event Logs';
    Object.keys(this.assets).forEach(function(asset) {
        this.getbetHistoryArray(asset)
      }, this);
  }

  timeConverter(UNIX_timestamp){
    var a = new Date(UNIX_timestamp * 1000);
    var year = a.getFullYear();
    var month = a.getMonth();
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    var time = date + '/' + month + '/' + year + ' ' + hour + ':' + min;
    return time;
  }


  getbetHistoryArray() {
    const web3 = this.context.drizzle.web3
    const contractweb3 = new web3.eth.Contract(Oracle.abi, Oracle.address);
    var pricedata = [];
    contractweb3.getPastEvents(
      'DecOddsPosted',
      {
        fromBlock: 6000123,
        toBlock: 'latest'
      }
    ).then(function(events) {

      events.forEach(function(element) {
        pricedata.push({
          decOdds: element.returnValues.decOdds,
          Epoch: element.returnValues.epoch,
          time: element.returnValues.timestamp})

    }, this);
      this.priceHistory = pricedata
    }.bind(this))
  }


  openEtherscan() {
     const url = "https://rinkeby.etherscan.io/address/0xBA8f31a128f1CF6f1A50B87DAeee0AE1e1cf98f3";
    // new const url = "https://ropsten.etherscan.io/address/0xc9c61e5Ec1b7E7Af5Ccb91b6431733dE6d62cAC3#code";
    window.open(url, "_blank");
  }


  render() {


    console.log("decodds", this.priceHistory);


    if (Object.keys(this.priceHistory).length === 0)
      return (
        <Text size="20px" weight="200">Waiting...</Text>
        )
    else
    {
      return (
        <div>
            <IndicatorD
              className="etherscanLink"
              size="15px"
              mr="10px"
              mb="10px"
              ml="5px"
              mt="10px"
              width="360px"
              label="See Contract on"
              onClick={() => this.openEtherscan()}
              value="Etherscan"
            />

                <Text size="12px" weight="200">
                  {" "}
                  Time, Epoch, match0, match1, match2, match3, match4, match5, match6, match7, match8, match9,
                  match10, match11, match12, match13, match14, match15
                </Text>{" "}
                <br />
                {this.priceHistory.map((event) => (
                  <div key={event}>
                    <Text size="12px" weight="200">
                      {" "}
                      {moment.unix(event.time).format("DD-MM-YYTHH:mm")},{" "}
                      {event.Epoch},
                      {event.decOdds[0]},{" "}
                      {event.decOdds[1]}, {event.decOdds[2]},{" "}
                      {event.decOdds[3]}, {event.decOdds[4]},{" "}
                      {event.decOdds[5]}, {event.decOdds[6]},{" "}
                      {event.decOdds[7]}, {event.decOdds[8]},{" "}
                      {event.decOdds[9]}, {event.decOdds[10]},{" "}
                      {event.decOdds[11]}, {event.decOdds[12]},{" "}
                      {event.decOdds[13]}, {event.decOdds[14]},{" "}
                      {event.decOdds[15]}, {event.decOdds[16]},{" "}
                      {event.decOdds[17]}, {event.decOdds[18]},{" "}
                      {event.decOdds[19]}, {event.decOdds[20]},{" "}
                      {event.decOdds[21]}, {event.decOdds[22]},{" "}
                      {event.decOdds[23]}, {event.decOdds[24]},{" "}
                      {event.decOdds[25]}, {event.decOdds[26]},{" "}
                      {event.decOdds[27]}, {event.decOdds[28]},{" "}
                      {event.decOdds[29]}, {event.decOdds[30]},
                      {event.decOdds[31]}
                    </Text>
                    <br />
                  </div>
                ))}

        </div>
      );
    }
  }
}


EventOdds.contextTypes = {
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

export default drizzleConnect(EventOdds, mapStateToProps)
