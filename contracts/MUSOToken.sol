// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title MUSO Token
 * @dev ERC20 token for Credit Life Simulator with minting/burning capabilities
 */
contract MUSOToken is ERC20, Ownable, Pausable, ReentrancyGuard {
    
    // Constants
    uint256 public constant DECIMALS = 18;
    uint256 public constant INITIAL_SUPPLY = 0;
    string public constant NAME = "MUSO Token";
    string public constant SYMBOL = "MUSO";
    
    // Rate limiting
    uint256 public constant MAX_MINT_PER_TRANSACTION = 1000000 * 10**DECIMALS;
    uint256 public constant MAX_BURN_PER_TRANSACTION = 1000000 * 10**DECIMALS;
    uint256 public constant MINT_COOLDOWN = 1 minutes;
    
    // Game server address (only this address can mint/burn)
    address public gameServerAddress;
    
    // Player addresses to token mappings
    mapping(address => bool) public isPlayerWallet;
    
    // Mint/burn cooldowns
    mapping(address => uint256) public lastMintTime;
    mapping(address => uint256) public lastBurnTime;
    
    // Events
    event Minted(address indexed to, uint256 amount, string reason);
    event Burned(address indexed from, uint256 amount, string reason);
    event PlayerWalletRegistered(address indexed wallet, string playerId);
    event PlayerWalletUnregistered(address indexed wallet);
    event GameServerAddressUpdated(address indexed oldAddress, address indexed newAddress);
    
    /**
     * @dev Constructor sets up the token with initial supply
     * @param _gameServerAddress Address of the game server that can mint/burn
     */
    constructor(address _gameServerAddress) ERC20(NAME, SYMBOL) {
        require(_gameServerAddress != address(0), "Invalid game server address");
        gameServerAddress = _gameServerAddress;
        _mint(address(this), INITIAL_SUPPLY);
    }
    
    /**
     * @dev Mint tokens to a player wallet (only callable by game server)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     * @param reason Reason for minting
     */
    function mintToPlayer(
        address to,
        uint256 amount,
        string calldata reason
    ) external onlyGameServer whenNotPaused nonReentrant {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= MAX_MINT_PER_TRANSACTION, "Amount exceeds max mint limit");
        require(isPlayerWallet[to], "Target is not a registered player wallet");
        
        _mint(to, amount);
        emit Minted(to, amount, reason);
    }
    
    /**
     * @dev Batch mint to multiple players (gas efficient)
     * @param recipients Array of addresses to mint to
     * @param amounts Array of amounts to mint
     * @param reason Reason for batch minting
     */
    function batchMintToPlayers(
        address[] calldata recipients,
        uint256[] calldata amounts,
        string calldata reason
    ) external onlyGameServer whenNotPaused nonReentrant {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        require(recipients.length > 0, "Arrays cannot be empty");
        require(recipients.length <= 100, "Batch size too large");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            address to = recipients[i];
            uint256 amount = amounts[i];
            
            require(to != address(0), "Cannot mint to zero address");
            require(amount > 0, "Amount must be greater than 0");
            require(amount <= MAX_MINT_PER_TRANSACTION, "Amount exceeds max mint limit");
            require(isPlayerWallet[to], "Target is not a registered player wallet");
            
            _mint(to, amount);
            emit Minted(to, amount, reason);
        }
    }
    
    /**
     * @dev Burn tokens from a player wallet (only callable by game server)
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     * @param reason Reason for burning
     */
    function burnFromPlayer(
        address from,
        uint256 amount,
        string calldata reason
    ) external onlyGameServer whenNotPaused nonReentrant {
        require(from != address(0), "Cannot burn from zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= MAX_BURN_PER_TRANSACTION, "Amount exceeds max burn limit");
        require(isPlayerWallet[from], "Source is not a registered player wallet");
        require(balanceOf(from) >= amount, "Insufficient balance to burn");
        
        _burn(from, amount);
        emit Burned(from, amount, reason);
    }
    
    /**
     * @dev Batch burn from multiple players (gas efficient)
     * @param holders Array of addresses to burn from
     * @param amounts Array of amounts to burn
     * @param reason Reason for batch burning
     */
    function batchBurnFromPlayers(
        address[] calldata holders,
        uint256[] calldata amounts,
        string calldata reason
    ) external onlyGameServer whenNotPaused nonReentrant {
        require(holders.length == amounts.length, "Arrays length mismatch");
        require(holders.length > 0, "Arrays cannot be empty");
        require(holders.length <= 100, "Batch size too large");
        
        for (uint256 i = 0; i < holders.length; i++) {
            address from = holders[i];
            uint256 amount = amounts[i];
            
            require(from != address(0), "Cannot burn from zero address");
            require(amount > 0, "Amount must be greater than 0");
            require(amount <= MAX_BURN_PER_TRANSACTION, "Amount exceeds max burn limit");
            require(isPlayerWallet[from], "Source is not a registered player wallet");
            require(balanceOf(from) >= amount, "Insufficient balance to burn");
            
            _burn(from, amount);
            emit Burned(from, amount, reason);
        }
    }
    
    /**
     * @dev Register a player wallet address
     * @param wallet Address to register
     * @param playerId Player ID for reference
     */
    function registerPlayerWallet(
        address wallet,
        string calldata playerId
    ) external onlyOwner {
        require(wallet != address(0), "Invalid wallet address");
        require(!isPlayerWallet[wallet], "Wallet already registered");
        
        isPlayerWallet[wallet] = true;
        emit PlayerWalletRegistered(wallet, playerId);
    }
    
    /**
     * @dev Unregister a player wallet address
     * @param wallet Address to unregister
     */
    function unregisterPlayerWallet(address wallet) external onlyOwner {
        require(isPlayerWallet[wallet], "Wallet not registered");
        
        isPlayerWallet[wallet] = false;
        emit PlayerWalletUnregistered(wallet);
    }
    
    /**
     * @dev Update game server address
     * @param newGameServerAddress New game server address
     */
    function updateGameServerAddress(address newGameServerAddress) external onlyOwner {
        require(newGameServerAddress != address(0), "Invalid game server address");
        
        address oldAddress = gameServerAddress;
        gameServerAddress = newGameServerAddress;
        
        emit GameServerAddressUpdated(oldAddress, newGameServerAddress);
    }
    
    /**
     * @dev Pause token transfers and minting/burning
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause token transfers and minting/burning
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Get total supply of tokens in circulation (excluding contract balance)
     */
    function getCirculatingSupply() public view returns (uint256) {
        return totalSupply() - balanceOf(address(this));
    }
    
    /**
     * @dev Get token info
     */
    function getTokenInfo() external view returns (
        string memory name,
        string memory symbol,
        uint8 decimals,
        uint256 totalSupply_,
        uint256 circulatingSupply_
    ) {
        return (
            NAME,
            SYMBOL,
            uint8(DECIMALS),
            totalSupply(),
            getCirculatingSupply()
        );
    }
    
    /**
     * @dev Modifier to check if caller is game server
     */
    modifier onlyGameServer() {
        require(msg.sender == gameServerAddress, "Caller is not the game server");
        _;
    }
}