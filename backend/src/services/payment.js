import crypto from 'node:crypto'
// SIMULATED gateway. No real money moves and no card details are collected. Swap this module for a real provider later.
export function simulateCharge(method) {
  return { status: method === 'Cash' ? 'Pending' : 'Paid', reference: 'SIM-' + crypto.randomBytes(5).toString('hex').toUpperCase() }
}
