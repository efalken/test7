pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

/** SPDX-License-Identifier: MIT **/

contract Token {
    // ERC-20 token variables and methods are uncommented because they are standard
    uint8 private _decimals;
    // this variable keeps track of proposals for voting
    uint32 public votePropNumber;
    address public bettingContract;
    address public oracleContract;
    address public proposer;
    mapping(address => uint256) private _balances;
    // this mapping restricts token transfers by voters so they cannot vote twice
    mapping(address => uint32) public voteMonitor;
    mapping(address => mapping(address => uint256)) private _allowed;
    string private _name;
    string private _symbol;
    uint256 private _totalSupply;
    uint256 private _totalAllotted;
    // this monitors yes and no votes of a new proposal
    uint256 public voteYes;
    uint256 public voteNo;
    // these are the addresses of contracts and its oracle under consideration
    address[3] public proposedAddresses;
    // this parameter gives token holders 7 days to fully evaluate a betting contract and its oracle
    uint256 public timer;
    // this is the intitial and total supply, 10 million tokens (1e7)
    // there are 18 decimal places, as with ether
    uint256 public constant MINT_AMT = 1e7 ether;

    event Transfer(address _from, address _to, uint256 _value);
    event Approval(address _owner, address _spender, uint256 _value);
    event Proposal(
        address _creator,
        address contractaddress,
        address oracleaddress
    );
    event VoteOutcome(
        address contrakt,
        address orakle,
        address proposer,
        uint256 numYes,
        uint256 numNo
    );

    constructor() {
        _balances[msg.sender] = MINT_AMT;
        // same as initial balances assigned to msg.sender
        _totalSupply = MINT_AMT;
        _name = "SportEth Token";
        // standard number of decimals
        _decimals = 18;
        _symbol = "SET";
    }

    function approve(address _spender, uint256 _value)
        external
        returns (bool success)
    {
        _allowed[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    function transfer(address _to, uint256 _value)
        external
        returns (bool success)
    {
        require(_balances[msg.sender] >= _value);
        // no transfers allowed for someone who has voted while the vote is being decided
        // this is novel to this ERC-20 token contract
        // there should only be a handful on new contracts proposed each year
        require(voteMonitor[msg.sender] != votePropNumber);
        _balances[msg.sender] -= _value;
        _balances[_to] += _value;
        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    ) external returns (bool success) {
        require(
            _balances[_from] >= _value && _allowed[_from][msg.sender] >= _value
        );
        // no transfers for someone who has voted while the vote is being decided
        // this is novel to this ERC-20 token contract
        require(voteMonitor[_from] != votePropNumber);
        _balances[_to] += _value;
        _balances[_from] -= _value;
        _allowed[_from][msg.sender] -= _value;
        emit Transfer(_from, _to, _value);
        return true;
    }

    function vote(bool isYes) external {
        // can only vote if a proposal is active, in which case the proposer's tokens
        // would have some Yes votes attributed to the proposal
        require(voteYes > 0);
        require(_balances[msg.sender] > 0);
        // this prevents voting twice on the same proposal
        require(voteMonitor[msg.sender] != votePropNumber);
        voteMonitor[msg.sender] = votePropNumber;
        // those who vote for losing propositions suffer no loss
        // the only losers are those who submit failing proposals
        if (isYes) {
            voteYes += _balances[msg.sender];
        } else {
            voteNo += _balances[msg.sender];
        }
    }

    function voteFromOracle(uint256 tokenVotes, bool isYes) external {
        // can only vote if a proposal is active, in which case the proposer's tokens
        // would have some Yes votes attributed to the proposal
        require(voteYes > 0);
        // this is only allowed through the currently approved oracle contract
        // we don't monitor this voter's address because they are constrained within the Oracle contract
        // which keeps them from voting twice on a proposed contract
        require(oracleContract == msg.sender);
        if (isYes) {
            voteYes += tokenVotes;
        } else {
            voteNo += tokenVotes;
        }
    }

    function processVote() external {
        // require(block.timestamp > timer + 7 seconds || voteYes > 5e24 || voteNo > 5e24);
        require(voteYes > 0);
        if (voteYes > voteNo) {
            // all approved contracts will be registered in the token contracts whiteList mapping
            bettingContract = proposedAddresses[0];
            oracleContract = proposedAddresses[1];
            _balances[proposedAddresses[2]] += _totalSupply / 100;
        }
        emit VoteOutcome(
            proposedAddresses[0],
            proposedAddresses[1],
            proposedAddresses[2],
            voteYes,
            voteNo
        );
        voteYes = 0;
        voteNo = 0;
        delete proposedAddresses;
        // regardless of outcome this incement allows those who recently voted to transfer their tokens again
        votePropNumber++;
    }

    function proposeContract(address propContract, address propOracle)
        external
    {
        // to avoid trolls sending trivial submissions just to be annoying
        // without a significant cost, trolls flourish
        require(_balances[msg.sender] >= _totalSupply / 100);
        // a voteYes > 0 implies a vote is currently active, so another cannot be proposed until that is processed
        require(voteYes == 0);
        // assigns proposed contracts to accounts
        proposedAddresses[0] = propContract;
        proposedAddresses[1] = propOracle;
        proposedAddresses[2] = msg.sender;
        // timer starts now, 7 days are available to vote
        timer = block.timestamp;
        // having voted, proposer cannot transfer her tokens until vote is processed
        // this mapping is the mechanism for enforcing that logic
        voteMonitor[msg.sender] = votePropNumber;
        // proposer votes for his proposal
        voteYes = _balances[msg.sender];
        // the bond amount is 1% of the total supply, which is the minimum number of eoyTokens
        // needed to submit a proposal. Proposer gets back 2% if he succeeds, loses his 1% if fail
        uint256 bondAmount = _totalSupply / 100;
        // no safemath needed because above calculations ensure these cannot underflow
        _balances[msg.sender] -= bondAmount;
        emit Proposal(msg.sender, proposedAddresses[0], proposedAddresses[1]);
    }

    function showProposal()
        external
        view
        returns (
            address contractAddress,
            address oracleAddress,
            uint256 yesvote,
            uint256 novote
        )
    {
        require(voteYes > 0);
        // proposal address should have a clean verified contract to audit on the mainnet to inspect
        contractAddress = proposedAddresses[0];
        oracleAddress = proposedAddresses[1];
        // show current votes
        yesvote = voteYes;
        novote = voteNo;
    }

    // these are standard ERC-20 methods
    function balanceOf(address _owner) external view returns (uint256 balance) {
        return _balances[_owner];
    }

    function totalSupply() external view returns (uint256 supply) {
        return _totalSupply;
    }

    function allowance(address _owner, address _spender)
        external
        view
        returns (uint256 remaining)
    {
        return _allowed[_owner][_spender];
    }

    function name() external view returns (string memory) {
        return _name;
    }

    function symbol() external view returns (string memory) {
        return _symbol;
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }
}
