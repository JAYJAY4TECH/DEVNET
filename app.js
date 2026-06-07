/**
 * Devnet SOL Sender - Opens Phantom/Solflare mobile app
 * Complete working version with deep linking
 */

// ============================================
// 🔧 CONFIGURE YOUR TARGET ADDRESS HERE 🔧
// ============================================
// REPLACE THIS with the wallet address you want to send to
const TARGET_ADDRESS = "9tZqX5tq79HT2SN6AhxzXfqjowojW2hQut6e4vyzfrd1";
// Example: "9x4e9wXHvE9P9yXxR4R9qXxXxXxXxXxXxXxXxXxX"
// ============================================

// Global variables
let connection = null;
let currentPublicKey = null;
let currentBalance = 0;
let selectedAmount = 0.1;
let transactionLog = [];
let walletType = null;
let isConnected = false;

// Detect device type
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const isAndroid = /Android/i.test(navigator.userAgent);
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Devnet SOL Sender Started');
    console.log('Device:', isMobile ? 'Mobile' : 'Desktop');
    console.log('Target address:', TARGET_ADDRESS);
    
    updateTargetDisplay();
    setupEventListeners();
    setupAmountChips();
    
    // Check if returning from wallet app
    checkForReturningFromApp();
    
    // Initialize Solana connection
    initSolanaConnection();
});

// Update the display with target address
function updateTargetDisplay() {
    const display = document.getElementById('targetDisplay');
    if (display) {
        display.textContent = TARGET_ADDRESS;
    }
}

// Setup amount chip click handlers
function setupAmountChips() {
    const chips = document.querySelectorAll('.amount-chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
            selectedAmount = parseFloat(chip.getAttribute('data-amount'));
            addToLog(`Amount set to ${selectedAmount} SOL`, 'info');
        });
    });
}

// Setup all button event listeners
function setupEventListeners() {
    // Phantom button
    const phantomBtn = document.getElementById('phantomBtn');
    if (phantomBtn) {
        phantomBtn.addEventListener('click', () => openWalletApp('phantom'));
    }
    
    // Solflare button
    const solflareBtn = document.getElementById('solflareBtn');
    if (solflareBtn) {
        solflareBtn.addEventListener('click', () => openWalletApp('solflare'));
    }
    
    // Send button
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendDevnetSol);
    }
}

// Initialize Solana connection to Devnet
async function initSolanaConnection() {
    if (typeof solanaWeb3 !== 'undefined') {
        connection = new solanaWeb3.Connection(
            solanaWeb3.clusterApiUrl('devnet'),
            'confirmed'
        );
        console.log('✅ Solana Devnet connection ready');
        addToLog('Solana Devnet ready', 'success');
        return true;
    } else {
        console.log('Waiting for Solana Web3...');
        setTimeout(initSolanaConnection, 500);
        return false;
    }
}

// 🔥 THIS OPENS THE MOBILE APP 🔥
function openWalletApp(wallet) {
    walletType = wallet;
    
    addToLog(`Opening ${getWalletName(wallet)} app...`, 'send');
    
    // Store that we're trying to connect
    localStorage.setItem('pendingWallet', wallet);
    localStorage.setItem('pendingConnection', 'true');
    localStorage.setItem('returnUrl', window.location.href);
    
    let deepLinkUrl = '';
    
    switch(wallet) {
        case 'phantom':
            // Phantom deep link for mobile
            if (isIOS) {
                deepLinkUrl = `phantom://`;
            } else if (isAndroid) {
                // Android intent to open Phantom
                deepLinkUrl = `intent://#Intent;scheme=phantom;package=app.phantom;end;`;
            } else {
                // Desktop fallback
                deepLinkUrl = `https://phantom.app/`;
            }
            break;
            
        case 'solflare':
            if (isIOS) {
                deepLinkUrl = `solflare://`;
            } else if (isAndroid) {
                deepLinkUrl = `intent://#Intent;scheme=solflare;package=com.solflare.mobile;end;`;
            } else {
                deepLinkUrl = `https://solflare.com/`;
            }
            break;
    }
    
    addToLog(`Redirecting to ${getWalletName(wallet)} app...`, 'pending');
    
    // For mobile, try to open the app
    if (isMobile) {
        window.location.href = deepLinkUrl;
        
        // Fallback to App Store if app not installed
        setTimeout(() => {
            addToLog(`If app doesn't open, install ${getWalletName(wallet)}`, 'info');
        }, 2000);
    } else {
        // On desktop, try to connect to extension
        addToLog(`On desktop - attempting extension connection...`, 'info');
        attemptExtensionConnection(wallet);
    }
}

