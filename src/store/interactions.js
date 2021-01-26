import Web3 from 'web3'
import { 
    web3Loaded,
    web3AccountLoaded,
    tokenLoaded, 
    exchangeLoaded
} from './actions'
import Token from '../abis/Token.json'
import Exchange from '../abis/Exchange.json'
// import { ETHER_ADDRESS } from '../helpers'

  export const loadWeb3 = async (dispatch) => {
    
    if(typeof window.ethereum!=='undefined'){
      const web3 = new Web3(window.ethereum)
      dispatch(web3Loaded(web3))
      return web3
    } else {
      window.alert('Please install MetaMask')
      window.location.assign("https://metamask.io/")
    }
  }

  export const loadAccount = async (web3, dispatch) => {
    // Loads the metamask account
    await window.ethereum.request({ method: 'eth_requestAccounts' })
    const accounts = await web3.eth.getAccounts()
    const account = await accounts[0]
    if(typeof account !== 'undefined'){
      dispatch(web3AccountLoaded(account))
      return account
    } else {
      dispatch(web3AccountLoaded(null))
      return null
    }
  }

  export const loadToken = async (web3, networkId, dispatch) => {
    try {
      const token = new web3.eth.Contract(Token.abi, Token.networks[networkId].address)
      dispatch(tokenLoaded(token))
      return token
    } catch (error) {
      console.log('Contract not deployed to the current network. Please select another network with Metamask.')
      return null
    }
  }
  
  export const loadExchange = async (web3, networkId, dispatch) => {
    try {
      const exchange = new web3.eth.Contract(Exchange.abi, Exchange.networks[networkId].address)
      dispatch(exchangeLoaded(exchange))
      return exchange
    } catch (error) {
      console.log('Contract not deployed to the current network. Please select another network with Metamask.')
      return null
    }
  }

  export const loadAllOrders = async (exchange, dispatch) => {
    // fetch cancelled orders with the "Cancel" event stream
    const cancelStream = await exchange.getPastEvents('Cancel', { fromBlock: 0, toBlock: 'latest' })
    console.log(cancelStream)
    // fetch filled orders withe the "Trade" event stream

    // fetch all orders with the "Order" event stream

  }
