const drizzleOptions = {
  web3: {
    block: false,
    fallback: {
      type: 'ws',
      //  url: 'wss://mainnet. infura.io/ws/v3/3e4616a1aed64da3b29e20c2970e23b7'
      //  url: 'wss://mainnet.infura.io/ws/v3/ff71f0ac9a2c42caa271851f369053f6'
      //  url: 'wss://ropsten.infura.io/ws/v3/30a3fd3439754a74aa30ffae717d5d4c'
      // url: 'wss://rinkeby.infura.io/ws/v3/ff71f0ac9a2c42caa271851f369053f6'
      // url: 'wss://rinkeby.infura.io/ws/v3/30a3fd3439754a74aa30ffae717d5d4c'
      url: 'wss://rinkeby.infura.io/ws/v3/790364983f7a4b8ebb6b0ac344360e57'
      // https://rinkeby.infura.io/v3/790364983f7a4b8ebb6b0ac344360e57
    }
  },

  polls: {
    accounts: 1500
  }
}

export default drizzleOptions
