#!/usr/bin/env npx tsx

import { PrivateKey, Transaction, P2PKH } from '@bsv/sdk';
import { createPaymentPayload } from '../dist/x402/payment-creator.js';
import fs from 'fs';
import path from 'path';

async function main() {
  const walletPath = path.join(process.cwd(), 'wallet-imported.json');
  const wallet = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));

  const privateKey = PrivateKey.fromWif(wallet.privateKey);
  const sourceAddress = wallet.address;
  const payTo = process.env.PAY_TO || 'mhSDV8SPswwXCGFpkE8pTWUftVnSW6g3qk';
  const amount = parseInt(process.env.AMOUNT || '1000');

  // Obtener UTXOs
  const utxosResponse = await fetch(`https://api.whatsonchain.com/v1/bsv/test/address/${sourceAddress}/unspent`);
  const utxos = await utxosResponse.json() as Array<{tx_hash: string; tx_pos: number; value: number}>;

  const utxo = utxos[0];
  const sourceTxResponse = await fetch(`https://api.whatsonchain.com/v1/bsv/test/tx/${utxo.tx_hash}/hex`);
  const sourceTxHex = await sourceTxResponse.text();

  const tx = new Transaction();
  tx.addInput({
    sourceTransaction: Transaction.fromHex(sourceTxHex),
    sourceOutputIndex: utxo.tx_pos,
    unlockingScriptTemplate: new P2PKH().unlock(privateKey),
  });

  tx.addOutput({
    lockingScript: new P2PKH().lock(payTo),
    satoshis: amount,
  });

  const fee = 100;
  const change = utxo.value - amount - fee;
  if (change > 0) {
    tx.addOutput({
      lockingScript: new P2PKH().lock(sourceAddress),
      satoshis: change,
    });
  }

  await tx.sign();
  const paymentPayload = createPaymentPayload(tx, 'testnet');

  console.log(paymentPayload);
}

main().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
