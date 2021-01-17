pragma solidity ^0.5.0;

import "node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./Token.sol";

// Deposit & Withdraw Funds
// Manage Orders - Make or Cancel
// Handle Trades - Charge fees

// TODO:
// [x] Set the fee account
// [x] Deposit Ether
// [ ] Withdraw Ether
// [x] Deposit tokens
// [o] Withdraw tokens
// [ ] Check balances
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

    // Mappings
    // token address => deposit user address => token balances
    mapping (address => mapping(address => uint256)) public tokens;

    // Events
    event Deposit(address token, address user, uint256 amount, uint256 balance);
    event Withdraw(address token, address user, uint256 amount, uint256 balance);

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

    function withdrawEther(uint _amount) public payable {
        tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].sub(_amount);
        emit Withdraw(ETHER, msg.sender, tokens[ETHER][msg.sender], tokens[ETHER][msg.sender]);
    }

    function depositToken(address _token, uint _amount) public {
        // Don't allow Ether deposits
        require(_token != ETHER);
        // send tokens to this contract
        require(Token(_token).transferFrom(msg.sender, address(this), _amount));
        // update tokens mapping by adding _amount to msg.sender balance
        tokens[_token][msg.sender] = tokens[_token][msg.sender].add(_amount);
        // emit event
        emit Deposit(_token, msg.sender, _amount, tokens[_token][msg.sender]);
    }
}