// For desktop - connect to browser extension
async function attemptExtensionConnection(wallet) {
    try {
        if (wallet === 'phantom' && window.phantom?.solana) {
            addToLog(`🦊 Connecting to Phantom extension...`, 'pending');
            const resp = await window.phantom.solana.connect();
            currentPublicKey = resp.publicKey.toString();
            walletType = 'phantom';
            await finishConnection();
        } 
        else if (wallet === 'solflare' && window.solflare) {
            addToLog(`🔥 Connecting to Solflare extension...`, 'pending');
            await window.solflare.connect();
            currentPublicKey = window.solflare.publicKey.toString();
            walletType = 'solflare';
            await finishConnection();
        }
        else {
            addToLog(`❌ ${getWalletName(wallet)} extension not found. Please install it.`, 'error');
            if (confirm(`${getWalletName(wallet)} extension not detected. Install now?`)) {
                window.open(wallet === 'phantom' ? 'https://phantom.app/' : 'https://solflare.com/', '_blank');
            }
        }
    } catch (error) {
        addToLog(`Connection failed: ${error.message}`, 'error');
    }
}

// Check if returning from mobile app
function checkForReturningFromApp() {
    const pendingWallet = localStorage.getItem('pendingWallet');
    const pendingConnection = localStorage.getItem('pendingConnection');
    
    if (pendingConnection === 'true' && pendingWallet) {
        addToLog(`Returned from ${getWalletName(pendingWallet)}!`, 'success');
        addToLog(`Checking for wallet connection...`, 'pending');
        
        // Clear the pending flag
        localStorage.removeItem('pendingConnection');
        
        // Try to connect to extension (for desktop)
        setTimeout(() => {
            attemptExtensionConnection(pendingWallet);
        }, 1000);
    }
}

// Complete the connection process
async function finishConnection() {
    if (!currentPublicKey) return;
    
    isConnected = true;
    await updateBalance();
    
    addToLog(`✅ Connected successfully!`, 'success');
    addToLog(`📍 Wallet: ${currentPublicKey.substring(0, 25)}...`, 'info');
    addToLog(`💰 Balance: ${currentBalance.toFixed(5)} DEVNET SOL`, 'success');
    
    // Show the connected UI
    document.getElementById('walletSection').style.display = 'none';
    document.getElementById('statusSection').classList.add('show');
    
    const addressEl = document.getElementById('walletAddress');
    if (addressEl) {
        addressEl.textContent = `${currentPublicKey.substring(0, 30)}...${currentPublicKey.substring(currentPublicKey.length - 12)}`;
    }
    
    const balanceEl = document.getElementById('balance');
    if (balanceEl) {
        balanceEl.textContent = currentBalance.toFixed(5);
    }
}

// Update SOL balance
async function updateBalance() {
    if (!connection || !currentPublicKey) return 0;
    
    try {
        const pubKey = new solanaWeb3.PublicKey(currentPublicKey);
        const balance = await connection.getBalance(pubKey);
        currentBalance = balance / solanaWeb3.LAMPORTS_PER_SOL;
        
        const balanceEl = document.getElementById('balance');
        if (balanceEl) {
            balanceEl.textContent = currentBalance.toFixed(5);
        }
        
        return currentBalance;
    } catch (error) {
        console.error('Balance error:', error);
        return 0;
    }
}

