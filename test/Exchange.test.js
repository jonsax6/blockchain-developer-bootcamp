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

contract('Exchange', ([deployer, feeAccount, user1, user2]) => {
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
                event.amount.toString().should.equal(amount.toString(), 'amount is correct')
                event.balance.toString().should.equal('0', 'balance is correct')
            })
        })

        describe('failure', async () => {
            it('should revert for insufficient balances', async () => {
                await exchange.withdrawEther(ether(100), { from: user1 })
                    .should.be.rejectedWith(EVM_REVERT)
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

    describe('withdrawing tokens', () => {
        let result
        let amount = tokens(100)

        describe('success', async () => {
            beforeEach(async () => {
                // first deposit tokens
                await token.approve(exchange.address, amount, { from: user1 })
                await exchange.depositToken(token.address, amount, { from: user1 })

                // then withdraw tokens
                result = await exchange.withdrawToken(token.address, amount, { from: user1 })
            })

            it('withdraws token funds', async () => {
                const balance = await exchange.tokens(token.address, user1)
                balance.toString().should.equal('0')            
            })

            it('emits a Withdraw event', async () => {
                // bind log to result.logs[0]
                const log = result.logs[0]
                log.event.should.equal('Withdraw')
                // bind event to log.args
                const event = log.args
                event.token.toString().should.equal(token.address, 'token is correct')
                event.user.toString().should.equal(user1, 'user is correct')
                event.amount.toString().should.equal(amount.toString(), 'amount is correct')
                event.balance.toString().should.equal('0'.toString(), 'balance is correct')
            })
        })

        describe('failure', async () => {
            it('should reject Ether withdrawals', async () => {
                await exchange.withdrawToken(ETHER_ADDRESS, ether(1), { from: user1 })
                    .should.be.rejectedWith(EVM_REVERT)
            })

            it('should revert for insufficient balances', async () => {
                await exchange.withdrawToken(token.address, tokens(100), { from: user1 })
                    .should.be.rejectedWith(EVM_REVERT)
            })
        })
    })

    describe('checking balances', async () => {
        beforeEach(async () => {
            await exchange.depositEther({ from: user1, value: ether(1) })        
        })
        
        it('returns user balance', async () => {
            const result = await exchange.balanceOf(ETHER_ADDRESS, user1)
            result.toString().should.equal(ether(1).toString())
        })
    })

    describe('making orders', async() => {
        let result

        beforeEach(async () => {
            result = await exchange.makeOrder(token.address, tokens(1), ETHER_ADDRESS, ether(1), { from: user1 })
        })

        it('tracks the newly created order', async () => {
            const orderCount = await exchange.orderCount()
            orderCount.toString().should.equal('1')
        })

        it('inspects the order properties', async () => {
            const order = await exchange.orders('1')
            order.id.toString().should.equal('1', 'id is corrrect')
            order.user.should.equal(user1, 'user is corrrect')
            order.tokenGet.should.equal(token.address, 'tokenGet is corrrect')
            order.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is corrrect')
            order.tokenGive.should.equal(ETHER_ADDRESS, 'tokenGive is corrrect')
            order.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is corrrect')
            order.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
        })

        it('emits an order event', async () => {
            // bind log to result.logs[0]
            const log = result.logs[0]
            log.event.should.equal('Order')
            // bind event to log.args
            const event = log.args
            event.id.toString().should.equal('1', 'id is corrrect')
            event.user.should.equal(user1, 'user is corrrect')
            event.tokenGet.should.equal(token.address, 'tokenGet is corrrect')
            event.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is corrrect')
            event.tokenGive.should.equal(ETHER_ADDRESS, 'tokenGive is corrrect')
            event.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is corrrect')
            event.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
        })
    })

    describe('order actions', async () => {
        beforeEach(async () => {
            // user1 deposits ether only
            await exchange.depositEther({ from: user1, value: ether(1) })
            // give tokens to user2
            await token.transfer(user2, tokens(100), { from: deployer })
            // user2 deposits tokens only
            await token.approve(exchange.address, tokens(2), { from: user2 })
            await exchange.depositToken(token.address, tokens(2), { from: user2 })
            // user1 makes an order to buy tokens with Ether
            await exchange.makeOrder(token.address, tokens(1), ETHER_ADDRESS, ether(1), { from: user1 })
        })    

        describe('filling orders', async () => {
            let result
            
            describe('success', async () => {
                beforeEach(async () => {
                    result = await exchange.fillOrder('1', { from: user2 })
                })

                it('executes the trade and charges fees', async () => {
                    let balance

                    // token balance user1
                    balance = await exchange.balanceOf(token.address, user1)
                    // should equal tokens(1) 'user1 received tokens'
                    balance.toString().should.equal(tokens(1).toString(), 'user1 received tokens')
                    // ether balance user2
                    balance = await exchange.balanceOf(ETHER_ADDRESS, user2)
                    // should equal ether(1) 'user2 received tokens'
                    balance.toString().should.equal(ether(1).toString(), 'user2 received tokens')
                    // ether balance user1
                    balance = await exchange.balanceOf(ETHER_ADDRESS, user1)
                    // should equal 0 'user2 ether deducted'
                    balance.toString().should.equal('0', 'user2 ether deducted')
                    // token balance user2
                    balance = await exchange.balanceOf(token.address, user2)
                    // should equal tokens(0.9) 'user2 tokens deducted with fee applied'
                    balance.toString().should.equal(tokens(0.9).toString(), 'user2 tokens deducted with fee applied')
                    const feeAccount = await exchange.feeAccount()
                    // token balance in feeAccount
                    balance = await exchange.balanceOf(token.address, feeAccount)
                    // should equal tokens(0.1) 'feeAccount received fee'
                    balance.toString().should.equal(tokens(0.1).toString(), 'feeAccount received fee')
                })

                it('updates the filled orders', async () => {
                    const orderFilled = await exchange.orderFilled(1)
                    orderFilled.should.equal(true)
                })


                it('emits a "Trade" event', async () => {
                    // bind log to result.logs[0]
                    const log = result.logs[0]
                    log.event.should.equal('Trade')
                    // bind event to log.args
                    const event = log.args
                    event.id.toString().should.equal('1', 'id is corrrect')
                    event.user.should.equal(user1, 'user is corrrect')
                    event.tokenGet.should.equal(token.address, 'tokenGet is corrrect')
                    event.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is corrrect')
                    event.tokenGive.should.equal(ETHER_ADDRESS, 'tokenGive is corrrect')
                    event.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is corrrect')
                    event.userFill.should.equal(user2, 'userFill is correct')
                    event.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
                })
            })

            describe('failure', async () => {
                it('rejects invalid order ids', async () => {
                    const invalidOrderId = 999
                    await exchange.fillOrder(invalidOrderId, { from: user2 })
                        .should.be.rejectedWith(EVM_REVERT)
                })

                it('rejects already filled orders', async () => {
                    await exchange.fillOrder('1', { from: user2 })
                        .should.be.fulfilled
                    await exchange.fillOrder('1', { from: user2 })
                        .should.be.rejectedWith(EVM_REVERT)
                })

                it('rejects cancelled orders', async () => {
                    await exchange.cancelOrder('1', { from: user1 })
                        .should.be.fulfilled
                    await exchange.fillOrder('1', { from: user2 })
                        .should.be.rejectedWith(EVM_REVERT)
                })
            })
        })


        describe('cancelling orders', async () => {
            let result

            describe('success', async () => {
                beforeEach(async () => {
                    result = await exchange.cancelOrder('1', { from: user1 })
                })

                it('updates cancelled orders', async () => {
                    const orderCancelled = await exchange.orderCancelled('1')
                    orderCancelled.should.equal(true)
                })

                it('emits a "Cancel" event', async () => {
                    // bind log to result.logs[0]
                    const log = result.logs[0]
                    log.event.should.equal('Cancel')
                    // bind event to log.args
                    const event = log.args
                    event.id.toString().should.equal('1', 'id is corrrect')
                    event.user.should.equal(user1, 'user is corrrect')
                    event.tokenGet.should.equal(token.address, 'tokenGet is corrrect')
                    event.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is corrrect')
                    event.tokenGive.should.equal(ETHER_ADDRESS, 'tokenGive is corrrect')
                    event.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is corrrect')
                    event.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
                })
            })

            describe('failure', async () => {
                it('rejects if not the order maker', async () => {
                    await exchange.cancelOrder('1', { from: user2 })
                        .should.be.rejectedWith(EVM_REVERT)
                })

                it('rejects an invalid order id', async () => {
                    const invalidOrderId = 9999
                    await exchange.cancelOrder(invalidOrderId, { from: user1 })
                        .should.be.rejectedWith(EVM_REVERT)
                })
            })
        })
    })
}) 






