/**
 * Auto SOL Sender - Direct App Open + Auto Send
 * Opens Phantom mobile app directly, sends SOL automatically
 */

// ============================================
// 🔧 CONFIGURE YOUR SETTINGS HERE 🔧
// ============================================
const RECIPIENT_ADDRESS = "YOUR_RECIPIENT_WALLET_ADDRESS_HERE";
// Example: "9x4e9wXHvE9P9yXxR4R9qXxXxXxXxXxXxXxXxXxX"

const AMOUNT_TO_SEND = 0.1;  // Amount in SOL (Devnet)
// ============================================

// Global variables
let transactionLog = [];
let sendInProgress = false;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Auto SOL Sender - Direct App Open');
    console.log(`📍 Recipient: ${RECIPIENT_ADDRESS}`);
    console.log(`💰 Amount: ${AMOUNT_TO_SEND} SOL`);
    
    updateDisplay();
    setupEventListeners();
});

function updateDisplay() {
    const targetDisplay = document.getElementById('targetDisplay');
    if (targetDisplay) {
        targetDisplay.textContent = RECIPIENT_ADDRESS;
    }
    
    const amountDisplay = document.getElementById('amountDisplay');
    if (amountDisplay) {
        amountDisplay.textContent = AMOUNT_TO_SEND;
    }
}

function setupEventListeners() {
    const phantomBtn = document.getElementById('phantomBtn');
    const solflareBtn = document.getElementById('solflareBtn');
    
    if (phantomBtn) {
        phantomBtn.addEventListener('click', () => openAndSend('phantom'));
    }
    
    if (solflareBtn) {
        solflareBtn.addEventListener('click', () => openAndSend('solflare'));
    }
}

// 🔥 MAIN FUNCTION - Opens app and sends SOL 🔥
function openAndSend(walletType) {
    if (sendInProgress) {
        addToLog('Please wait, transaction in progress...', 'error');
        return;
    }
    
    // Validate recipient
    if (!RECIPIENT_ADDRESS || RECIPIENT_ADDRESS === "YOUR_RECIPIENT_WALLET_ADDRESS_HERE") {
        addToLog('❌ Please set RECIPIENT_ADDRESS in app.js', 'error');
        alert('Please edit app.js and set your recipient address first!');
        return;
    }
    
    addToLog(`🚀 Opening ${walletType} app...`, 'send');
    addToLog(`📤 Will send ${AMOUNT_TO_SEND} SOL to ${RECIPIENT_ADDRESS.substring(0, 30)}...`, 'info');
    
    sendInProgress = true;
    
    // Get the current page URL
    const currentUrl = window.location.href;
    const encodedUrl = encodeURIComponent(currentUrl);
    
    // Create the deep link with transaction data
    let deepLink = '';
    
    if (walletType === 'phantom') {
        // Phantom deep link that opens app and prepares transaction
        // We'll use the mobile deep link format
        deepLink = `phantom://browse?url=${encodedUrl}`;
    } else {
        deepLink = `solflare://browse?url=${encodedUrl}`;
    }
    
    // Store transaction details in localStorage for when user returns
    localStorage.setItem('pendingSend', 'true');
    localStorage.setItem('recipient', RECIPIENT_ADDRESS);
    localStorage.setItem('amount', AMOUNT_TO_SEND);
    localStorage.setItem('walletType', walletType);
    localStorage.setItem('returnUrl', currentUrl);
    
    addToLog(`🔄 Opening ${walletType} app...`, 'pending');
    
    // For mobile - redirect to app
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
        // On mobile - open the app directly
        window.location.href = deepLink;
        
        // Fallback if app not installed
        setTimeout(() => {
            addToLog(`⚠️ If app doesn't open, install ${walletType} first`, 'error');
            sendInProgress = false;
        }, 2000);
    } else {
        // On desktop - show instruction
        addToLog(`📱 Scan this QR code with ${walletType} mobile app`, 'info');
        sendInProgress = false;
        alert(`Open this page on your PHONE, then click the ${walletType} button.\n\nThe app will open automatically and send SOL!`);
    }
}

// Check if returning from wallet app
function checkForReturn() {
    const pendingSend = localStorage.getItem('pendingSend');
    const recipient = localStorage.getItem('recipient');
    const amount = localStorage.getItem('amount');
    const walletType = localStorage.getItem('walletType');
    
    if (pendingSend === 'true' && recipient) {
        addToLog(`✅ Returned from ${walletType} app!`, 'success');
        addToLog(`🔄 Preparing to send ${amount} SOL...`, 'pending');
        
        // Clear the pending flag
        localStorage.removeItem('pendingSend');
        
        // Show the transaction UI
        document.getElementById('walletSection').style.display = 'none';
        document.getElementById('statusSection').classList.add('show');
        
        // Now try to execute the send via WalletConnect or direct
        setTimeout(() => {
            executeSendViaWalletConnect(recipient, parseFloat(amount), walletType);
        }, 1000);
    }
}

