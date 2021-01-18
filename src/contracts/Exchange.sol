pragma solidity ^0.5.0;

import "node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./Token.sol";

// Deposit & Withdraw Funds
// Manage Orders - Make or Cancel
// Handle Trades - Charge fees

// TODO:
// [x] Set the fee account
// [x] Deposit Ether
// [x] Withdraw Ether
// [x] Deposit tokens
// [x] Withdraw tokens
// [x] Check balances
// [ ] Make Order
// [ ] Cancel order
// [ ] Fill Order
// [ ] Charge fees

contract Exchange {
    using SafeMath for uint;
    // Variables
    address public feeAccount; // account received exchange fees
    uint256 public feePercent; // fee percentage
    address constant ETHER = address(0); // store ETH in tokens mapping with black address
    uint256 public orderCount;

    // Mappings
    // token address => deposit user address => token balances
    mapping (address => mapping(address => uint256)) public tokens;
    mapping (uint256 => _Order) public orders;

    // Events
    event Deposit(address token, address user, uint256 amount, uint256 balance);
    event Withdraw(address token, address user, uint256 amount, uint256 balance);
    event Order(
        uint256 id, 
        address user, 
        address tokenGet, 
        uint256 amountGet, 
        address tokenGive, 
        uint256 amountGive,
        uint256 timestamp
    );

    // Structs
    struct _Order {
        uint256 id;
        address user;
        address tokenGet;
        uint256 amountGet;
        address tokenGive;
        uint256 amountGive;
        uint256 timestamp;
    }

    // a way to model the order
    // a way to store the order on the blockchain
    // add the order to storage

    constructor(address _feeAccount, uint256 _feePercent) public {
        feeAccount = _feeAccount;
        feePercent = _feePercent;
    }

    // Fallback: reverts if Ether sent to this smart contract
    function() external {
        revert();
    }

    function depositEther() public payable {        
        tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].add(msg.value);
        emit Deposit(ETHER, msg.sender, msg.value, tokens[ETHER][msg.sender]);
    }

    function withdrawEther(uint256 _amount) public payable {
        require(tokens[ETHER][msg.sender] >= _amount);
        tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].sub(_amount);
        msg.sender.transfer(_amount);
        emit Withdraw(ETHER, msg.sender, _amount, tokens[ETHER][msg.sender]);
    }

    function depositToken(address _token, uint256 _amount) public {
        // Don't allow Ether deposits
        require(_token != ETHER);
        // send tokens to this contract
        require(Token(_token).transferFrom(msg.sender, address(this), _amount));
        // update tokens mapping by adding _amount to msg.sender balance
        tokens[_token][msg.sender] = tokens[_token][msg.sender].add(_amount);
        // emit event
        emit Deposit(_token, msg.sender, _amount, tokens[_token][msg.sender]);
    }

    function withdrawToken(address _token, uint256 _amount) public {
        // Don't allow Ether withdrawals
        require(_token != ETHER);
        // make sure there are sufficient tokens to withdraw
        require(tokens[_token][msg.sender] >= _amount);
        // withdraw Tokens from this contract
        require(Token(_token).transfer(msg.sender, _amount));
        // update tokens mapping by subtracting _amount from msg.sender balance
        tokens[_token][msg.sender] = tokens[_token][msg.sender].sub(_amount);
        // emit Withdraw event
        emit Withdraw(_token, msg.sender, _amount, tokens[_token][msg.sender]);
    }

    function balanceOf(address _token, address _user) public view returns (uint256){
        return tokens[_token][_user];
    }

    function makeOrder(
        address _tokenGet, 
        uint256 _amountGet, 
        address _tokenGive, 
        uint256 _amountGive
        ) public {
            orderCount = orderCount.add(1);
            orders[orderCount] = _Order(
                orderCount, 
                msg.sender, 
                _tokenGet, 
                _amountGet, 
                _tokenGive, 
                _amountGive, 
                now
            );
            emit Order(
                orderCount, 
                msg.sender, 
                _tokenGet, 
                _amountGet, 
                _tokenGive, 
                _amountGive, 
                now
            );
        }
}











