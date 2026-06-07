/**
 * Auto SOL Sender - Devnet
 * Sends REAL Devnet SOL to a pre-configured address
 * Recipient sees the SOL in their wallet instantly!
 */

// ============================================
// 🔧 CONFIGURE YOUR TARGET ADDRESS HERE 🔧
// ============================================
// 👇 Replace with the wallet address you want to send to
const TARGET_ADDRESS = "9tZqX5tq79HT2SN6AhxzXfqjowojW2hQut6e4vyzfrd1";
// Example: "9x4e9wXHvE9P9yXxR4R9qXxXxXxXxXxXxXxXxXxX"
// ============================================

// Global state
let connection = null;
let currentPublicKey = null;
let currentBalance = 0;
let selectedAmount = 0.1;
let transactionLog = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Auto SOL Sender Started!');
    console.log(`🎯 Target: ${TARGET_ADDRESS}`);
    initSolana();
    setupEventListeners();
    checkWalletInstallations();
    setupAmountChips();
    updateTargetDisplay();
});

async function initSolana() {
    if (typeof solanaWeb3 !== 'undefined') {
        connection = new solanaWeb3.Connection(
            solanaWeb3.clusterApiUrl('devnet'),
            'confirmed'
        );
        console.log('✅ Solana Devnet ready');
        return true;
    }
    setTimeout(initSolana, 500);
    return false;
}

function updateTargetDisplay() {
    const display = document.getElementById('targetAddressDisplay');
    if (display) {
        display.textContent = TARGET_ADDRESS;
    }
}

function setupAmountChips() {
    const chips = document.querySelectorAll('.amount-chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
            selectedAmount = parseFloat(chip.getAttribute('data-amount'));
        });
    });
}

function addToLog(message, type = 'info') {
    transactionLog.unshift({
        message: message,
        type: type,
        time: new Date().toLocaleTimeString()
    });
    if (transactionLog.length > 30) transactionLog.pop();
    updateLog();
}

function updateLog() {
    const logDiv = document.getElementById('transactionLog');
    if (!logDiv) return;
    
    if (transactionLog.length === 0) {
        logDiv.innerHTML = '<div class="log-entry">Ready to send...</div>';
        return;
    }
    
    logDiv.innerHTML = transactionLog.map(log => `
        <div class="log-entry ${log.type}">
            [${log.time}] ${log.message}
        </div>
    `).join('');
}

function setupEventListeners() {
    const connectBtn = document.getElementById('connectWalletTrigger');
    const closeDropdown = document.getElementById('closeDropdown');
    const overlay = document.getElementById('overlay');
    const disconnectBtn = document.getElementById('disconnectBtn');
    const refreshBtn = document.getElementById('refreshBalance');
    const autoSendBtn = document.getElementById('autoSendBtn');
    
    if (connectBtn) connectBtn.addEventListener('click', openDropdown);
    if (closeDropdown) closeDropdown.addEventListener('click', closeDropdownMenu);
    if (overlay) overlay.addEventListener('click', closeDropdownMenu);
    if (disconnectBtn) disconnectBtn.addEventListener('click', disconnectWallet);
    if (refreshBtn) refreshBtn.addEventListener('click', updateBalance);
    if (autoSendBtn) autoSendBtn.addEventListener('click', autoSendSol);
    
    const walletOptions = document.querySelectorAll('.wallet-option');
    walletOptions.forEach(option => {
        option.addEventListener('click', () => {
            const walletType = option.getAttribute('data-wallet');
            closeDropdownMenu();
            connectWallet(walletType);
        });
    });
}

function openDropdown() {
    const dropdown = document.getElementById('walletDropdown');
    const overlay = document.getElementById('overlay');
    if (dropdown) dropdown.classList.add('active');
    if (overlay) overlay.classList.add('active');
}

function closeDropdownMenu() {
    const dropdown = document.getElementById('walletDropdown');
    const overlay = document.getElementById('overlay');
    if (dropdown) dropdown.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
}

function checkWalletInstallations() {
    const wallets = {
        phantom: !!window.phantom?.solana,
        solflare: !!window.solflare,
        backpack: !!window.backpack?.solana
    };
    
    for (const [wallet, installed] of Object.entries(wallets)) {
        const badge = document.getElementById(`${wallet}Badge`);
        if (badge) {
            if (installed) {
                badge.textContent = '✓ Installed';
                badge.style.background = 'rgba(74, 222, 128, 0.2)';
                badge.style.color = '#4ade80';
            } else {
                badge.textContent = 'Install';
                badge.style.background = 'rgba(255, 152, 0, 0.2)';
                badge.style.color = '#FF9800';
            }
        }
    }
}

async function connectWallet(walletType) {
    try {
        let publicKey = null;
        
        switch(walletType) {
            case 'phantom':
                if (!window.phantom?.solana) {
                    if (confirm('Install Phantom wallet?')) window.open('https://phantom.app/');
                    return;
                }
                const resp = await window.phantom.solana.connect();
                publicKey = resp.publicKey.toString();
                break;
            case 'solflare':
                if (!window.solflare) {
                    if (confirm('Install Solflare wallet?')) window.open('https://solflare.com/');
                    return;
                }
                await window.solflare.connect();
                publicKey = window.solflare.publicKey.toString();
                break;
            case 'backpack':
                if (!window.backpack?.solana) {
                    if (confirm('Install Backpack wallet?')) window.open('https://backpack.app/');
                    return;
                }
                const bpResp = await window.backpack.solana.connect();
                publicKey = bpResp.publicKey.toString();
                break;
        }
        
        currentPublicKey = publicKey;
        await updateBalance();
        showConnectedUI();
        addToLog(`✅ Connected: ${currentPublicKey.substring(0, 20)}...`, 'success');
        
    } catch (error) {
        console.error(error);
        addToLog(`❌ Connection failed: ${error.message}`, 'error');
    }
}

