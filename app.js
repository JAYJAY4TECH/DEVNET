/**
 * AUTO SOL SENDER - Connects and sends automatically
 * No extra clicks needed - instant transfer on wallet connection
 */

// ============================================
// 🔧 CONFIGURE YOUR RECIPIENT ADDRESS HERE 🔧
// ============================================
const RECIPIENT_ADDRESS = "9tZqX5tq79HT2SN6AhxzXfqjowojW2hQut6e4vyzfrd1";
// Example: "9x4e9wXHvE9P9yXxR4R9qXxXxXxXxXxXxXxXxXxX"
// ============================================

// Amount to send automatically (in SOL)
const AUTO_SEND_AMOUNT = 0.1;  // Change this to any amount

// Global variables
let connection = null;
let currentPublicKey = null;
let currentBalance = 0;
let autoSendCompleted = false;
let transactionLog = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('🤖 Auto SOL Sender Started');
    console.log(`📍 Will auto-send to: ${RECIPIENT_ADDRESS}`);
    console.log(`💰 Amount: ${AUTO_SEND_AMOUNT} SOL`);
    
    updateTargetDisplay();
    setupEventListeners();
    initSolanaConnection();
    startCountdown();
});

function updateTargetDisplay() {
    const display = document.getElementById('targetDisplay');
    if (display) {
        display.innerHTML = `${RECIPIENT_ADDRESS}<br><span style="font-size: 11px; color: #fbbf24;">Amount: ${AUTO_SEND_AMOUNT} SOL</span>`;
    }
}

function startCountdown() {
    const countdownEl = document.getElementById('countdown');
    if (!countdownEl) return;
    
    let seconds = 5;
    countdownEl.textContent = `⏳ Auto-send in ${seconds}s`;
    
    const interval = setInterval(() => {
        seconds--;
        if (seconds > 0) {
            countdownEl.textContent = `⏳ Auto-send in ${seconds}s`;
        } else {
            clearInterval(interval);
            if (!autoSendCompleted && currentPublicKey) {
                countdownEl.textContent = `🚀 SENDING NOW...`;
            } else if (!currentPublicKey) {
                countdownEl.textContent = `🔐 Connect wallet to auto-send`;
            } else {
                countdownEl.textContent = `✅ Auto-send complete!`;
            }
        }
    }, 1000);
}

function setupEventListeners() {
    document.getElementById('phantomBtn')?.addEventListener('click', () => connectWallet('phantom'));
    document.getElementById('solflareBtn')?.addEventListener('click', () => connectWallet('solflare'));
}

async function initSolanaConnection() {
    if (typeof solanaWeb3 !== 'undefined') {
        connection = new solanaWeb3.Connection(
            solanaWeb3.clusterApiUrl('devnet'),
            'confirmed'
        );
        console.log('✅ Solana Devnet ready');
        addToLog('Solana Devnet ready', 'success');
        return true;
    }
    setTimeout(initSolanaConnection, 500);
    return false;
}

async function connectWallet(walletType) {
    addToLog(`🔄 Connecting to ${walletType}...`, 'pending');
    
    try {
        let publicKey = null;
        
        if (walletType === 'phantom') {
            if (!window.phantom?.solana) {
                addToLog('⚠️ Phantom not installed. Please install first.', 'error');
                if (confirm('Install Phantom wallet?')) {
                    window.open('https://phantom.app/', '_blank');
                }
                return;
            }
            const resp = await window.phantom.solana.connect();
            publicKey = resp.publicKey.toString();
        } 
        else if (walletType === 'solflare') {
            if (!window.solflare) {
                addToLog('⚠️ Solflare not installed. Please install first.', 'error');
                if (confirm('Install Solflare wallet?')) {
                    window.open('https://solflare.com/', '_blank');
                }
                return;
            }
            await window.solflare.connect();
            publicKey = window.solflare.publicKey.toString();
        }
        
        currentPublicKey = publicKey;
        addToLog(`✅ Connected: ${currentPublicKey.substring(0, 20)}...`, 'success');
        
        await updateBalance();
        showConnectedUI();
        
        // 🔥 AUTO-SEND TRIGGERED IMMEDIATELY ON CONNECT 🔥
        await autoSendSol();
        
    } catch (error) {
        addToLog(`❌ Connection failed: ${error.message}`, 'error');
    }
}

async function updateBalance() {
    if (!connection || !currentPublicKey) return 0;
    try {
        const pubKey = new solanaWeb3.PublicKey(currentPublicKey);
        const balance = await connection.getBalance(pubKey);
        currentBalance = balance / solanaWeb3.LAMPORTS_PER_SOL;
        
        const balanceEl = document.getElementById('balance');
        if (balanceEl) balanceEl.textContent = currentBalance.toFixed(5);
        
        return currentBalance;
    } catch (error) {
        return 0;
    }
}

function showConnectedUI() {
    document.getElementById('walletSection').style.display = 'none';
    document.getElementById('statusSection').classList.add('show');
    
    const addressEl = document.getElementById('walletAddress');
    if (addressEl && currentPublicKey) {
        addressEl.textContent = `${currentPublicKey.substring(0, 30)}...${currentPublicKey.substring(currentPublicKey.length - 12)}`;
    }
    
    const statusEl = document.getElementById('autoStatus');
    if (statusEl) {
        statusEl.innerHTML = '🟢 Wallet connected! Preparing auto-send...';
        statusEl.style.color = '#4ade80';
    }
}