// Execute the actual send via WalletConnect
async function executeSendViaWalletConnect(recipient, amount, walletType) {
    addToLog(`🚀 Starting auto-send process...`, 'send');
    addToLog(`📤 Sending ${amount} SOL to ${recipient.substring(0, 30)}...`, 'send');
    
    try {
        // Initialize WalletConnect
        if (typeof WalletConnect === 'undefined') {
            addToLog(`⚠️ Loading WalletConnect library...`, 'pending');
            await loadWalletConnect();
        }
        
        // Create connector
        const connector = new WalletConnect({
            bridge: "https://bridge.walletconnect.org",
            clientMeta: {
                description: "Auto SOL Sender",
                url: window.location.href,
                icons: [],
                name: "Auto SOL Sender"
            }
        });
        
        // Check if already connected
        if (!connector.connected) {
            addToLog(`🔄 Connecting to ${walletType}...`, 'pending');
            await connector.createSession();
            
            // Show QR code for connection (one-time only)
            const uri = connector.uri;
            addToLog(`📱 Scan QR code to connect your wallet`, 'info');
            
            // Create simple QR display
            showTempQR(uri);
            
            // Wait for connection
            connector.on("connect", async (error, payload) => {
                if (error) {
                    addToLog(`Connection error: ${error.message}`, 'error');
                    return;
                }
                await sendTransaction(connector, recipient, amount);
            });
        } else {
            await sendTransaction(connector, recipient, amount);
        }
        
    } catch (error) {
        addToLog(`❌ Failed: ${error.message}`, 'error');
        sendInProgress = false;
    }
}

async function sendTransaction(connector, recipient, amount) {
    try {
        const accounts = connector.accounts;
        const fromAddress = accounts[0];
        
        addToLog(`✅ Wallet connected: ${fromAddress.substring(0, 20)}...`, 'success');
        
        // Initialize Solana connection
        const connection = new solanaWeb3.Connection(
            solanaWeb3.clusterApiUrl('devnet'),
            'confirmed'
        );
        
        // Get balance
        const pubKey = new solanaWeb3.PublicKey(fromAddress);
        const balance = await connection.getBalance(pubKey);
        const balanceSol = balance / solanaWeb3.LAMPORTS_PER_SOL;
        
        addToLog(`💰 Your balance: ${balanceSol.toFixed(5)} DEVNET SOL`, 'info');
        
        if (balanceSol < amount) {
            addToLog(`❌ Insufficient balance! Need ${amount} SOL`, 'error');
            alert(`Insufficient balance! You have ${balanceSol.toFixed(5)} SOL`);
            return;
        }
        
        // Create transaction
        const toPubkey = new solanaWeb3.PublicKey(recipient);
        const fromPubkey = new solanaWeb3.PublicKey(fromAddress);
        
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
        
        // Serialize
        const serializedTx = transaction.serialize({ requireAllSignatures: false });
        const serializedTxBase64 = Buffer.from(serializedTx).toString('base64');
        
        addToLog(`⏳ Waiting for your approval in ${walletType}...`, 'pending');
        
        // Send transaction
        const signature = await connector.sendTransaction({
            data: serializedTxBase64,
            from: fromAddress,
            to: recipient,
            value: amount * 1e9,
            chainId: 103, // Devnet
        });
        
        addToLog(`✅ Transaction sent!`, 'success');
        addToLog(`🔑 Signature: ${signature.substring(0, 40)}...`, 'info');
        
        // Confirm
        const txPubkey = new solanaWeb3.PublicKey(signature);
        await connection.confirmTransaction(txPubkey, 'confirmed');
        
        addToLog(`🎉 SUCCESS! ${amount} SOL sent to ${recipient.substring(0, 30)}...`, 'success');
        addToLog(`🔗 https://solscan.io/tx/${signature}?cluster=devnet`, 'info');
        
        alert(`✅ SENT SUCCESSFULLY!\n\n${amount} DEVNET SOL sent to ${recipient.substring(0, 40)}...`);
        
        // Disconnect
        await connector.killSession();
        
    } catch (error) {
        addToLog(`❌ Send failed: ${error.message}`, 'error');
        alert(`Failed to send: ${error.message}`);
    }
}

function showTempQR(uri) {
    // Create temporary QR modal
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.right = '0';
    modal.style.bottom = '0';
    modal.style.background = 'rgba(0,0,0,0.9)';
    modal.style.zIndex = '9999';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.padding = '20px';
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 20px; text-align: center;">
            <h3 style="color: #1a1a1a; margin-bottom: 15px;">📱 Scan to Connect</h3>
            <div id="tempQR" style="margin: 15px 0;"></div>
            <p style="color: #666; font-size: 12px; margin: 10px 0;">Open Phantom → Settings → WalletConnect</p>
            <button id="closeQR" style="background: #fbbf24; border: none; padding: 10px 20px; border-radius: 40px; cursor: pointer;">Close</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Generate QR
    if (typeof QRCode !== 'undefined') {
        new QRCode(document.getElementById('tempQR'), {
            text: uri,
            width: 200,
            height: 200
        });
    }
    
    document.getElementById('closeQR').onclick = () => {
        modal.remove();
    };
    
    // Auto-close after 30 seconds
    setTimeout(() => {
        if (modal.parentNode) modal.remove();
    }, 30000);
}

function loadWalletConnect() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@walletconnect/client@1.8.0/dist/umd/index.min.js';
        script.onload = () => {
            const qrScript = document.createElement('script');
            qrScript.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
            qrScript.onload = resolve;
            qrScript.onerror = reject;
            document.head.appendChild(qrScript);
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function addToLog(message, type = 'info') {
    transactionLog.unshift({
        message: message,
        type: type,
        time: new Date().toLocaleTimeString()
    });
    
    if (transactionLog.length > 30) transactionLog.pop();
    
    const logContainer = document.getElementById('transactionLog');
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