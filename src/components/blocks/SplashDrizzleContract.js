import { drizzleConnect } from '@drizzle/react-plugin'
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Box, Flex } from '@rebass/grid'
import { Radius } from '../basics/Style'
import { B, A, E, K } from '../basics/Colors.js'
import Text from '../basics/Text.js'
import Triangle from '../basics/Triangle.js'
import { If, autoBind } from 'react-extras'
import Button from '../basics/Button'


class SplashDrizzleContract extends Component {
  constructor(props, context) {
    super(props)
    autoBind(this)
  }

  render() {

    return (
      <Flex
        style={{
          borderRadius: Radius,
          overflow: "hidden",
        }}
      >
        <Box width={1} flexDirection="row" style={{ display: "flex" }}>

          <If
            condition={this.props.showActions}
            render={() => (
              <Box
                style={{
                  backgroundColor: B,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  width: "15em",
                  justifyContent: "flex-end",
                }}
                display="flex"
                flexDirection="row"
              >
                <Button
                  px="12px"
                  display="flex"
                  flexDirection="row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "300px",
                    justifyContent: "center"
                  }}
                >
                  <a
                    href={"/betpage"}
                    style={{ textDecoration: "none" }}
                  >
                    <Text color="white" size="20px">
                      Enable MetaMask and Enter
                        </Text>
                  </a>
                </Button>
              </Box>
            )}
          />
        </Box>
      </Flex>
    );
  }
}

SplashDrizzleContract.contextTypes = {
  drizzle: PropTypes.object
}


const mapStateToProps = state => {
  return {
    contracts: state.contracts,
    accounts: state.accounts,
    drizzleStatus: state.drizzleStatus
  }
}

export default drizzleConnect(SplashDrizzleContract, mapStateToProps);
