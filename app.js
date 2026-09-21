
// --- 遊戲全局狀態 ---
const gameState = {
  gold: 1000,
  currentLevel: 1,
  maxLevel: 100,
  darkMode: false,
  mysteryUnlocked: false,
  mysteryPackageOpened: false,
  inventory: [], // 一般卡牌 ID 列表
  darkInventory: [], // 黑暗卡牌 ID 列表
  equippedCards: [], // 最多 5 張
  upgrades: {
    atkSpeed: 0,    // 攻擊速度 +3%/等
    atkDmg: 0,      // 攻擊傷害 +3%/等
    atkRange: 0,    // 攻擊範圍 +3%/等
    goldGain: 0,    // 獲得金錢 +10元/等
    enemyCount: 0,  // 敵人數量 +3人/等
    startMana: 0,   // 開場魔力
    luck: 0         // 抽卡運氣
  },
  gameSpeed: 1
};

// 100 張一般卡牌 + 30 張黑暗卡牌資料庫
const cardDatabase = [];
const darkCardDatabase = [];
const rarities = ['N', 'R', 'SR', 'SSR', 'UR'];
const poolTypes = ['control', 'attack'];

for (let i = 1; i <= 100; i++) {
  const rarityIndex = Math.min(Math.floor((i - 1) / 20), 4);
  const pool = i % 2 === 0 ? 'control' : 'attack';
  cardDatabase.push({
    id: i,
    name: `${pool === 'control' ? '控場' : '攻擊'}防禦塔 #${i}`,
    rarity: rarities[rarityIndex],
    stars: rarityIndex + 1,
    type: pool,
    desc: pool === 'control' ? `減緩敵人 ${10 * (rarityIndex + 1)}% 移動速度` : `造成 ${50 * (rarityIndex + 1)} 點範圍傷害`
  });
}

for (let i = 1; i <= 30; i++) {
  const rarityIndex = Math.min(Math.floor((i - 1) / 6), 4);
  const pool = i % 2 === 0 ? 'control' : 'attack';
  darkCardDatabase.push({
    id: i,
    name: `${pool === 'control' ? '闇控' : '闇攻'}卡 #${i}`,
    rarity: rarities[rarityIndex],
    stars: rarityIndex + 1,
    type: pool,
    dark: true,
    desc: pool === 'control'
      ? `暗影束縛：降低超難模式敵人 ${15 * (rarityIndex + 1)}% 速度`
      : `深淵打擊：對超難模式敵人造成 ${80 * (rarityIndex + 1)} 點範圍傷害`
  });
}

// 天賦升級設定
const upgradeConfig = {
  atkSpeed: { name: "攻擊速度 (+3%)", max: 10 },
  atkDmg: { name: "攻擊傷害 (+3%)", max: 10 },
  atkRange: { name: "攻擊範圍 (+3%)", max: 10 },
  goldGain: { name: "獲得金錢 (+10元)", max: 10 },
  enemyCount: { name: "敵人數量 (+3人)", max: 10 },
  startMana: { name: "開場魔力 (+10)", max: 10 },
  luck: { name: "抽卡運氣 (+1%)", max: 10 }
};

// --- UI 切換邏輯 ---
function openScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
  updateUI();
  if (screenId === 'equip-menu') renderEquipMenu();
  if (screenId === 'upgrade-menu') renderUpgradeMenu();
  if (screenId === 'gacha-menu') renderGachaMenu();
}

function updateUI() {
  document.getElementById('gold-display').innerText = gameState.gold;
  document.getElementById('gacha-gold-display').innerText = gameState.gold;
  document.getElementById('current-level-display').innerText = gameState.currentLevel;
  const maxDisplay=document.getElementById('max-level-display');
  if(maxDisplay) maxDisplay.innerText=gameState.maxLevel;
  document.getElementById('equip-count').innerText = gameState.equippedCards.length;
  const collectionCount = document.getElementById('collection-count');
  if(collectionCount) collectionCount.innerText = `${new Set(gameState.inventory).size} / 100`;
  const mode = document.getElementById('mode-label');
  if (mode) mode.innerText = gameState.darkMode ? '闇黑超難模式' : '一般模式';
  document.body.classList.toggle('dark-mode', gameState.darkMode);
}

// --- 天賦升級介面渲染 ---
function renderUpgradeMenu() {
  const container = document.getElementById('upgrade-list');
  container.innerHTML = '';
  for (let key in upgradeConfig) {
    const item = upgradeConfig[key];
    const lvl = gameState.upgrades[key];
    const cost = (lvl + 1) * 200;
    const div = document.createElement('div');
    div.className = 'card-item';
    div.innerHTML = `
      <h4>${item.name}</h4>
      <p>等級: ${lvl} / ${item.max}</p>
      ${lvl < item.max ? `<button class="btn" style="padding:4px 8px; font-size:12px;" onclick="buyUpgrade('${key}')">升級 (${cost} 金幣)</button>` : '<span>已滿級</span>'}
    `;
    container.appendChild(div);
  }
}

function buyUpgrade(key) {
  const lvl = gameState.upgrades[key];
  const cost = (lvl + 1) * 200;
  if (gameState.gold >= cost && lvl < upgradeConfig[key].max) {
    gameState.gold -= cost;
    gameState.upgrades[key]++;
    renderUpgradeMenu();
    updateUI();
  }
}

// --- 裝備卡牌介面渲染 ---
function renderEquipMenu() {
  const container = document.getElementById('equip-card-list');
  container.innerHTML = '';

  const sourceInventory = gameState.darkMode ? gameState.darkInventory : gameState.inventory;
  const sourceDatabase = gameState.darkMode ? darkCardDatabase : cardDatabase;

  if (sourceInventory.length === 0) {
    container.innerHTML = '<p style="grid-column: span 2;">目前尚未擁有任何卡牌，請先去招募！</p>';
    return;
  }

  const uniqueOwned = [...new Set(sourceInventory)];
  uniqueOwned.forEach(id => {
    const card = sourceDatabase.find(c => c.id === id);
    if (!card) return;
    const isEquipped = gameState.equippedCards.includes(id);
    const div = document.createElement('div');
    div.className = `card-item ${isEquipped ? 'equipped' : ''} ${gameState.darkMode ? 'dark-card-item' : ''}`;
    div.innerHTML = `
      <b>${card.dark ? '🌑 ' : ''}${card.name} (${card.rarity})</b>
      <p style="font-size:12px;">${card.desc}</p>
      <span>${isEquipped ? '【已裝備】' : '點擊裝備'}</span>
    `;
    div.onclick = () => toggleEquip(id);
    container.appendChild(div);
  });
}

function toggleEquip(id) {
  const idx = gameState.equippedCards.indexOf(id);
  if (idx > -1) {
    gameState.equippedCards.splice(idx, 1);
  } else {
    if (gameState.equippedCards.length < 5) {
      gameState.equippedCards.push(id);
    } else {
      alert("最多只能裝備 5 張卡牌！");
    }
  }
  renderEquipMenu();
  updateUI();
}

// --- 抽卡系統與動畫 ---
let gachaQueue = [];
let currentDrawCard = null;

let normalPity = 0;
let darkPity = 0;