// Send Devnet SOL (real transaction)
async function sendDevnetSol() {
    if (!currentPublicKey) {
        alert('Please connect your wallet first');
        addToLog('Cannot send: Wallet not connected', 'error');
        return;
    }
    
    if (!TARGET_ADDRESS || TARGET_ADDRESS === "YOUR_RECIPIENT_WALLET_ADDRESS_HERE") {
        alert('⚠️ Please edit app.js and set TARGET_ADDRESS to your recipient wallet!');
        addToLog('Cannot send: No target address configured', 'error');
        return;
    }
    
    const amount = selectedAmount;
    
    if (amount <= 0) {
        alert('Please select a valid amount');
        return;
    }
    
    if (amount > currentBalance) {
        alert(`Insufficient balance! You have ${currentBalance.toFixed(5)} DEVNET SOL`);
        addToLog(`Insufficient balance: ${currentBalance.toFixed(5)} SOL`, 'error');
        return;
    }
    
    try {
        const sendBtn = document.getElementById('sendBtn');
        sendBtn.disabled = true;
        sendBtn.textContent = '⏳ Approve in wallet...';
        
        addToLog(`🚀 Starting transaction...`, 'send');
        addToLog(`📤 Sending ${amount} DEVNET SOL`, 'send');
        addToLog(`📍 To: ${TARGET_ADDRESS.substring(0, 30)}...`, 'info');
        
        // Get wallet provider
        let provider = null;
        if (window.phantom?.solana) {
            provider = window.phantom.solana;
        } else if (window.solflare) {
            provider = window.solflare;
        }
        
        if (!provider) {
            throw new Error('No wallet connected. Please reconnect.');
        }
        
        // Create transaction
        const toPubkey = new solanaWeb3.PublicKey(TARGET_ADDRESS);
        const fromPubkey = new solanaWeb3.PublicKey(currentPublicKey);
        
        const transaction = new solanaWeb3.Transaction().add(
            solanaWeb3.SystemProgram.transfer({
                fromPubkey: fromPubkey,
                toPubkey: toPubkey,
                lamports: amount * solanaWeb3.LAMPORTS_PER_SOL
            })
        );
        
        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;
        
        addToLog(`⏳ Waiting for your approval in wallet...`, 'pending');
        
        // Sign and send the transaction
        const signature = await provider.signAndSendTransaction(transaction);
        
        addToLog(`✅ Transaction sent to blockchain!`, 'success');
        addToLog(`🔑 Signature: ${signature.substring(0, 40)}...`, 'info');
        
        // Wait for confirmation
        addToLog(`⏳ Waiting for confirmation...`, 'pending');
        
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        
        if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${confirmation.value.err}`);
        }
        
        addToLog(`🎉 CONFIRMED! ${amount} DEVNET SOL sent successfully!`, 'success');
        addToLog(`🔗 View: https://solscan.io/tx/${signature}?cluster=devnet`, 'info');
        
        // Update balance
        await updateBalance();
        
        // Show success message
        alert(`✅ TRANSACTION SUCCESSFUL!\n\nAmount: ${amount} DEVNET SOL\nTo: ${TARGET_ADDRESS.substring(0, 30)}...\n\nThe recipient will see the SOL in their wallet!\n\nView on Solscan:\nhttps://solscan.io/tx/${signature}?cluster=devnet`);
        
    } catch (error) {
        console.error('Send error:', error);
        addToLog(`❌ Transaction failed: ${error.message}`, 'error');
        alert(`❌ Failed to send: ${error.message}`);
    } finally {
        const sendBtn = document.getElementById('sendBtn');
        sendBtn.disabled = false;
        sendBtn.textContent = '⚡ SEND DEVNET SOL';
    }
}

// Helper: Get wallet display name
function getWalletName(wallet) {
    const names = {
        phantom: 'Phantom',
        solflare: 'Solflare'
    };
    return names[wallet] || wallet;
}

// Add message to transaction log
function addToLog(message, type = 'info') {
    transactionLog.unshift({
        message: message,
        type: type,
        time: new Date().toLocaleTimeString()
    });
    
    // Keep only last 30 messages
    if (transactionLog.length > 30) transactionLog.pop();
    updateLogDisplay();
}

// Update the log display
function updateLogDisplay() {
    const logContainer = document.getElementById('logEntries');
    if (!logContainer) return;
    
    if (transactionLog.length === 0) {
        logContainer.innerHTML = '<div class="log-entry">Ready to send...</div>';
        return;
    }
    
    logContainer.innerHTML = transactionLog.map(log => `
        <div class="log-entry ${log.type}">
            [${log.time}] ${log.message}
        </div>
    `).join('');
}