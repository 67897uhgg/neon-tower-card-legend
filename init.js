
function renderGachaMenu() {
  const dark = gameState.darkMode;
  const title=document.getElementById('gacha-title-mode');
  const desc=document.getElementById('gacha-description');
  const darkCard=document.getElementById('dark-gacha-card');
  if(title) title.innerText=dark?'闇黑卡池':'卡牌募集中心';
  if(desc) desc.innerText=dark?'黑暗系卡牌專為101～200超難模式而生。UR金光將轉為紅色，星星以銀河呈現。':'選擇你的卡池，召喚專屬霓虹塔防力量';
  if(darkCard) darkCard.style.display=dark?'block':'none';
}