function pickRarity(luckBonus, pityCount) {
  // 每 30 抽至少一張 UR；保底計數只在實際抽取後增加。
  if (pityCount >= 29) return 'UR';
  const rand = Math.random() - luckBonus;
  if (rand < 0.03) return 'UR';
  if (rand < 0.12) return 'SSR';
  if (rand < 0.30) return 'SR';
  if (rand < 0.60) return 'R';
  return 'N';
}

function triggerGacha(poolType, count) {
  const cost = count * 100;
  if (gameState.gold < cost) {
    alert("金幣不足！");
    return;
  }

  if (gameState.darkMode && !gameState.mysteryPackageOpened) return;

  gameState.gold -= cost;
  updateUI();

  gachaQueue = [];
  const pool = gameState.darkMode
    ? darkCardDatabase.filter(c => c.type === poolType)
    : cardDatabase.filter(c => c.type === poolType);

  for (let i = 0; i < count; i++) {
    const luckBonus = gameState.upgrades.luck * 0.01;
    let pity = gameState.darkMode ? darkPity : normalPity;
    const targetRarity = pickRarity(luckBonus, pity);

    let rarityFiltered = pool.filter(c => c.rarity === targetRarity);

    // 未收集優先：全收集前降低重複率，直到該卡池全部收集後才正常重複。
    const inv = gameState.darkMode ? gameState.darkInventory : gameState.inventory;
    const owned = new Set(inv);
    let unowned = rarityFiltered.filter(c => !owned.has(c.id));
    if (unowned.length === 0) unowned = pool.filter(c => !owned.has(c.id));
    const candidates = unowned.length ? unowned : rarityFiltered;
    const selected = candidates[Math.floor(Math.random() * candidates.length)] || pool[0];

    gachaQueue.push(selected);
    if (gameState.darkMode) {
      gameState.darkInventory.push(selected.id);
      darkPity = selected.rarity === 'UR' ? 0 : darkPity + 1;
    } else {
      gameState.inventory.push(selected.id);
      normalPity = selected.rarity === 'UR' ? 0 : normalPity + 1;
    }
  }

  startGachaAnimation();
}

function startGachaAnimation() {
  const overlay = document.getElementById('gacha-animation-overlay');
  const pack = document.getElementById('card-pack');
  const resultDisplay = document.getElementById('result-card-display');
  
  overlay.className = '';
  overlay.style.display = 'flex';
  resultDisplay.style.display = 'none';
  pack.style.display = 'block';
  pack.style.top = '-200px';

  // 卡包掉落動畫
  setTimeout(() => {
    pack.style.top = 'calc(50% - 90px)';
  }, 50);
}

function unpackCard() {
  if (gachaQueue.length === 0) return;
  currentDrawCard = gachaQueue.shift();
  
  const overlay = document.getElementById('gacha-animation-overlay');
  const pack = document.getElementById('card-pack');
  const resultDisplay = document.getElementById('result-card-display');

  pack.style.display = 'none';

  // UR 專屬動畫觸發
  if (currentDrawCard.rarity === 'UR') {
    overlay.classList.add('ur-blackout');
    setTimeout(() => {
      overlay.classList.add(gameState.darkMode ? 'dark-red-flash' : 'gold-flash');
      setTimeout(() => {
        showCardResult();
      }, 600);
    }, 300);
  } else {
    // 普通閃光
    overlay.classList.add('flash-effect');
    setTimeout(() => {
      overlay.classList.remove('flash-effect');
      showCardResult();
    }, 400);
  }
}

function showCardResult() {
  const resultDisplay = document.getElementById('result-card-display');
  const starContainer = document.getElementById('star-container');
  const frame = document.getElementById('card-frame');
  
  document.getElementById('card-name').innerText = currentDrawCard.name;
  document.getElementById('card-desc').innerText = currentDrawCard.desc;
  
  // 特殊 UR 金色邊框
  if (currentDrawCard.rarity === 'UR') {
    frame.style.borderColor = gameState.darkMode ? "#ff163d" : "var(--neon-yellow)";
    frame.style.boxShadow = gameState.darkMode ? "0 0 28px #ff163d" : "0 0 25px var(--neon-yellow)";
  } else {
    frame.style.borderColor = gameState.darkMode ? "#6b7280" : "var(--neon-cyan)";
    frame.style.boxShadow = gameState.darkMode ? "0 0 14px #444" : "0 0 10px var(--neon-cyan)";
  }

  starContainer.innerHTML = '';
  for (let i = 0; i < currentDrawCard.stars; i++) {
    const star = document.createElement('span');
    star.className = 'star';
    star.innerHTML = gameState.darkMode ? '🌌' : '★';
    starContainer.appendChild(star);
  }
  if (gameState.darkMode && currentDrawCard.rarity === 'UR') {
    starContainer.innerHTML = '<span style="font-size:38px;filter:drop-shadow(0 0 14px #000);">🕳️</span>';
  }

  resultDisplay.style.display = 'block';

  // 星星從左至右逐顆顯示
  const stars = starContainer.querySelectorAll('.star');
  stars.forEach((s, idx) => {
    setTimeout(() => {
      s.classList.add('show');
    }, idx * 250);
  });
}

function nextGachaResult() {
  const overlay = document.getElementById('gacha-animation-overlay');
  if (gachaQueue.length > 0) {
    startGachaAnimation();
  } else {
    overlay.style.display = 'none';
    updateUI();

    // 抽完後若剛好集齊100張一般卡牌，神秘套組立即在中央出現。
    checkMysteryPackage();
    if (gameState.mysteryUnlocked && !gameState.mysteryPackageOpened) {
      setTimeout(showMysteryPackageAnimation, 250);
    }
  }
}

// --- 戰鬥與關卡公式計算 ---
function getMaxWaves(level) {
  if (level >= 100) return 30;
  if (level >= 70) return 20;
  if (level >= 50) return 15;
  if (level >= 20) return 10;
  return 5;
}

function getStage(level) {
  if (level <= 20) return {name:'草原領地', cls:'stage-grass', sky:'#244c2b', ground:'#4e9d50'};
  if (level <= 50) return {name:'峽谷領地', cls:'stage-valley', sky:'#263342', ground:'#6f7d86'};
  if (level <= 70) return {name:'火山領地', cls:'stage-volcano', sky:'#2b0b0b', ground:'#7e2c16'};
  if (level <= 99) return {name:'錯誤領域', cls:'stage-error', sky:'#10051d', ground:'#32134c'};
  if (level === 100) return {name:'宇宙領地', cls:'stage-space', sky:'#02020d', ground:'#1a1040'};
  return {name:'宇宙深淵・超難模式', cls:'stage-space', sky:'#010106', ground:'#090916'};
}

let battleInterval = null;
let battleFrame = 0;
let currentEnemyX = 70;
let currentEnemyY = 250;

// 戰鬥中真正召喚到場上的塔：每張裝備卡可召喚一次，位置由玩家點擊指定。
let selectedBattleCardId = null;
let summonedTowers = [];
let battleEnemies = [];
let battleShots = [];
let nextEnemyId = 1;
let battleLastTime = 0;

// 戰鬥專用經濟：每局固定從 500 金幣開始，不會把主選單的抽卡金幣重設。
let battleGold = 500;
let escapedEnemyCount = 0;
let defeatedEnemyCount = 0;
let spawnedEnemyCount = 0;
let totalEnemiesThisBattle = 20;
let bossSpawned = false;
let battleFinished = false;
let spawnTimer = 0;
let bossSpawnAfter = 12;

