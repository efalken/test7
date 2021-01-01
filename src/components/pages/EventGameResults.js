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
import moment from 'moment';
// var moment = require("moment")
//var momentTz = require("moment-timezone")


class EventGameoutcomes extends Component {

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
      document.title='Match Result Event Logs';
      Object.keys(this.assets).forEach(function(asset) {
          this.getgameHistoryArray(asset)
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

  translateOutcome(x) {
      if (x === "0") {
        return "tie"
      } else if (x === "1" ) {
        return "Home"
      } else {
        return "Away"
      }
    }

  getgameHistoryArray() {
    const web3 = this.context.drizzle.web3
    const contractweb3 = new web3.eth.Contract(Oracle.abi, Oracle.address);
    var pricedata = [];
    contractweb3.getPastEvents(
      'ResultsPosted',
      {
        fromBlock: 6000123,
        toBlock: 'latest'
      }
    ).then(function(events) {

      events.forEach(function(element) {
        pricedata.push({
          timestamp: element.returnValues.timestamp,
          outcome: element.returnValues.winner,
          Epoch: element.returnValues.epoch})

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

console.log("phist", this.priceHistory);


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
                    match10, match11, match12, match13, match14, match15, match16, match17, match18, match19,
                    match20, match21, match22, match23, match24, match25, match26, match27, match28, match29,
                    match30, match31
                  </Text>{" "}
                  <br />
                  {this.priceHistory.map((event) => (
                    <div key={event}>
                      <Text size="12px" weight="200">
                        {" "}
                        {moment.unix(event.timestamp).format("DD-MM-YYTHH:mm")},{" "}
                        {event.Epoch} {": "} {event.outcome[0]},{" "}
                      {event.outcome[1]},{" "}
                      {event.outcome[2]},{" "}
                      {event.outcome[3]},{" "}
                      {event.outcome[4]},{" "}
                      {event.outcome[5]},{" "}
                      {event.outcome[6]},{" "}
                      {event.outcome[7]},{" "}
                      {event.outcome[8]},{" "}
                      {event.outcome[9]},{" "}
                      {event.outcome[10]},{" "}
                      {event.outcome[11]},{" "}
                      {event.outcome[12]},{" "}
                      {event.outcome[13]},{" "}
                      {event.outcome[14]},{" "}
                      {event.outcome[15]},{" "}
                      {event.outcome[16]},{" "}
                      {event.outcome[17]},{" "}
                      {event.outcome[18]},{" "}
                      {event.outcome[19]},{" "}
                      {event.outcome[10]},{" "}
                      {event.outcome[21]},{" "}
                      {event.outcome[22]},{" "}
                      {event.outcome[23]},{" "}
                      {event.outcome[24]},{" "}
                      {event.outcome[25]},{" "}
                      {event.outcome[26]},{" "}
                      {event.outcome[27]},{" "}
                      {event.outcome[28]},{" "}
                      {event.outcome[29]},{" "}
                      {event.outcome[30]},{" "}
                      {event.outcome[31]}
                      </Text>
                    <br />
                  </div>
                ))}

        </div>
      );
    }
  }
}


EventGameoutcomes.contextTypes = {
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

export default drizzleConnect(EventGameoutcomes, mapStateToProps)
