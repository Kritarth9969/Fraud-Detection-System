// Simulated XGBoost-style ML model for fraud detection

const FEATURE_WEIGHTS = {
  amount:       0.28,
  hour:         0.18,
  velocity:     0.22,
  accountAge:   0.12,
  countryRisk:  0.10,
  newDevice:    0.05,
  vpn:          0.05,
};

const CATEGORY_RISK = {online:0.3, atm:0.4, transfer:0.6, pos:0.2, crypto:0.7};

function sigmoid(x){ return 1/(1+Math.exp(-x)); }

function mlPredict(features){
  const {amount, hour, velocity, accountAge, countryRisk, newDevice, vpn, category} = features;

  // Normalised feature scores
  const amountScore   = Math.min(amount/10000, 1);
  const hourScore     = (hour<=5||hour>=22) ? 0.9 : (hour<=8||hour>=20) ? 0.5 : 0.1;
  const velocityScore = Math.min(velocity/20, 1);
  const ageScore      = Math.max(0, 1 - accountAge/365);
  const catScore      = CATEGORY_RISK[category]||0.3;
  const devScore      = newDevice ? 0.8 : 0.1;
  const vpnScore      = vpn ? 0.9 : 0.1;
  const countryScore  = countryRisk/2;

  // Weighted linear combination
  const raw =
    amountScore   * FEATURE_WEIGHTS.amount +
    hourScore     * FEATURE_WEIGHTS.hour +
    velocityScore * FEATURE_WEIGHTS.velocity +
    ageScore      * FEATURE_WEIGHTS.accountAge +
    countryScore  * FEATURE_WEIGHTS.countryRisk +
    devScore      * FEATURE_WEIGHTS.newDevice +
    vpnScore      * FEATURE_WEIGHTS.vpn +
    catScore      * 0.15;

  // Add small noise for realism
  const noise = (Math.random()-0.5)*0.03;
  const prob  = Math.min(0.99, Math.max(0.01, sigmoid((raw-0.4)*6) + noise));
  const score = Math.round(prob*100);

  const isFraud = prob >= 0.5;
  const confidence = isFraud ? prob : 1-prob;

  const importance = [
    {name:'Transaction Amount',  value: Math.round(amountScore   * FEATURE_WEIGHTS.amount   * 100), color:'#6366f1'},
    {name:'Velocity (24h)',      value: Math.round(velocityScore * FEATURE_WEIGHTS.velocity  * 100), color:'#8b5cf6'},
    {name:'Time of Day',         value: Math.round(hourScore     * FEATURE_WEIGHTS.hour      * 100), color:'#ec4899'},
    {name:'Account Age',         value: Math.round(ageScore      * FEATURE_WEIGHTS.accountAge*100), color:'#f59e0b'},
    {name:'Country Risk',        value: Math.round(countryScore  * FEATURE_WEIGHTS.countryRisk*100), color:'#10b981'},
    {name:'New Device',          value: Math.round(devScore      * FEATURE_WEIGHTS.newDevice * 100), color:'#06b6d4'},
    {name:'VPN/Proxy',           value: Math.round(vpnScore      * FEATURE_WEIGHTS.vpn       * 100), color:'#ef4444'},
  ].sort((a,b)=>b.value-a.value);

  const reasons = [];
  if(amountScore>0.6)   reasons.push('High transaction amount');
  if(hourScore>0.7)     reasons.push('Unusual hour (night/early morning)');
  if(velocityScore>0.6) reasons.push('High transaction velocity');
  if(ageScore>0.8)      reasons.push('New account (< 30 days)');
  if(countryRisk>=1)    reasons.push('High-risk country');
  if(newDevice)         reasons.push('Unrecognised device');
  if(vpn)               reasons.push('VPN/Proxy detected');
  if(catScore>=0.6)     reasons.push('Risky transaction category');

  return {score, prob, isFraud, confidence: Math.round(confidence*100), importance, reasons};
}

// Auto-score a full transaction object
function scoreTransaction(tx){
  return mlPredict({
    amount:      tx.amount,
    hour:        new Date(tx.timestamp).getHours(),
    velocity:    tx.velocity,
    accountAge:  tx.accountAge,
    countryRisk: tx.location.includes('NG')||tx.location.includes('RU')||tx.location.includes('CN') ? 2 : tx.location.includes('BR')||tx.location.includes('IN') ? 1 : 0,
    newDevice:   tx.newDevice,
    vpn:         tx.vpn,
    category:    tx.category,
  });
}
