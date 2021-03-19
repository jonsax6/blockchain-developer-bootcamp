export const ETHER_ADDRESS = '0x0000000000000000000000000000000000000000'
export const RED = 'danger'
export const GREEN = 'success'

export const EVM_REVERT = 'VM Exception while processing transaction: revert'

export const DECIMALS = (10**18)

export const ether = (wei) => {
  if(wei) {
    return(wei / DECIMALS)
  }
}

export const tokens = ether

export const formatBalance = (balance) => {
  balance = ether(balance)
  balance = Math.round(balance * 100)/100 // rounded to two decimal places
  return balance
}