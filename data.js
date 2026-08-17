// Synthetic transaction data generator
const CATEGORIES = ['online','atm','transfer','pos','crypto'];
const LOCATIONS = ['New York, US','London, UK','Lagos, NG','Moscow, RU','São Paulo, BR','Beijing, CN','Toronto, CA','Mumbai, IN','Dubai, AE','Sydney, AU','Mexico City, MX','Paris, FR','Berlin, DE','Tokyo, JP','Jakarta, ID'];
const MERCHANTS = ['Amazon','Apple Store','Walmart','Shell Gas','Unknown Merchant','Crypto Exchange','Wire Transfer','Bank ATM','Best Buy','Steam','AliExpress','Dark Web','Binance','Chase Bank','PayPal'];

function rand(min,max){return Math.random()*(max-min)+min}
function randInt(min,max){return Math.floor(rand(min,max))}
function pick(arr){return arr[randInt(0,arr.length)]}

function generateTransaction(id,forcefraud){
  const isFraud = forcefraud !== undefined ? forcefraud : Math.random()<0.12;
  const cat = pick(CATEGORIES);
  const hour = isFraud ? (Math.random()<.6 ? randInt(0,5) : randInt(21,24)%24) : randInt(8,20);
  const amount = isFraud ? rand(500,15000) : rand(5,2000);
  const location = isFraud ? pick(LOCATIONS.slice(2,8)) : pick(LOCATIONS);
  const merchant = isFraud ? pick(MERCHANTS.slice(10)) : pick(MERCHANTS.slice(0,10));
  const riskScore = isFraud ? randInt(72,99) : randInt(5,35);
  const now = new Date();
  now.setMinutes(now.getMinutes()-randInt(0,43200));
  return {
    id:'TXN-'+String(id).padStart(6,'0'),
    timestamp: now.toISOString(),
    amount: parseFloat(amount.toFixed(2)),
    category: cat,
    location,
    merchant,
    riskScore,
    isFraud,
    status: isFraud ? 'fraud' : (riskScore>50?'review':'legitimate'),
    newDevice: isFraud ? (Math.random()<.7) : (Math.random()<.1),
    vpn: isFraud ? (Math.random()<.5) : (Math.random()<.05),
    velocity: isFraud ? randInt(8,25) : randInt(1,6),
    accountAge: isFraud ? randInt(1,30) : randInt(60,1800),
  };
}

function generateDataset(n=200){
  const txns=[];
  for(let i=1;i<=n;i++) txns.push(generateTransaction(i));
  return txns;
}

const TREND_LABELS = ['May 1','May 3','May 5','May 7','May 9','May 11','May 13','May 15','May 17','May 19','May 21','May 23','May 25','May 27','May 29'];
const TREND_NORMAL = [420,395,445,410,480,501,477,520,509,555,530,567,545,590,612];
const TREND_FRAUD  = [18,22,15,28,31,25,35,42,38,48,45,52,50,61,58];

const CATEGORY_LABELS = ['Online Purchase','ATM Withdrawal','Wire Transfer','POS Payment','Crypto Exchange'];
const CATEGORY_DATA   = [38,22,18,12,10];

const RISK_BANDS = ['0-20','21-40','41-60','61-80','81-100'];
const RISK_DATA  = [312,248,145,82,63];

const HOURLY_FRAUD = [14,22,31,45,38,18,8,4,3,5,7,9,12,10,11,8,9,12,15,18,21,25,20,17];