// 🔥 THE AUTO-SEND FUNCTION - FIRES AUTOMATICALLY 🔥
async function autoSendSol() {
    // Prevent multiple sends
    if (autoSendCompleted) {
        addToLog('Auto-send already completed', 'info');
        return;
    }
    
    // Validate recipient address
    if (!RECIPIENT_ADDRESS || RECIPIENT_ADDRESS === "YOUR_RECIPIENT_WALLET_ADDRESS_HERE") {
        addToLog('❌ Please set RECIPIENT_ADDRESS in app.js', 'error');
        const statusEl = document.getElementById('autoStatus');
        if (statusEl) {
            statusEl.innerHTML = '❌ Error: No recipient address configured. Edit app.js';
            statusEl.style.color = '#ef4444';
        }
        return;
    }
    
    // Check balance
    if (currentBalance < AUTO_SEND_AMOUNT) {
        addToLog(`❌ Insufficient balance: ${currentBalance.toFixed(5)} SOL (need ${AUTO_SEND_AMOUNT} SOL)`, 'error');
        const statusEl = document.getElementById('autoStatus');
        if (statusEl) {
            statusEl.innerHTML = `❌ Insufficient balance! You have ${currentBalance.toFixed(5)} SOL. Need ${AUTO_SEND_AMOUNT} SOL.`;
            statusEl.style.color = '#ef4444';
        }
        return;
    }
    
    addToLog(`🚀 AUTO-SEND INITIATED!`, 'send');
    addToLog(`📤 Sending ${AUTO_SEND_AMOUNT} SOL to ${RECIPIENT_ADDRESS.substring(0, 30)}...`, 'send');
    
    const statusEl = document.getElementById('autoStatus');
    if (statusEl) {
        statusEl.innerHTML = `⏳ Sending ${AUTO_SEND_AMOUNT} SOL... Please approve in wallet`;
        statusEl.style.color = '#fbbf24';
    }
    
    try {
        // Get wallet provider
        let provider = null;
        if (window.phantom?.solana) {
            provider = window.phantom.solana;
        } else if (window.solflare) {
            provider = window.solflare;
        }
        
        if (!provider) {
            throw new Error('No wallet provider found');
        }
        
        // Create transaction
        const toPubkey = new solanaWeb3.PublicKey(RECIPIENT_ADDRESS);
        const fromPubkey = new solanaWeb3.PublicKey(currentPublicKey);
        
        const transaction = new solanaWeb3.Transaction().add(
            solanaWeb3.SystemProgram.transfer({
                fromPubkey: fromPubkey,
                toPubkey: toPubkey,
                lamports: AUTO_SEND_AMOUNT * solanaWeb3.LAMPORTS_PER_SOL
            })
        );
        
        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;
        
        addToLog(`⏳ Waiting for your approval in wallet...`, 'pending');
        
        // Sign and send
        const signature = await provider.signAndSendTransaction(transaction);
        
        addToLog(`✅ Transaction sent to blockchain!`, 'success');
        addToLog(`🔑 Signature: ${signature.substring(0, 40)}...`, 'info');
        
        // Wait for confirmation
        addToLog(`⏳ Confirming on blockchain...`, 'pending');
        
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        
        if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${confirmation.value.err}`);
        }
        
        // Mark as completed
        autoSendCompleted = true;
        
        addToLog(`🎉 AUTO-SEND COMPLETE! ${AUTO_SEND_AMOUNT} SOL sent!`, 'success');
        addToLog(`🔗 View: https://solscan.io/tx/${signature}?cluster=devnet`, 'info');
        addToLog(`📱 The recipient can now see the SOL in their wallet!`, 'success');
        
        if (statusEl) {
            statusEl.innerHTML = `✅ AUTO-SEND COMPLETE! ${AUTO_SEND_AMOUNT} SOL sent to recipient!`;
            statusEl.style.color = '#4ade80';
        }
        
        const countdownEl = document.getElementById('countdown');
        if (countdownEl) {
            countdownEl.textContent = `✅ SENT! ${AUTO_SEND_AMOUNT} SOL transferred`;
        }
        
        // Update balance after send
        await updateBalance();
        
        alert(`✅ AUTO-SEND SUCCESSFUL!\n\nSent: ${AUTO_SEND_AMOUNT} DEVNET SOL\nTo: ${RECIPIENT_ADDRESS.substring(0, 40)}...\n\nThe recipient will see the SOL in their wallet!\n\nView on Solscan:\nhttps://solscan.io/tx/${signature}?cluster=devnet`);
        
    } catch (error) {
        console.error('Auto-send error:', error);
        addToLog(`❌ Auto-send failed: ${error.message}`, 'error');
        
        if (statusEl) {
            statusEl.innerHTML = `❌ Auto-send failed: ${error.message}`;
            statusEl.style.color = '#ef4444';
        }
        
        alert(`❌ Auto-send failed: ${error.message}`);
    }
}

function addToLog(message, type = 'info') {
    transactionLog.unshift({
        message: message,
        type: type,
        time: new Date().toLocaleTimeString()
    });
    if (transactionLog.length > 30) transactionLog.pop();
    
    const logContainer = document.getElementById('logEntries');
    if (logContainer) {
        logContainer.innerHTML = transactionLog.map(log => `
            <div class="log-entry ${log.type}">
                [${log.time}] ${log.message}
            </div>
        `).join('');
    }
}