function startBattle() {
  openScreen('battle-screen');

  // 每一局固定 500 金幣。
  battleGold = 500;
  escapedEnemyCount = 0;
  defeatedEnemyCount = 0;
  spawnedEnemyCount = 0;
  totalEnemiesThisBattle = 20;
  bossSpawned = false;
  battleFinished = false;
  spawnTimer = 0;
  bossSpawnAfter = 12;

  selectedBattleCardId = null;
  summonedTowers = [];
  battleEnemies = [];
  battleShots = [];
  nextEnemyId = 1;
  battleLastTime = performance.now();

  const lvl = gameState.currentLevel;
  const maxWaves = getMaxWaves(lvl);

  document.getElementById('b-level').innerText = lvl;
  document.getElementById('b-wave').innerText = 0;
  document.getElementById('b-max-wave').innerText = totalEnemiesThisBattle;
  document.getElementById('b-gold').innerText = battleGold;
  document.getElementById('battle-mode').innerText = gameState.darkMode ? '闇黑超難模式' : '一般模式';

  const stage = getStage(lvl);
  document.getElementById('battle-stage-label').innerText = `${stage.name} · 第 ${lvl} 關`;
  document.getElementById('battle-screen').className = `screen active ${stage.cls}`;

  const speedBtn = document.getElementById('speed-btn');
  speedBtn.style.display = lvl >= 3 ? 'inline-block' : 'none';

  closeBattleStatus();
  renderBattleCards();
  initBattleCanvas();
}

function toggleSpeed() {
  gameState.gameSpeed = gameState.gameSpeed === 1 ? 2 : 1;
  document.getElementById('speed-btn').innerText = `${gameState.gameSpeed}x 倍速`;
}

function drawStage(ctx, level) {
  const stage = getStage(level);
  const grad = ctx.createLinearGradient(0,0,0,540);
  grad.addColorStop(0, stage.sky);
  grad.addColorStop(1, stage.ground);
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,900,540);

  // 不同領域的背景元素
  if (level <= 20) {
    ctx.fillStyle = 'rgba(120,210,100,.22)';
    for(let i=0;i<14;i++){ ctx.beginPath(); ctx.arc(50+i*70,80+(i%3)*25,32,0,Math.PI*2); ctx.fill(); }
    ctx.fillStyle='rgba(255,255,255,.12)'; ctx.fillRect(80,65,100,3); ctx.fillRect(600,110,130,3);
  } else if (level <= 50) {
    ctx.fillStyle='rgba(220,230,240,.16)';
    ctx.beginPath(); ctx.moveTo(0,180); ctx.lineTo(170,65); ctx.lineTo(310,180); ctx.lineTo(430,55); ctx.lineTo(620,180); ctx.lineTo(860,70); ctx.lineTo(860,260); ctx.lineTo(0,260); ctx.fill();
  } else if (level <= 70) {
    ctx.fillStyle='rgba(255,90,20,.22)';
    for(let i=0;i<8;i++){ ctx.beginPath(); ctx.moveTo(70+i*110,190); ctx.lineTo(110+i*110,75+(i%2)*40); ctx.lineTo(150+i*110,190); ctx.fill(); }
    ctx.fillStyle='rgba(255,220,60,.45)';
    ctx.beginPath(); ctx.arc(700,90,34,0,Math.PI*2); ctx.fill();
  } else if (level <= 99) {
    ctx.strokeStyle='rgba(0,243,255,.18)'; ctx.lineWidth=2;
    for(let x=0;x<860;x+=43){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+90,500);ctx.stroke();}
    ctx.strokeStyle='rgba(255,0,85,.16)';
    for(let y=20;y<500;y+=45){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(860,y-90);ctx.stroke();}
  } else {
    ctx.fillStyle='rgba(150,120,255,.7)';
    for(let i=0;i<90;i++){const x=(i*97)%860,y=(i*53)%240;ctx.fillRect(x,y,2+(i%3),2+(i%2));}
    ctx.fillStyle='rgba(100,70,255,.2)';
    ctx.beginPath();ctx.arc(710,90,55,0,Math.PI*2);ctx.fill();
  }
}

// ===== 戰場地圖：大量方格 + 彎曲道路 =====
const BATTLE_MAP = {
  cols: 18,
  rows: 11,
  cellW: 50,
  cellH: 49.0909
};

// 道路節點：彎曲穿過整張地圖，從左下方進場、右上方離場。
const ROAD_NODES = [
  {x:0,   y:485},
  {x:105, y:485},
  {x:185, y:420},
  {x:205, y:340},
  {x:305, y:340},
  {x:350, y:265},
  {x:320, y:185},
  {x:395, y:105},
  {x:515, y:78},
  {x:630, y:112},
  {x:690, y:195},
  {x:690, y:290},
  {x:615, y:340},
  {x:585, y:425},
  {x:690, y:475},
  {x:805, y:420},
  {x:850, y:310},
  {x:850, y:215},
  {x:900, y:215}
];

let roadSamples = [];

function buildRoadSamples() {
  const samples = [];
  for (let i=0; i<ROAD_NODES.length-1; i++) {
    const a=ROAD_NODES[i], b=ROAD_NODES[i+1];
    const len=Math.hypot(b.x-a.x,b.y-a.y);
    const count=Math.max(10,Math.ceil(len/7));
    for(let j=0;j<count;j++){
      const t=j/count;
      samples.push({
        x:a.x+(b.x-a.x)*t,
        y:a.y+(b.y-a.y)*t
      });
    }
  }
  samples.push(ROAD_NODES[ROAD_NODES.length-1]);
  roadSamples=samples;
}
buildRoadSamples();

function traceCurvedRoad(ctx) {
  ctx.beginPath();
  ctx.moveTo(ROAD_NODES[0].x, ROAD_NODES[0].y);
  for(let i=1;i<ROAD_NODES.length-1;i++){
    const p=ROAD_NODES[i], n=ROAD_NODES[i+1];
    const midX=(p.x+n.x)/2, midY=(p.y+n.y)/2;
    ctx.quadraticCurveTo(p.x,p.y,midX,midY);
  }
  const last=ROAD_NODES[ROAD_NODES.length-1];
  const prev=ROAD_NODES[ROAD_NODES.length-2];
  ctx.quadraticCurveTo(prev.x,prev.y,last.x,last.y);
}

function roadDistance(x,y){
  let best=Infinity;
  for(let i=0;i<roadSamples.length;i+=3){
    const dx=x-roadSamples[i].x;
    const dy=y-roadSamples[i].y;
    best=Math.min(best,Math.hypot(dx,dy));
  }
  return best;
}

function getPlacementCells(){
  const cells=[];
  for(let row=0;row<BATTLE_MAP.rows;row++){
    for(let col=0;col<BATTLE_MAP.cols;col++){
      const x=col*BATTLE_MAP.cellW;
      const y=row*BATTLE_MAP.cellH;
      const cx=x+BATTLE_MAP.cellW/2;
      const cy=y+BATTLE_MAP.cellH/2;
      if(roadDistance(cx,cy)>34){
        cells.push({col,row,x,y,cx,cy});
      }
    }
  }
  return cells;
}

let PLACEMENT_CELLS=getPlacementCells();

