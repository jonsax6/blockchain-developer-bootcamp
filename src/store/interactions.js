import Web3 from 'web3'
import { 
    web3Loaded,
    web3AccountLoaded
} from './actions'
// import Token from '../abis/Token.json'
// import Exchange from '../abis/Exchange.json'
// import { ETHER_ADDRESS } from '../helpers'


export const loadWeb3 = async (dispatch) => {
    if(typeof window.ethereum!=='undefined'){
    //   const web3 = new Web3(window.ethereum)
      const web3 = new Web3(Web3.givenProvider)
    //   const web3 = new Web3('http://localhost:7545')
      dispatch(web3Loaded(web3))
      return web3
    } else {
      window.alert('Please install MetaMask')
      window.location.assign("https://metamask.io/")
    }
  }
  
  export const loadAccount = async (web3, dispatch) => {
    const accounts = await web3.eth.getAccounts()
    const account = accounts[0]
    dispatch(web3AccountLoaded(account))
    return account
  }