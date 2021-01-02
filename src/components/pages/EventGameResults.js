import React, { Component } from 'react'
import { drizzleConnect } from '@drizzle/react-plugin'
import PropTypes from 'prop-types'
import { autoBind } from 'react-extras'
import Text from '../basics/Text'
import IndicatorD from "../basics/IndicatorD"
import Oracle from '../../abis/Oracle.json'
var moment = require("moment");

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
    document.title = 'Match Result Event Logs';
    Object.keys(this.assets).forEach(function (asset) {
      this.getgameHistoryArray(asset)
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

  translateOutcome(x) {
    if (x === "0") {
      return "tie"
    } else if (x === "1") {
      return "Home"
    } else {
      return "Away"
    }
  }

  async getgameHistoryArray() {
    const web3 = this.context.drizzle.web3
    const id = await web3.eth.net.getId();
    const oracleContractAddress = Oracle.networks[id].address;
    const contractweb3 = new web3.eth.Contract(Oracle.abi, oracleContractAddress);
    var pricedata = [];
    const events = await contractweb3.getPastEvents(
      'ResultsPosted',
      {
        fromBlock: 6000123,
        toBlock: 'latest'
      }
    );

    events.forEach(function (element) {
      pricedata.push({
        timestamp: element.returnValues.timestamp,
        outcome: element.returnValues.winner,
        Epoch: element.returnValues.epoch
      })

    }, this);
    this.priceHistory = pricedata
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
    else {
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
                    Time, Week: match0, match1, match2, match3, match4, match5, match6, match7, match8, match9,
                    match10, match11, match12, match13, match14, match15
                  </Text>{" "}
          <br />
          {this.priceHistory.map((event) => (
            <div key={event}>
              <Text size="12px" weight="200">
                {" "}
                {moment.unix(event.timestamp).format("DD-MM-YYTHH:mm")},{" "}
                {event.Epoch} {": "} {event.outcome[0]},{" "}
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