function drawGridField(ctx){
  ctx.save();
  for(let row=0;row<BATTLE_MAP.rows;row++){
    for(let col=0;col<BATTLE_MAP.cols;col++){
      const x=col*BATTLE_MAP.cellW;
      const y=row*BATTLE_MAP.cellH;
      const cx=x+BATTLE_MAP.cellW/2;
      const cy=y+BATTLE_MAP.cellH/2;
      const blocked=roadDistance(cx,cy)<=34;

      ctx.fillStyle=blocked
        ? 'rgba(40,35,30,.20)'
        : ((row+col)%2===0 ? 'rgba(0,243,255,.040)' : 'rgba(176,0,255,.035)');
      ctx.fillRect(x+1,y+1,BATTLE_MAP.cellW-2,BATTLE_MAP.cellH-2);

      ctx.strokeStyle=blocked
        ? 'rgba(255,255,255,.035)'
        : 'rgba(0,243,255,.15)';
      ctx.lineWidth=1;
      ctx.strokeRect(x+.5,y+.5,BATTLE_MAP.cellW-1,BATTLE_MAP.cellH-1);

      if(!blocked){
        ctx.fillStyle='rgba(255,255,255,.11)';
        ctx.fillRect(x+5,y+5,3,3);
      }
    }
  }
  ctx.restore();
}