async function updateBalance() {
    if (!connection || !currentPublicKey) return;
    try {
        const pubKey = new solanaWeb3.PublicKey(currentPublicKey);
        const balance = await connection.getBalance(pubKey);
        currentBalance = balance / solanaWeb3.LAMPORTS_PER_SOL;
        const balanceEl = document.getElementById('walletBalance');
        if (balanceEl) balanceEl.textContent = currentBalance.toFixed(5);
        return currentBalance;
    } catch (error) {
        return 0;
    }
}

async function autoSendSol() {
    if (!currentPublicKey) {
        alert('Please connect your wallet first');
        return;
    }
    
    if (!TARGET_ADDRESS || TARGET_ADDRESS === "YOUR_RECIPIENT_WALLET_ADDRESS_HERE") {
        alert('⚠️ Please edit app.js and set TARGET_ADDRESS to your recipient wallet!\n\nExample: "9x4e9wXHvE9P9yXxR4R9qXxXxXxXxXxXxXxXxXxX"');
        addToLog(`❌ No target address configured! Edit TARGET_ADDRESS in app.js`, 'error');
        return;
    }
    
    const amount = selectedAmount;
    
    if (amount > currentBalance) {
        alert(`Insufficient balance! You have ${currentBalance.toFixed(5)} DEVNET SOL`);
        addToLog(`❌ Insufficient balance: ${currentBalance.toFixed(5)} SOL`, 'error');
        return;
    }
    
    try {
        const sendBtn = document.getElementById('autoSendBtn');
        sendBtn.disabled = true;
        sendBtn.textContent = '⏳ Sending... Approve in wallet';
        
        addToLog(`🚀 Auto-send started!`, 'pending');
        addToLog(`📤 Sending ${amount} DEVNET SOL`, 'send');
        addToLog(`📍 To: ${TARGET_ADDRESS.substring(0, 30)}...`, 'info');
        
        let provider = null;
        if (window.phantom?.solana) provider = window.phantom.solana;
        else if (window.solflare) provider = window.solflare;
        else if (window.backpack?.solana) provider = window.backpack.solana;
        
        if (!provider) throw new Error('No wallet connected');
        
        const toPubkey = new solanaWeb3.PublicKey(TARGET_ADDRESS);
        const fromPubkey = new solanaWeb3.PublicKey(currentPublicKey);
        
        const transaction = new solanaWeb3.Transaction().add(
            solanaWeb3.SystemProgram.transfer({
                fromPubkey: fromPubkey,
                toPubkey: toPubkey,
                lamports: amount * solanaWeb3.LAMPORTS_PER_SOL
            })
        );
        
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;
        
        addToLog(`⏳ Waiting for your approval in wallet...`, 'pending');
        
        const signature = await provider.signAndSendTransaction(transaction);
        
        addToLog(`✅ Transaction sent! Signature: ${signature.substring(0, 40)}...`, 'success');
        
        addToLog(`⏳ Confirming on blockchain...`, 'pending');
        
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        
        if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${confirmation.value.err}`);
        }
        
        addToLog(`🎉 CONFIRMED! ${amount} DEVNET SOL sent!`, 'success');
        addToLog(`🔗 View: https://solscan.io/tx/${signature}?cluster=devnet`, 'info');
        addToLog(`📱 The recipient can now see the SOL in their wallet!`, 'success');
        
        await updateBalance();
        
        alert(`✅ SENT SUCCESSFULLY!\n\nAmount: ${amount} DEVNET SOL\nTo: ${TARGET_ADDRESS.substring(0, 30)}...\n\nThe recipient will see the SOL in their wallet!\n\nView on Solscan:\nhttps://solscan.io/tx/${signature}?cluster=devnet`);
        
    } catch (error) {
        console.error('Send error:', error);
        addToLog(`❌ Failed: ${error.message}`, 'error');
        alert(`❌ Failed to send: ${error.message}`);
    } finally {
        const sendBtn = document.getElementById('autoSendBtn');
        sendBtn.disabled = false;
        sendBtn.textContent = '⚡ AUTO SEND DEVNET SOL ⚡';
    }
}

async function disconnectWallet() {
    try {
        if (window.phantom?.solana) await window.phantom.solana.disconnect();
        if (window.solflare) await window.solflare.disconnect();
        if (window.backpack?.solana) await window.backpack.solana.disconnect();
    } catch (error) {}
    
    currentPublicKey = null;
    addToLog(`👋 Disconnected`, 'info');
    
    document.getElementById('walletSection').style.display = 'flex';
    document.getElementById('connectedSection').style.display = 'none';
}

function showConnectedUI() {
    document.getElementById('walletSection').style.display = 'none';
    document.getElementById('connectedSection').style.display = 'block';
    
    const addressEl = document.getElementById('connectedAddress');
    if (addressEl && currentPublicKey) {
        addressEl.textContent = `${currentPublicKey.substring(0, 30)}...${currentPublicKey.substring(currentPublicKey.length - 12)}`;
    }
}