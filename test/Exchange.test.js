import { invalid } from 'moment';
import { ETHER_ADDRESS, EVM_REVERT, ether, tokens } from '../src/helpers';

const { transferPromiseness } = require("chai-as-promised");
const { iteratee } = require("lodash");
const { default: Web3 } = require("web3");
const _deploy_contracts = require("../migrations/2_deploy_contracts");

const Token = artifacts.require('./Token')
const Exchange = artifacts.require('./Exchange')

require('chai')
    .use(require('chai-as-promised'))
    .should()

contract('Exchange', ([deployer, feeAccount, user1]) => {
    let token
    let exchange
    const feePercent = 10

    beforeEach(async () => {
        // Deploy token
        token = await Token.new()
        
        // Transfer some tokens to user1
        await token.transfer(user1, tokens(100), { from: deployer })

        // Deploy exchange
        exchange = await Exchange.new(feeAccount, feePercent)
    })

    describe('deployment', () => {
        // it tracks fee account
        it('tracks the feeAccount', async () => {
            let result  = await exchange.feeAccount()
            result.should.equal(feeAccount)
        })

        it('sets the fee amount', async () => {
            let result = await exchange.feePercent()
            result.toString().should.equal(feePercent.toString()) 
        })
    })

    describe('fallback', () => {
        it('reverts when Ether is sent directly to contract', async () => {
            await exchange.sendTransaction({ value: ether(1), from: user1 }).should.be.rejectedWith(EVM_REVERT)
        })
    })

    describe('depositing ether', async () => {
        let result
        let amount = ether(1)

        beforeEach(async () => {
            result = await exchange.depositEther({ from: user1, value: amount })
        })

        it('tracks the ether deposit', async () => {
            const balance = await exchange.tokens(ETHER_ADDRESS, user1)
            balance.toString().should.equal(amount.toString())
        })

        it('emits a Deposit event', async () => {
            // bind log to result.logs[0]
            const log = result.logs[0]
            log.event.should.equal('Deposit')
            // bind event to log.args
            const event = log.args
            // event should equal 'Deposit'
            event.token.toString().should.equal(ETHER_ADDRESS, 'ether amount is correct')
            event.user.toString().should.equal(user1, 'user is correct')
            event.amount.toString().should.equal(amount.toString(), 'amount is correct')
            event.balance.toString().should.equal(amount.toString(), 'balance is correct')
        })
    })

    describe('withdrawing ether', async () => {
        let result
        let amount = ether(1)
        
        beforeEach(async () => {
            // Deposit ether first
            await exchange.depositEther({ value: amount, from: user1 })
        })

        describe('success', async () => {
            beforeEach(async () => {
                result = await exchange.withdrawEther(amount, { from: user1 })
            })

            it('withdraws ether funds', async () => {
                const balance = await exchange.tokens(ETHER_ADDRESS, user1)
                balance.toString().should.equal('0')
            })

            it('emits a Withdraw event', async () => {
                // bind log to result.logs[0]
                const log = result.logs[0]
                log.event.should.equal('Withdraw')
                // bind event to log.args
                const event = log.args
                // event should equal 'Deposit'
                event.token.toString().should.equal(ETHER_ADDRESS, 'ether amount is correct')
                event.user.toString().should.equal(user1, 'user is correct')
                event.amount.toString().should.equal('0', 'amount is correct')
                event.balance.toString().should.equal('0', 'balance is correct')
            })
        })
    })

    describe('depositing tokens', () => {
        let result
        let amount

        describe('succes', () => {
            beforeEach(async () => {
                amount = tokens(10)
                await token.approve(exchange.address, amount, { from: user1 })
                result = await exchange.depositToken(token.address, amount, { from: user1 })
            })

            it('tracks the token deposit', async () => {
                // check the token balance
                let balance
                balance = await token.balanceOf(exchange.address)
                balance.toString().should.equal(amount.toString())
                balance = await exchange.tokens(token.address, user1)
                balance.toString().should.equal(amount.toString())
            })

            it('emits a Deposit event', async () => {
                // bind log to result.logs[0]
                const log = result.logs[0]
                log.event.should.equal('Deposit')
                // bind event to log.args
                const event = log.args
                // event should equal 'Deposit'
                event.token.toString().should.equal(token.address, 'token is correct')
                event.user.toString().should.equal(user1, 'user is correct')
                event.amount.toString().should.equal(amount.toString(), 'amount is correct')
                event.balance.toString().should.equal(amount.toString(), 'balance is correct')
            })
        })
        
        describe('failure', () => {
            it('rejects ether deposits', async () => {
                result = await token.approve(exchange.address, tokens(10), { from: user1 })
                // checks exchange approval
                result.receipt.status.should.equal(true)

                // attempts to deposit ETH and verify revert
                await exchange.depositToken(ETHER_ADDRESS, tokens(10), { from: user1 })
                    .should.be.rejectedWith(EVM_REVERT)
            })

            it('fails when no tokens are approved', async () => {
                // Don't approve any tokens before depositing
                await exchange.depositToken(token.address, tokens(10), { from: user1 })
                    .should.be.rejectedWith(EVM_REVERT)
            })
        })
    })
}) 






