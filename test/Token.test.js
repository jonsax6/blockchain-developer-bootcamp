import { invalid } from 'moment';
import { tokens, EVM_REVERT} from '../src/helpers';

const { transferPromiseness } = require("chai-as-promised");
const { iteratee } = require("lodash");
const { default: Web3 } = require("web3");
const _deploy_contracts = require("../migrations/2_deploy_contracts");

const Token = artifacts.require('./Token')

require('chai')
    .use(require('chai-as-promised'))
    .should()

contract('Token', ([deployer, receiver, exchange]) => {
    let token = Token.new()
    const name = 'DApp Token'
    const symbol = 'DAPP'
    const decimals = '18'
    const totalSupply = tokens(1000000).toString()
    

    beforeEach(async () => {
        token = await Token.new()
    })

    describe('deployment', () => {
        // it track and verifies the name
        it('tracks the name', async () => {
            let result  = await token.name()
            result.toString().should.equal(name)
        })
        // it track and verifies the symbol
        it('tracks the symbol', async () => {
            let result = await token.symbol()
            result.toString().should.equal(symbol)
        })
        // it track and verifies the decimals
        it('tracks the decimals', async () => {
            let result = await token.decimals()
            result.toString().should.equal(decimals)
        })
        // it track and verifies the totalSupply
        it('tracks the supply', async () => {
            let result = await token.totalSupply()
            result.toString().should.equal(totalSupply.toString())
        })
        // it verifies deployer gets the total supply 
        it('assigns total supply to the deployer', async () => {
            let result = await token.balanceOf(deployer)
            result.toString().should.equal(totalSupply.toString())
        })
    })
    
    // describe sending tokens
    describe('sending tokens', async () => {
        let amount
        let result
        let EVM_REVERT = ''

        // describe success
        describe('success', async () => {
            // before each test
            beforeEach(async () => {
                // bind an amount to amount
                amount = tokens(100)
                // make transfer and bind a transaction receipt to result
                result = await token.transfer(receiver, amount, { from: deployer })
            })

            it('tranfers token balances', async () => {
                // declare balanceOf
                let balanceOf
                // bind Token balance of deployer to balanceOf
                balanceOf = await token.balanceOf(deployer)
                // verify balance amount of deployer (sender)
                balanceOf.toString().should.equal(tokens(999900).toString())
                // bind Token balance of receiver to balanceOf
                balanceOf = await token.balanceOf(receiver)
                // verify balance amount of receiver
                balanceOf.toString().should.equal(tokens(100).toString())
            })
            
            it('emits a Transfer event', async () => {
                // bind log to result.logs[0]
                const log = result.logs[0]
                // bind event to log.args
                const event = log.args
                // event should equal 'Transfer'
                log.event.should.equal('Transfer')
                // from address should equal deployer 'from is correct'
                event.from.toString().should.equal(deployer, 'from is correct')
                // to address should equal receiver 'to is correct'
                event.to.toString().should.equal(receiver, 'to is correct')
                // value should equal amount 'amount is correct'
                event.value.toString().should.equal(amount.toString(), 'amount is correct')
            })
        })

        describe('failure', async () => {
            it('rejects insufficient balance', async () => {
                // declare invalidAmount
                let invalidAmount;
                // bind invalidAmount to tokens()
                invalidAmount = tokens(100000000)
                // transfer invalidAmount of 100000000 from deployer and verify rejectedWith EVM_REVERT
                await token.transfer(receiver, invalidAmount, { from: deployer })
                    .should.be.rejectedWith(EVM_REVERT)

                // attempt transfer when balance is 0
                // bind invalidAmount to tokens(10)
                invalidAmount = tokens(10)
                // transfer from receiver and verify rejectedWith EVM_REVERT
                await token.transfer(deployer, invalidAmount, { from: receiver })
                    .should.be.rejectedWith(EVM_REVERT)
            })

            it('rejects invalid recipient', async () => {
                // bind amount to tokens(10)
                let amount = tokens(10)
                // transfer to 0x0 and verify rejectedWith(EVM_REVERT)
                await token.transfer(0x0, amount, { from: deployer })
                    .should.be.rejectedWith(EVM_REVERT)
            })
        })
    })

    describe('approving tokens', () => {
        let amount
        let result
        let EVM_REVERT = ''

        beforeEach(async () => {
            amount = tokens(100)
            result = await token.approve(exchange, amount, { from: deployer })
        })

        describe('success', () => {
            it('allocates an allowance for delegated token spending on exchange', async () => {
                const allowance = await token.allowance(deployer, exchange)
                allowance.toString().should.equal(amount.toString())
            })

            it('emits a Approval event', async () => {
                // bind log to result.logs[0]
                const log = result.logs[0]
                // bind event to log.args
                const event = log.args
                // event should equal 'Transfer'
                log.event.should.equal('Approval')
                // from address should equal deployer 'from is correct'
                event.owner.toString().should.equal(deployer, 'owner is correct')
                // to address should equal receiver 'to is correct'
                event.spender.toString().should.equal(exchange, 'spender is correct')
                // value should equal amount 'amount is correct'
                event.value.toString().should.equal(amount.toString(), 'value is correct')
            })
        })

        // describe tx failure 
        describe('failure', () => {
            // it reverts for an invalid address
            it('rejects invalid address', async () => {
                await token.approve(0x0, amount).should.be.rejectedWith(EVM_REVERT)
            })
        })
    })

    describe('delegated token transfers', async () => {
        let amount
        let result
        let EVM_REVERT = ''

        beforeEach(async () => {
            // bind an amount to amount
            amount = tokens(100)
            await token.approve(exchange, amount, { from: deployer })
        })

        // describe success
        describe('success', async () => {
            // before each test
            beforeEach(async () => {

                // make transfer and bind a transaction receipt to result
                result = await token.transferFrom(deployer, receiver, amount, { from: exchange })
            })

            it('tranfers token balances', async () => {
                // declare balanceOf
                let balanceOf
                // bind Token balance of deployer to balanceOf
                balanceOf = await token.balanceOf(deployer)
                // verify balance amount of deployer (sender)
                balanceOf.toString().should.equal(tokens(999900).toString())
                // bind Token balance of receiver to balanceOf
                balanceOf = await token.balanceOf(receiver)
                // verify balance amount of receiver
                balanceOf.toString().should.equal(tokens(100).toString())
            })

            it('resets the allowance', async () => {
                const allowance = await token.allowance(deployer, exchange)
                allowance.toString().should.equal('0')
            })
            
            it('emits a Transfer event', async () => {
                // bind log to result.logs[0]
                const log = result.logs[0]
                // bind event to log.args
                const event = log.args
                // event should equal 'Transfer'
                log.event.should.equal('Transfer')
                // from address should equal deployer 'from is correct'
                event.from.toString().should.equal(deployer, 'from is correct')
                // to address should equal receiver 'to is correct'
                event.to.toString().should.equal(receiver, 'to is correct')
                // value should equal amount 'amount is correct'
                event.value.toString().should.equal(amount.toString(), 'amount is correct')
            })
        })

        describe('failure', async () => {
            it('rejects insufficient balance', async () => {
                // declare invalidAmount
                let invalidAmount;
                // bind invalidAmount to too many tokens()
                invalidAmount = tokens(100000000)
                // exchange attempts transfer of invalidAmount from deployer - verify rejectedWith EVM_REVERT
                await token.transferFrom(deployer, receiver, invalidAmount, { from: exchange })
                    .should.be.rejectedWith(EVM_REVERT)
            })

            it('rejects invalid recipient', async () => {
                // bind amount to tokens(10)
                let amount = tokens(10)
                // transfer to 0x0 and verify rejectedWith(EVM_REVERT)
                await token.transferFrom(deployer, 0x0, amount, { from: exchange })
                    .should.be.rejectedWith(EVM_REVERT)
            })
        })
    })
}) 