function drawRoad(ctx){
  ctx.save();
  ctx.lineCap='round';
  ctx.lineJoin='round';

  traceCurvedRoad(ctx);
  ctx.strokeStyle='rgba(0,0,0,.48)';
  ctx.lineWidth=64;
  ctx.stroke();

  traceCurvedRoad(ctx);
  ctx.strokeStyle='#766552';
  ctx.lineWidth=54;
  ctx.stroke();

  traceCurvedRoad(ctx);
  ctx.strokeStyle='#aa9271';
  ctx.lineWidth=46;
  ctx.stroke();

  traceCurvedRoad(ctx);
  ctx.strokeStyle='rgba(239,224,194,.80)';
  ctx.lineWidth=3;
  ctx.setLineDash([15,13]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle='rgba(0,243,255,.92)';
  ctx.shadowBlur=15;
  ctx.shadowColor='#00f3ff';
  ctx.beginPath();
  ctx.arc(14,485,9,0,Math.PI*2);
  ctx.fill();

  ctx.fillStyle='rgba(255,22,61,.94)';
  ctx.shadowColor='#ff163d';
  ctx.beginPath();
  ctx.arc(885,215,9,0,Math.PI*2);
  ctx.fill();
  ctx.shadowBlur=0;
  ctx.restore();
}

function drawSlots(ctx){
  ctx.save();
  PLACEMENT_CELLS.forEach((cell,index)=>{
    ctx.fillStyle=index%2===0 ? 'rgba(0,243,255,.028)' : 'rgba(176,0,255,.028)';
    ctx.strokeStyle='rgba(0,243,255,.28)';
    ctx.lineWidth=1.5;
    ctx.strokeRect(cell.x+4,cell.y+4,BATTLE_MAP.cellW-8,BATTLE_MAP.cellH-8);

    ctx.fillStyle='rgba(255,255,255,.18)';
    ctx.font='9px Segoe UI';
    ctx.textAlign='center';
    ctx.fillText('放置格',cell.cx,cell.cy+3);
  });
  ctx.restore();
}

function getTowerStats(card){
  const rarityBase = {
    N:   {damage:24,  range:92,  attackSpeed:1.45},
    R:   {damage:42,  range:112, attackSpeed:1.18},
    SR:  {damage:72,  range:136, attackSpeed:0.92},
    SSR: {damage:125, range:165, attackSpeed:0.70},
    UR:  {damage:230, range:205, attackSpeed:0.48}
  };
  const base = rarityBase[card?.rarity] || rarityBase.N;

  // 同稀有度也有個體差異，讓每座塔的數值不完全相同。
  const variation = 0.88 + ((Number(card?.id || 1) * 17) % 25) / 100;
  let damage = base.damage * variation;
  let range = base.range + ((Number(card?.id || 1) * 13) % 31) - 15;
  let attackSpeed = base.attackSpeed * (1.08 - ((Number(card?.id || 1) * 7) % 17) / 100);

  if(card?.type === 'control'){
    damage *= 0.72;
    range *= 1.14;
    attackSpeed *= 0.92;
  } else {
    damage *= 1.12;
  }

  // 升級系統套用到塔防。
  damage *= (1 + gameState.upgrades.atkDmg * 0.03);
  range *= (1 + gameState.upgrades.atkRange * 0.03);
  attackSpeed /= (1 + gameState.upgrades.atkSpeed * 0.03);

  if(card?.dark){
    damage *= 1.45;
    range *= 1.08;
    attackSpeed *= 0.84;
  }

  return {
    damage: Math.max(1, Math.round(damage)),
    range: Math.round(range),
    attackSpeed: Math.max(0.12, attackSpeed)
  };
}

function drawTowerAura(ctx, x, y, radius, color, alpha){
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle=color;
  ctx.lineWidth=2;
  ctx.shadowBlur=18;
  ctx.shadowColor=color;
  ctx.beginPath();
  ctx.arc(x,y,radius,0,Math.PI*2);
  ctx.stroke();
  ctx.shadowBlur=0;
  ctx.restore();
}

function drawCoolTower(ctx, tower, card, cell){
  const glow = card.dark ? '#ff163d' : (card.type === 'control' ? '#8b5cf6' : '#00f3ff');
  const secondary = card.dark ? '#ff7b00' : (card.type === 'control' ? '#00f3ff' : '#ffe600');
  const cx = cell.cx, cy = cell.cy;
  const size = Math.min(BATTLE_MAP.cellW, BATTLE_MAP.cellH);

  ctx.save();

  // 塔的攻擊範圍淡淡顯示。
  drawTowerAura(ctx, cx, cy, tower.stats.range, glow, 0.09);

  // 基座
  ctx.fillStyle=card.dark ? '#110308' : '#07131f';
  ctx.strokeStyle=glow;
  ctx.lineWidth=2;
  ctx.shadowBlur=16;
  ctx.shadowColor=glow;
  ctx.beginPath();
  ctx.arc(cx,cy+5,17,0,Math.PI*2);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur=0;

  if(card.dark){
    // 黑暗塔：黑洞核心 + 環狀軌道
    ctx.save();
    ctx.translate(cx,cy-4);
    ctx.rotate((battleFrame/35 + tower.cardId)%Math.PI*2);
    ctx.strokeStyle='#ff163d';
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.ellipse(0,0,15,6,0,0,Math.PI*2);
    ctx.stroke();
    ctx.rotate(Math.PI/2);
    ctx.strokeStyle='#7c1d3c';
    ctx.beginPath();
    ctx.ellipse(0,0,15,6,0,0,Math.PI*2);
    ctx.stroke();
    ctx.restore();

    const g=ctx.createRadialGradient(cx,cy-4,2,cx,cy-4,13);
    g.addColorStop(0,'#000');
    g.addColorStop(.55,'#09030b');
    g.addColorStop(1,'#ff163d');
    ctx.fillStyle=g;
    ctx.shadowBlur=24;
    ctx.shadowColor='#ff163d';
    ctx.beginPath();
    ctx.arc(cx,cy-4,12,0,Math.PI*2);
    ctx.fill();
  } else if(card.type === 'attack'){
    // 攻擊塔：三角砲台 + 旋轉炮管
    ctx.fillStyle=glow;
    ctx.beginPath();
    ctx.moveTo(cx,cy-18);
    ctx.lineTo(cx+15,cy+10);
    ctx.lineTo(cx-15,cy+10);
    ctx.closePath();
    ctx.globalAlpha=.88;
    ctx.fill();
    ctx.globalAlpha=1;

    const target=targetClosestEnemy(tower);
    const angle=target ? Math.atan2(target.y-cy,target.x-cx) : (-Math.PI/2 + Math.sin(battleFrame/30+tower.cardId)*.35);
    ctx.translate(cx,cy-2);
    ctx.rotate(angle);
    ctx.strokeStyle=secondary;
    ctx.lineWidth=6;
    ctx.lineCap='round';
    ctx.shadowBlur=14;
    ctx.shadowColor=secondary;
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(20,0);
    ctx.stroke();
  } else {
    // 控場塔：能量水晶 + 電弧環
    ctx.fillStyle=glow;
    ctx.globalAlpha=.9;
    ctx.beginPath();
    ctx.moveTo(cx,cy-20);
    ctx.lineTo(cx+10,cy-3);
    ctx.lineTo(cx,cy+14);
    ctx.lineTo(cx-10,cy-3);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha=1;

    ctx.strokeStyle=secondary;
    ctx.lineWidth=2;
    ctx.shadowBlur=14;
    ctx.shadowColor=secondary;
    ctx.beginPath();
    ctx.arc(cx,cy-3,16,0,Math.PI*2);
    ctx.stroke();
  }

  ctx.restore();

  // 塔名、數值
  ctx.save();
  ctx.textAlign='center';
  ctx.fillStyle='#fff';
  ctx.font='bold 8px Segoe UI';
  ctx.fillText(card.name.replace(/防禦塔 |卡 /,'').slice(0,12),cx,cell.y+6);

  ctx.font='8px Segoe UI';
  ctx.fillStyle=secondary;
  ctx.fillText(`${tower.stats.damage}傷 / ${tower.stats.range}距`,cx,cell.y+BATTLE_MAP.cellH-10);
  ctx.restore();
}

function drawEquippedTowers(ctx){
  const cards=gameState.darkMode ? darkCardDatabase : cardDatabase;

  summonedTowers.forEach((tower)=>{
    const card=cards.find(c=>c.id===tower.cardId);
    const cell=PLACEMENT_CELLS.find(c=>`${c.col},${c.row}`===tower.cellKey);
    if(!card || !cell) return;
    drawCoolTower(ctx,tower,card,cell);
  });

  // 被選中的卡牌會預覽可攻擊範圍。
  if(selectedBattleCardId){
    const selected = summonedTowers.find(t => t.cardId === selectedBattleCardId);
    if(selected) return;

    const card=cards.find(c=>c.id===selectedBattleCardId);
    if(card){
      const stats=getTowerStats(card);
      ctx.save();
      ctx.strokeStyle=gameState.darkMode?'rgba(255,22,61,.42)':'rgba(255,230,0,.42)';
      ctx.setLineDash([6,6]);
      ctx.lineWidth=2;
      PLACEMENT_CELLS.forEach(cell=>{
        const occupied=summonedTowers.some(t=>t.cellKey===`${cell.col},${cell.row}`);
        if(!occupied){
          ctx.beginPath();
          ctx.arc(cell.cx,cell.cy,stats.range,0,Math.PI*2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(cell.cx,cell.cy,5,0,Math.PI*2);
          ctx.stroke();
        }
      });
      ctx.setLineDash([]);
      ctx.restore();
    }
  }
}

function getNormalEnemyStats(){
  const lvl=gameState.currentLevel;
  const darkBoost=gameState.darkMode ? 2.1 : 1;

  return {
    hp: Math.round((240 + lvl*26) * darkBoost),
    speed: 1/48, // 一般怪物大約 48 秒走完整條道路
    radius: 12
  };
}

function getFastEnemyStats(){
  const base=getNormalEnemyStats();
  return {
    hp: Math.round(base.hp * .72),
    speed: 1/22, // 20～70關的快速怪，約為一般怪兩倍速度
    radius: 10
  };
}

function getTankEnemyStats(){
  const base=getNormalEnemyStats();
  return {
    hp: Math.round(base.hp * 5.5),
    speed: 1/62, // 厚血怪比較慢
    radius: 15
  };
}

function getBossStats(){
  const normal=getNormalEnemyStats();
  const lvl=gameState.currentLevel;

  // 第幾關的 Boss 就是一般怪血量的第幾倍。
  return {
    hp: Math.round(normal.hp * lvl),
    speed: 1/40,
    radius: 23,
    boss:true
  };
}

function chooseEnemyType(){
  const lvl=gameState.currentLevel;
  const roll=Math.random();

  // 20～70關：加入快速怪。
  if(lvl>=20 && lvl<=70 && roll<.22){
    return 'fast';
  }

  // 10～20關、50～100關：加入厚血怪。
  if((lvl>=10 && lvl<=20) || (lvl>=50 && lvl<=100)){
    if(roll<.26){
      return 'tank';
    }
  }

  return 'normal';
}

function spawnBattleEnemy(offset=0, type=null){
  const chosen=type || chooseEnemyType();
  let stats;

  if(chosen==='boss') stats=getBossStats();
  else if(chosen==='fast') stats=getFastEnemyStats();
  else if(chosen==='tank') stats=getTankEnemyStats();
  else stats=getNormalEnemyStats();

  const id=nextEnemyId++;
  const enemy={
    id,
    type:chosen,
    progress:Math.max(0,offset),
    hp:stats.hp,
    maxHp:stats.hp,
    speed:stats.speed,
    radius:stats.radius,
    boss:chosen==='boss',
    fast:chosen==='fast',
    tank:chosen==='tank',
    elite:false,
    slowUntil:0
  };

  battleEnemies.push(enemy);
  spawnedEnemyCount++;
  return enemy;
}

function updateEnemySpawn(dt){
  if(battleFinished) return;

  spawnTimer -= dt * gameState.gameSpeed;
  // 控制出怪速度；最多20隻一般/特殊怪，再加1隻每10關Boss。
  const targetCount = totalEnemiesThisBattle + (gameState.currentLevel % 10 === 0 ? 1 : 0);
  if(spawnedEnemyCount>=targetCount) return;

  if(spawnTimer>0) return;

  // Boss 每10關固定一隻，安排在第12隻普通敵人之後出現。
  if(gameState.currentLevel % 10 === 0 &&
     !bossSpawned &&
     spawnedEnemyCount >= bossSpawnAfter){
    spawnBattleEnemy(0, 'boss');
    bossSpawned=true;
    spawnTimer=3.2;
    return;
  }

  spawnBattleEnemy(-0.04);
  spawnTimer=1.75 + Math.random()*0.9;
}

function updateBattleEnemies(dt){
  battleEnemies.forEach(enemy=>{
    if(enemy.hp<=0) return;

    const slowMul = performance.now()<enemy.slowUntil ? .45 : 1;
    enemy.progress += enemy.speed * dt * gameState.gameSpeed * slowMul;

    const pos=getEnemyPosition(Math.min(1,enemy.progress));
    enemy.x=pos.x;
    enemy.y=pos.y;

    // 敵人走到右邊 = 逃脫。
    if(enemy.progress>=1){
      enemy.progress=1;
      enemy.hp=0;
      escapedEnemyCount++;

      if(escapedEnemyCount>=10){
        loseBattle();
      }
    }
  });
}

function targetClosestEnemy(tower){
  const candidates=battleEnemies.filter(enemy=>{
    if(enemy.hp<=0) return false;
    const dx=enemy.x-tower.x;
    const dy=enemy.y-tower.y;
    return Math.hypot(dx,dy)<=tower.stats.range;
  });
  candidates.sort((a,b)=>{
    // 優先攻擊最接近右端的敵人；Boss 有優先級。
    if(a.boss!==b.boss) return a.boss ? -1 : 1;
    return b.progress-a.progress;
  });
  return candidates[0] || null;
}

function fireTower(tower,target){
  const damage=tower.stats.damage;
  target.hp-=damage;

  battleShots.push({
    sx:tower.x,
    sy:tower.y,
    tx:target.x,
    ty:target.y,
    life:0,
    maxLife:.18,
    color:gameState.darkMode ? '#ff163d' : (tower.type==='control' ? '#8b5cf6' : '#00f3ff'),
    damage
  });

  if(target.hp<=0){
    target.hp=0;
    defeatedEnemyCount++;
    battleGold += 18 + (target.fast ? 8 : 0) + (target.tank ? 18 : 0) + (target.boss ? 150 : 0) + (gameState.darkMode ? 8 : 0);
  }
}

function updateTowerCombat(dt){
  summonedTowers.forEach(tower=>{
    tower.cooldown=Math.max(0,tower.cooldown-dt*gameState.gameSpeed);
    const target=targetClosestEnemy(tower);

    if(target && tower.cooldown<=0){
      fireTower(tower,target);
      tower.cooldown=tower.stats.attackSpeed;
    }
  });
}

function updateBattleShots(dt){
  battleShots.forEach(shot=>shot.life+=dt);
  battleShots=battleShots.filter(shot=>shot.life<shot.maxLife);
}

function checkBattleVictory(){
  const targetCount=totalEnemiesThisBattle + (gameState.currentLevel % 10 === 0 ? 1 : 0);
  const living=battleEnemies.some(e=>e.hp>0);

  if(!battleFinished &&
     spawnedEnemyCount>=targetCount &&
     defeatedEnemyCount>=targetCount &&
     !living &&
     escapedEnemyCount<10){
    winBattle();
  }
}

function drawBattleShots(ctx){
  battleShots.forEach(shot=>{
    const t=Math.min(1,shot.life/shot.maxLife);
    const x=shot.sx+(shot.tx-shot.sx)*t;
    const y=shot.sy+(shot.ty-shot.sy)*t;

    ctx.save();
    ctx.strokeStyle=shot.color;
    ctx.lineWidth=3;
    ctx.shadowBlur=13;
    ctx.shadowColor=shot.color;
    ctx.beginPath();
    ctx.moveTo(shot.sx,shot.sy);
    ctx.lineTo(x,y);
    ctx.stroke();

    ctx.fillStyle='#fff';
    ctx.beginPath();
    ctx.arc(x,y,4,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  });
}

function drawBattleEnemies(ctx){
  battleEnemies.forEach(enemy=>{
    if(enemy.hp<=0) return;

    const hpRatio=Math.max(0,enemy.hp/enemy.maxHp);
    const barW=enemy.boss ? 70 : 42;
    const r=enemy.radius;

    ctx.save();
    ctx.translate(enemy.x,enemy.y);

    // Boss / 快速 / 厚血怪的視覺差異。
    if(enemy.boss){
      ctx.fillStyle='#ff163d';
      ctx.strokeStyle='#ffe600';
      ctx.lineWidth=3;
      ctx.shadowBlur=25;
      ctx.shadowColor='#ff163d';
      ctx.beginPath();
      ctx.moveTo(0,-r-5);
      for(let i=0;i<8;i++){
        const a=-Math.PI/2+i*Math.PI/4;
        const rr=i%2===0 ? r+5 : r-2;
        ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if(enemy.fast){
      ctx.fillStyle='#00f3ff';
      ctx.strokeStyle='#fff';
      ctx.lineWidth=2;
      ctx.shadowBlur=16;
      ctx.shadowColor='#00f3ff';
      ctx.beginPath();
      ctx.moveTo(0,-r);
      ctx.lineTo(r+8,0);
      ctx.lineTo(0,r);
      ctx.lineTo(-r-8,0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if(enemy.tank){
      ctx.fillStyle='#8b5cf6';
      ctx.strokeStyle='#d8b4fe';
      ctx.lineWidth=3;
      ctx.shadowBlur=14;
      ctx.shadowColor='#8b5cf6';
      ctx.beginPath();
      ctx.arc(0,0,r,0,Math.PI*2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle='#2e1065';
      ctx.lineWidth=3;
      ctx.beginPath();
      ctx.arc(0,0,r-5,0,Math.PI*2);
      ctx.stroke();
    } else {
      ctx.fillStyle='#ffe600';
      ctx.strokeStyle='#fff';
      ctx.lineWidth=2;
      ctx.shadowBlur=14;
      ctx.shadowColor='#ffe600';
      ctx.beginPath();
      ctx.arc(0,0,r,0,Math.PI*2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.shadowBlur=0;

    // Boss 額外皇冠
    if(enemy.boss){
      ctx.fillStyle='#ffe600';
      ctx.beginPath();
      ctx.moveTo(-9,-r-12); ctx.lineTo(-3,-r-5); ctx.lineTo(3,-r-12);
      ctx.lineTo(9,-r-5); ctx.lineTo(13,-r-12); ctx.lineTo(10,-r+1);
      ctx.lineTo(-10,-r+1); ctx.closePath();
      ctx.fill();
    }

    // 血條
    ctx.fillStyle='rgba(0,0,0,.70)';
    ctx.fillRect(-barW/2,-r-23,barW,5);
    ctx.fillStyle=enemy.boss ? '#ff163d' : (hpRatio>.5 ? '#4ade80' : '#ff5d72');
    ctx.fillRect(-barW/2,-r-23,barW*hpRatio,5);

    ctx.fillStyle='#111';
    ctx.font=`bold ${enemy.boss?10:8}px Segoe UI`;
    ctx.textAlign='center';
    ctx.fillText(enemy.boss?'BOSS':(enemy.fast?'快':enemy.tank?'厚':'敵'),0,3);

    ctx.restore();
  });
}

function getEnemyPosition(progress){
  if(!roadSamples.length) return {x:20,y:485};
  const idx=Math.min(roadSamples.length-1,Math.floor(progress*(roadSamples.length-1)));
  return roadSamples[idx];
}

function getCardSummonCost(card){
  const base = {N:80, R:140, SR:220, SSR:320, UR:450};
  const darkMultiplier = card && card.dark ? 1.35 : 1;
  return Math.ceil((base[card?.rarity] || 100) * darkMultiplier);
}

function isCardAlreadySummoned(cardId){
  return summonedTowers.some(t => t.cardId === cardId);
}

function renderBattleCards(){
  const container=document.getElementById('battle-card-row');
  const tip=document.getElementById('battle-card-tip');
  if(!container) return;

  const cards=gameState.darkMode ? darkCardDatabase : cardDatabase;
  const ownedSource=gameState.darkMode ? gameState.darkInventory : gameState.inventory;
  const owned=new Set(ownedSource);
  const hand=gameState.equippedCards
    .map(id=>cards.find(c=>c.id===id))
    .filter(Boolean)
    .filter(card=>owned.has(card.id));

  container.innerHTML='';

  if(hand.length===0){
    container.innerHTML='<div class="battle-empty">尚未裝備戰鬥卡牌。請到「卡牌裝備」選擇最多 5 張卡牌。</div>';
    if(tip) tip.innerText='先裝備卡牌';
    return;
  }

  hand.forEach(card=>{
    const cost=getCardSummonCost(card);
    const stats=getTowerStats(card);
    const summoned=isCardAlreadySummoned(card.id);
    const affordable=battleGold>=cost;
    const div=document.createElement('div');

    div.className=`battle-card ${selectedBattleCardId===card.id?'selected':''} ${summoned?'summoned':''} ${!affordable&&!summoned?'no-money':''}`;

    const rarityIcon=card.dark ? '🌌' : '★';
    const speedText=stats.attackSpeed.toFixed(2)+'s';

    div.innerHTML=`
      <div class="card-state">${summoned?'已召喚':selectedBattleCardId===card.id?'已選取':'可召喚'}</div>
      <div class="card-name">${card.dark?'🌑 ':''}${card.name}</div>
      <div>${rarityIcon.repeat(Math.max(1,card.stars))}</div>
      <div class="card-cost">🪙 ${cost} 金幣</div>
      <div class="card-stats">
        <div class="stat"><span>傷害</span><b>${stats.damage}</b></div>
        <div class="stat"><span>範圍</span><b>${stats.range}</b></div>
        <div class="stat"><span>速度</span><b>${speedText}</b></div>
      </div>
      <div class="card-desc">${card.desc}</div>
    `;

    div.onclick=()=>{
      if(summoned){
        if(tip) tip.innerText='這張塔已召喚，請選其他卡牌';
        return;
      }
      if(battleGold<cost){
        if(tip) tip.innerText=`金幣不足：需要 ${cost} 金幣，目前只有 ${battleGold}`;
        return;
      }
      selectedBattleCardId=card.id;
      renderBattleCards();
      if(tip) tip.innerText=`已選擇「${card.name}」｜傷害 ${stats.damage}｜範圍 ${stats.range}｜每 ${speedText} 秒攻擊一次，接著點放置格`;
    };

    container.appendChild(div);
  });

  if(tip && !selectedBattleCardId){
    tip.innerText='選擇卡牌後，點擊場上的方格召喚塔防；塔會自動鎖定範圍內敵人';
  }
}

function getCellFromCanvasEvent(event){
  const canvas=document.getElementById('battle-canvas');
  const rect=canvas.getBoundingClientRect();
  const x=(event.clientX-rect.left)*(canvas.width/rect.width);
  const y=(event.clientY-rect.top)*(canvas.height/rect.height);

  return PLACEMENT_CELLS.find(cell =>
    x>=cell.x && x<cell.x+BATTLE_MAP.cellW &&
    y>=cell.y && y<cell.y+BATTLE_MAP.cellH
  ) || null;
}

function placeSelectedBattleCard(event){
  if(!selectedBattleCardId) return;

  const cards=gameState.darkMode ? darkCardDatabase : cardDatabase;
  const card=cards.find(c=>c.id===selectedBattleCardId);
  if(!card) return;

  const cell=getCellFromCanvasEvent(event);
  const tip=document.getElementById('battle-card-tip');

  if(!cell){
    if(tip) tip.innerText='這裡不是可放置的格子，請點擊道路旁的方格';
    return;
  }

  const occupied=summonedTowers.some(t=>t.cellKey===`${cell.col},${cell.row}`);
  if(occupied){
    if(tip) tip.innerText='這個位置已經有塔，請選其他格子';
    return;
  }

  const cost=getCardSummonCost(card);
  if(battleGold<cost){
    if(tip) tip.innerText=`金幣不足！需要 ${cost} 金幣，現在只有 ${battleGold}`;
    return;
  }

  const stats=getTowerStats(card);

  // 金幣足夠才可以正式召喚。
  battleGold-=cost;

  summonedTowers.push({
    cardId:card.id,
    type:card.type,
    cellKey:`${cell.col},${cell.row}`,
    x:cell.cx,
    y:cell.cy,
    stats,
    cooldown:0
  });

  playSummonAnimation(cell);

  selectedBattleCardId=null;
  document.getElementById('b-gold').innerText=battleGold;
  updateUI();
  renderBattleCards();
  if(tip) tip.innerText=`「${card.name}」已召喚：${stats.damage}傷害 / ${stats.range}範圍 / ${stats.attackSpeed.toFixed(2)}秒攻速，會自動攻擊敵人。`;
}

function playSummonAnimation(cell){
  const canvas=document.getElementById('battle-canvas');
  const rect=canvas.getBoundingClientRect();
  const overlay=document.getElementById('item-effect-overlay');
  if(!overlay) return;

  overlay.style.display='block';

  const x=rect.left+(cell.cx/canvas.width)*rect.width;
  const y=rect.top+(cell.cy/canvas.height)*rect.height;

  const burst=document.createElement('div');
  burst.style.cssText=`
    position:absolute;left:${x}px;top:${y}px;width:58px;height:58px;
    border:3px solid ${gameState.darkMode?'#ff163d':'#00f3ff'};
    border-radius:12px;transform:translate(-50%,-50%) scale(.35);
    box-shadow:0 0 30px ${gameState.darkMode?'#ff163d':'#00f3ff'};
    animation:itemHit .55s ease-out forwards;
  `;
  overlay.appendChild(burst);

  setTimeout(()=>{
    burst.remove();
    if(overlay.children.length===0) overlay.style.display='none';
  },600);
}

function initBattleCanvas() {
  const canvas=document.getElementById('battle-canvas');
  const ctx=canvas.getContext('2d');
  battleFrame=0;
  clearInterval(battleInterval);
  buildRoadSamples();
  PLACEMENT_CELLS=getPlacementCells();

  if(!canvas.dataset.summonBound){
    canvas.addEventListener('click', placeSelectedBattleCard);
    canvas.dataset.summonBound='1';
  }

  battleInterval=setInterval(()=>{
    const now=performance.now();
    let dt=(now-battleLastTime)/1000;
    battleLastTime=now;
    dt=Math.min(.08,Math.max(.001,dt));

    if(!battleFinished){
      ctx.clearRect(0,0,canvas.width,canvas.height);

      drawStage(ctx,gameState.currentLevel);
      drawGridField(ctx);
      drawRoad(ctx);

      updateEnemySpawn(dt);
      updateBattleEnemies(dt);
      updateTowerCombat(dt);
      updateBattleShots(dt);

      drawSlots(ctx);
      drawEquippedTowers(ctx);
      drawBattleEnemies(ctx);
      drawBattleShots(ctx);

      battleFrame += 1.35 * gameState.gameSpeed;

      // 只保留活著且尚未逃脫的敵人。
      battleEnemies=battleEnemies.filter(enemy=>enemy.hp>0 && enemy.progress<1);

      document.getElementById('b-gold').innerText=battleGold;
      document.getElementById('b-wave').innerText=Math.min(spawnedEnemyCount,totalEnemiesThisBattle + (gameState.currentLevel % 10 === 0 ? 1 : 0));

      checkBattleVictory();
    }
  },1000/30);
}

function useBattleItem(type) {
  const canvas=document.getElementById('battle-canvas');
  const rect=canvas.getBoundingClientRect();
  const startX=rect.left+70, startY=rect.top+250;
  const target=battleEnemies.find(e=>e.hp>0) || null;
  const targetX=target ? target.x : currentEnemyX;
  const targetY=target ? target.y : currentEnemyY;
  const endX=rect.left+(targetX/900)*rect.width;
  const endY=rect.top+(targetY/540)*rect.height;
  const overlay=document.getElementById('item-effect-overlay');
  overlay.style.display='block';

  if(type==='coin'){
    battleGold += 100;
    document.getElementById('b-gold').innerText=battleGold;

    const flash=document.createElement('div');
    flash.style.cssText=`position:absolute;left:${startX}px;top:${startY}px;color:#ffe600;font-weight:bold;font-size:24px;text-shadow:0 0 15px #ffe600;`;
    flash.innerText='+100 💰';
    overlay.appendChild(flash);
    setTimeout(()=>{flash.remove();overlay.style.display='none';},700);
    return;
  }

  if(type==='freeze'){
    battleEnemies.forEach(enemy=>{
      if(enemy.hp>0) enemy.slowUntil=performance.now()+3200;
    });

    const wave=document.createElement('div');
    wave.style.cssText=`position:absolute;left:${endX}px;top:${endY}px;width:80px;height:80px;border:4px solid #8ee7ff;border-radius:50%;transform:translate(-50%,-50%);box-shadow:0 0 35px #8ee7ff;animation:itemHit .6s ease-out forwards;`;
    overlay.appendChild(wave);
    setTimeout(()=>{wave.remove();overlay.style.display='none';},650);
    return;
  }

  // 追蹤飛彈：真的打到目標並造成傷害。
  if(target){
    target.hp=Math.max(0,target.hp-260);

    const missile=document.createElement('div');
    missile.className='missile';
    missile.style.left=`${startX}px`;
    missile.style.top=`${startY}px`;
    overlay.appendChild(missile);

    const dx=endX-startX, dy=endY-startY;
    const angle=Math.atan2(dy,dx);
    missile.style.transform=`translate(0,0) rotate(${angle}rad)`;
    missile.animate([
      {transform:`translate(0,0) rotate(${angle}rad)`},
      {transform:`translate(${dx}px,${dy}px) rotate(${angle}rad)`}
    ],{duration:650,easing:'cubic-bezier(.2,.8,.2,1)'});

    setTimeout(()=>{
      missile.remove();
      const hit=document.createElement('div');
      hit.className='item-hit';
      hit.style.left=`${endX}px`;
      hit.style.top=`${endY}px`;
      overlay.appendChild(hit);

      if(target.hp<=0){
        defeatedEnemyCount++;
        battleGold += target.boss ? 150 : 18;
      }

      setTimeout(()=>{
        hit.remove();
        overlay.style.display='none';
      },600);
    },650);
  }else{
    overlay.style.display='none';
  }
}

function finishBattleCommon(){
  battleFinished=true;
  clearInterval(battleInterval);
  selectedBattleCardId=null;
  renderBattleCards();
}

function showBattleStatus(title,textMsg,isLose){
  const overlay=document.getElementById('battle-status-overlay');
  const card=document.getElementById('battle-status-card');
  const titleEl=document.getElementById('battle-status-title');
  const textEl=document.getElementById('battle-status-text');

  titleEl.innerText=title;
  titleEl.style.color=isLose?'#ff5d72':'#00f3ff';
  textEl.innerText=textMsg;
  card.classList.toggle('lose',isLose);
  overlay.style.display='flex';
}

function winBattle(){
  if(battleFinished) return;

  finishBattleCommon();

  const lvl=gameState.currentLevel;
  const reward=100 + lvl*15;
  gameState.gold += reward;

  if(lvl < gameState.maxLevel){
    gameState.currentLevel++;
  }

  updateUI();
  showBattleStatus(
    '🎉 關卡勝利！',
    `本關成功擊退全部敵人。${defeatedEnemyCount} 隻敵人被擊敗，獲得 ${reward} 主城金幣。下一關：第 ${gameState.currentLevel} 關。`,
    false
  );
}

function loseBattle(){
  if(battleFinished) return;

  finishBattleCommon();
  updateUI();

  showBattleStatus(
    '💥 防線失守！',
    `已有 ${escapedEnemyCount} 隻敵人走到道路右側，達到 10 隻，戰鬥失敗。`,
    true
  );
}

function closeBattleStatus(){
  const overlay=document.getElementById('battle-status-overlay');
  if(overlay) overlay.style.display='none';
}

function restartCurrentBattle(){
  closeBattleStatus();
  startBattle();
}

function continueAfterBattle(){
  closeBattleStatus();
  openScreen('main-menu');
  checkMysteryPackage();
}

function exitBattle() {
  clearInterval(battleInterval);
  battleFinished=true;
  closeBattleStatus();
  openScreen('main-menu');
  checkMysteryPackage();
}

function checkMysteryPackage() {
  const uniqueNormalCount = new Set(gameState.inventory).size;
  const allCollected = uniqueNormalCount === cardDatabase.length;

  // 重複卡不會算進收集進度，必須真的收集齊全部100張一般卡牌才可開啟。
  const ready = allCollected && !gameState.mysteryPackageOpened && !gameState.darkMode;
  gameState.mysteryUnlocked = ready;
  return ready;
}

function showMysteryPackageAnimation() {
  if (!checkMysteryPackage()) return;

  const overlay=document.getElementById('mystery-animation-overlay');
  const pack=document.getElementById('mystery-pack');
  const result=document.getElementById('mystery-result');
  if(!overlay || !pack || !result) return;

  overlay.style.display='flex';
  pack.style.display='flex';
  pack.classList.remove('mystery-open');
  result.style.display='none';
}

function openMysteryPackage() {
  if(!gameState.mysteryUnlocked || gameState.mysteryPackageOpened) return;

  const overlay=document.getElementById('mystery-animation-overlay');
  const pack=document.getElementById('mystery-pack');
  const result=document.getElementById('mystery-result');

  pack.classList.add('mystery-open');

  setTimeout(()=>{
    pack.style.display='none';
    result.style.display='block';

    gameState.mysteryPackageOpened=true;
    gameState.mysteryUnlocked=false;
    gameState.darkMode=true;
    gameState.maxLevel=200;
    gameState.currentLevel=Math.max(101,gameState.currentLevel);

    // 正式開啟闇黑系統時，一般背包清空。
    gameState.inventory=[];
    gameState.darkInventory=[];
    gameState.equippedCards=[];

    updateUI();

    // 結果畫面短暫停留，之後整個神秘卡包消失，不再回到主選單。
    setTimeout(()=>{
      overlay.style.display='none';
      openScreen('main-menu');
    },1550);
  },820);
}

function submitRouteCode() {
  const code=document.getElementById('route-code').value.trim();
  if(code==='67897uhgg'){
    gameState.currentLevel=100;
    gameState.maxLevel=100;
    gameState.darkMode=false;
    gameState.mysteryPackageOpened=false;
    gameState.inventory=cardDatabase.map(c=>c.id);
    gameState.darkInventory=[];
    gameState.equippedCards=[];
    gameState.mysteryUnlocked=true;
    updateUI();
    setTimeout(showMysteryPackageAnimation,80);
  } else {
    alert('路代碼無效。');
  }
}

// 初始化執行
updateUI();
checkMysteryPackage();
