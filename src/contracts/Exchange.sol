pragma solidity ^0.5.0;

import "node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./Token.sol";

// Contract executes the following:
// Sets the fee account
// Deposit Ether function
// Withdraw Ether function
// Deposit tokens function
// Withdraw tokens function
// Check balances function
// Make Order function
// Cancel order function
// Fill Order function
// Internal trade function
// Charges fees

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
    mapping (uint256 => bool) public orderCancelled;
    mapping (uint256 => bool) public orderFilled;

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

    event Cancel(
        uint256 id, 
        address user, 
        address tokenGet, 
        uint256 amountGet, 
        address tokenGive, 
        uint256 amountGive,
        uint256 timestamp
    );

    event Trade(
        uint256 id, 
        address user, 
        address tokenGet, 
        uint256 amountGet, 
        address tokenGive, 
        uint256 amountGive,
        address userFill,
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

    function cancelOrder(uint256 _id) public {
        _Order storage _order = orders[_id];
        // must be "my" order
        require(address(_order.user) == msg.sender);
        // must be a valid order
        require(orders[_id].id == _id);
        // add the cancelled order to the mapping
        orderCancelled[_id] = true;
        emit Cancel(
            _order.id, 
            msg.sender, 
            _order.tokenGet, 
            _order.amountGet, 
            _order.tokenGive, 
            _order.amountGive, 
            now
        );
    }

    function fillOrder(uint256 _id) public {
        require(_id <= orderCount && _id > 0);
        require(!orderFilled[_id]);
        require(!orderCancelled[_id]);
        // fetch the order from storage
        _Order storage _order = orders[_id];
        _trade(
            _order.id,
            _order.user, 
            _order.tokenGet, 
            _order.amountGet, 
            _order.tokenGive, 
            _order.amountGive
        );
            // mark order as filled
            orderFilled[_order.id] = true;
    } 

    function _trade(
        uint256 _orderId, 
        address _user,
        address _tokenGet, 
        uint256 _amountGet, 
        address _tokenGive, 
        uint256 _amountGive
        ) internal {
            // charge fee - fee is paid by order filler a.k.a. msg.sender
            uint256 _feeAmount = _amountGet.mul(feePercent).div(100);

            // execute trade (msg.sender is filling order, _user created the order):
            // give tokenGet to buyer and pay the fee
            tokens[_tokenGet][msg.sender] = tokens[_tokenGet][msg.sender].sub(_amountGet.add(_feeAmount)); 
            // take tokenGet from seller
            tokens[_tokenGet][_user] = tokens[_tokenGet][_user].add(_amountGet); 
            // receive fee into feeAccount
            tokens[_tokenGet][feeAccount] = tokens[_tokenGet][feeAccount].add(_feeAmount); 
            // give tokenGive to seller
            tokens[_tokenGive][_user] = tokens[_tokenGive][_user].sub(_amountGive); 
            // take tokenGive from buyer
            tokens[_tokenGive][msg.sender] = tokens[_tokenGive][msg.sender].add(_amountGet); 

            emit Trade(
                _orderId, 
                _user, 
                _tokenGet, 
                _amountGet, 
                _tokenGive, 
                _amountGive,
                msg.sender,
                now
            );
    }
}











