const canvas=document.getElementById('game'),ctx=canvas.getContext('2d'),T=80,C=10,R=7;
const levels=[
{name:'The Lost Key',status:'LEVEL 1 · EASY',start:{x:1,y:5},key:{x:4,y:2},treasure:{x:8,y:1},rocks:[{x:3,y:4},{x:4,y:4},{x:6,y:3},{x:7,y:3},{x:2,y:2},{x:6,y:5},{x:7,y:5},{x:8,y:4},{x:5,y:0}],monsters:[],witch:null,hint:'Sail north, then east toward the glowing key. The treasure is near the top-right corner.'},
{name:'The Sea Witch',status:'LEVEL 2 · MEDIUM',start:{x:1,y:5},key:{x:2,y:1},treasure:{x:8,y:1},rocks:[{x:3,y:5},{x:3,y:4},{x:5,y:4},{x:6,y:4},{x:7,y:4},{x:5,y:2},{x:6,y:2},{x:1,y:2},{x:8,y:3}],monsters:[{x:5,y:1,type:'witch'}],witch:{x:5,y:1},hint:'The key is in the upper-left waters. The Sea Witch guards the passage toward the treasure.'},
{name:"The Kraken's Curse",status:'LEVEL 3 · HARD',start:{x:1,y:6},key:{x:8,y:5},treasure:{x:8,y:1},rocks:[{x:2,y:6},{x:3,y:6},{x:3,y:5},{x:3,y:4},{x:5,y:4},{x:6,y:4},{x:7,y:4},{x:1,y:3},{x:2,y:3},{x:4,y:2},{x:5,y:2},{x:6,y:2},{x:7,y:2},{x:2,y:1},{x:3,y:1}],monsters:[{x:5,y:5,type:'kraken'},{x:6,y:1,type:'ghost'}],witch:{x:4,y:1},hint:'The route is narrow. Collect the key first, then use the upper passage. The Kraken lurks in the deep.'}
];
const dirs={up:[0,-1,'↑'],down:[0,1,'↓'],left:[-1,0,'←'],right:[1,0,'→']};
let li=0,L,ship,hasKey=false,solved=false,won=false,moving=false,started=false,particles=[],sound=false,music=false,audio=null,seaAmbience=null,musicLayer=null,toastTimer;
// Licensed fantasy-orchestral soundtrack bundled with the game.
const soundtrack = new Audio('deuslower-atmosphere-mystic-fantasy-orchestral-music-335263.mp3');
soundtrack.loop = true;
soundtrack.volume = 0.42;
// Gentle lapping waves and distant gulls, bundled as a separate ambience track.
const oceanWaves = new Audio('jonathanslattermusic-sea-gently-lapping-waves-far-away-seagulls-486892.mp3');
oceanWaves.loop = true;
oceanWaves.volume = 0.24;
let countdown=60,timerLoop=null,bubbleTimer=null,riddleStep=0,captainName='Captain',cursed=false,shipBroken=false;
const ATTEMPT_LIMITS=[1,2,3];
let attemptsUsed=[0,0,0],levelsCleared=[false,false,false],failureHandled=false;
// Competitive scoring stats for the current full voyage.
let wrongAnswers=0, lostAttempts=0, firstTryRiddles=0, levelMistakes=[0,0,0], levelFailed=[false,false,false], riddleMistakes=0, voyageStartedAt=Date.now();
const witchRiddles=[
 {q:'WITCH RIDDLE 1 / 4 — I have a face and two hands, but no arms or legs. What am I?',a:'clock',opts:[['clock','A clock'],['moon','The moon'],['compass','A compass']]},
 {q:'WITCH RIDDLE 2 / 4 — The more of me there is, the less you see. What am I?',a:'darkness',opts:[['fog','Fog'],['darkness','Darkness'],['rain','Rain']]},
 {q:'WITCH RIDDLE 3 / 4 — I can travel around the world while staying in one corner. What am I?',a:'stamp',opts:[['stamp','A postage stamp'],['map','A map'],['shadow','A shadow']]},
 {q:'WITCH RIDDLE 4 / 4 — What has cities but no houses, forests but no trees, and water but no fish?',a:'map',opts:[['dream','A dream'],['map','A map'],['mirror','A mirror']]}
];
const krakenRiddles=[
 {q:'SEAL 1 / 8 — I speak without a mouth and hear without ears. I have no body, yet I come alive with wind. What am I?',a:'echo',opts:[['echo','An echo'],['shadow','A shadow'],['flame','A flame']]},
 {q:'SEAL 2 / 8 — Decode the tide sequence: 3 · 6 · 12 · 24 · ?',a:'48',opts:[['36','36'],['42','42'],['48','48']]},
 {q:'SEAL 3 / 8 — A chest needs a 3-digit code. The digits are 2, 5, 8. The first is smallest and the last is largest. What is the code?',a:'258',opts:[['528','528'],['258','258'],['825','825']]},
 {q:'SEAL 4 / 8 — I have roots nobody sees, I am taller than trees, and I rise up but never grow. What am I?',a:'mountain',opts:[['mountain','A mountain'],['mast','A ship’s mast'],['wave','A wave']]},
 {q:'SEAL 5 / 8 — Which symbol completes the pattern? ☾ ★ ☾ ★ ☾ ?',a:'star',opts:[['sun','☀ Sun'],['star','★ Star'],['moon','☾ Moon']]},
 {q:'SEAL 6 / 8 — Three lanterns burn. The wind blows out one. How many lanterns remain?',a:'3',opts:[['2','2'],['1','1'],['3','3']]},
 {q:'SEAL 7 / 8 — The more you take, the more you leave behind. What are they?',a:'footsteps',opts:[['footsteps','Footsteps'],['coins','Coins'],['waves','Waves']]},
 {q:'SEAL 8 / 8 — I can be cracked, made, told, and played. What am I?',a:'joke',opts:[['joke','A joke'],['code','A code'],['promise','A promise']]}
];
const $=id=>document.getElementById(id);
// Mobile advisory: recommend desktop, but never require rotation.
(function setupRotatePrompt(){
 const prompt=$('rotate-prompt'),dismiss=$('rotate-dismiss');
 if(!prompt||!dismiss)return;
 let dismissed=false;
 dismiss.addEventListener('click',()=>{dismissed=true;prompt.classList.add('dismissed');});
 const syncOrientation=()=>{
   const phone=window.matchMedia('(max-width: 650px)').matches;
   if(!phone||dismissed)prompt.classList.add('dismissed');
   else prompt.classList.remove('dismissed');
 };
 window.addEventListener('resize',syncOrientation,{passive:true});
 window.addEventListener('orientationchange',syncOrientation,{passive:true});
 syncOrientation();
})();
let introTimer=null;
function startVoyage(){
 if($('cinematic-intro').classList.contains('active'))return;
 captainName=($('captain-name').value||'Moonlit Captain').trim().slice(0,18)||'Moonlit Captain';
 started=false;$('overlay').classList.add('hidden');
 $('intro-line').textContent=introDialogue(li);
 const intro=$('cinematic-intro');
 intro.classList.remove('level-1','level-2','level-3');intro.classList.add(`level-${li+1}`);
 const introMeta=[['THE LOST KEY · LEVEL I','✦ MYSTERY ON THE MOONLIT SEA ✦'],['THE SEA WITCH · LEVEL II','✦ DARK MAGIC STIRS BELOW ✦'],["THE KRAKEN’S CURSE · LEVEL III",'✦ THE FINAL SHOWDOWN BEGINS ✦']][li];
 $('intro-kicker').textContent=introMeta[0];$('intro-subtitle').textContent=introMeta[1];
 const introArt=$('cinematic-intro');introArt.classList.add('active');intro.setAttribute('aria-hidden','false');
 // The click is a user gesture, so we can safely start our original synthesized ambience.
 initAudio();if(audio&&audio.state==='suspended')audio.resume();if(sound)startSeaAmbience();if(music){startMusic();playIntroBell();}
 clearTimeout(introTimer);introTimer=setTimeout(finishCinematicIntro,12000);
}
function introDialogue(level){
 const lines=[
  `Easy, Captain ${captainName}… these waters are far too quiet. Somewhere beneath the moonlight, an ancient key is waiting. Find it, and the treasure may yet be yours.`,
  `Captain ${captainName}, the fog is alive… The Sea Witch has bound this passage with cursed riddles. Trust your wits, not your eyes—or this sea will never let you leave.`,
  `Captain ${captainName}… that sound beneath us is no ordinary wave. The Kraken has awakened! Eight seals stand between us and freedom. Sixty seconds may be all we have. Ready your courage!`
 ];
 return lines[level] || lines[0];
}
function playIntroBell(){if(!music||!audio)return;const now=audio.currentTime;[[392,.0,.9],[587.33,.22,1.15],[783.99,.48,1.35]].forEach(([freq,delay,duration],i)=>{const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(freq,now+delay);g.gain.setValueAtTime(.0001,now+delay);g.gain.exponentialRampToValueAtTime(i===0?.045:.026,now+delay+.035);g.gain.exponentialRampToValueAtTime(.0001,now+delay+duration);o.connect(g);g.connect(audio.destination);o.start(now+delay);o.stop(now+delay+duration+.03)});}
function finishCinematicIntro(){clearTimeout(introTimer);introTimer=null;$('cinematic-intro').classList.remove('active');$('cinematic-intro').setAttribute('aria-hidden','true');started=true;const opening=introDialogue(li);say(`The voyage begins, Captain ${captainName}.`);showDialogue(li===1?'CAPTAIN JACK':li===2?'CAPTAIN JACK':'CAPTAIN JACK',opening);sfx('magic');if(li===2)startCountdown();else $('timer-hud').classList.remove('visible')}
$('skip-intro').addEventListener('click',finishCinematicIntro);
function startCountdown(){clearInterval(timerLoop);countdown=60;$('timer-value').textContent=countdown;$('timer-hud').classList.add('visible');$('timer-hud').classList.remove('urgent');timerLoop=setInterval(()=>{if(!started||won){clearInterval(timerLoop);timerLoop=null;return}countdown--;$('timer-value').textContent=countdown;if(countdown<=10)$('timer-hud').classList.add('urgent');if(countdown===15){showDialogue('CAPTAIN JACK','The Kraken is closing in! Find the key and move!');sfx('warning')}if(countdown<=0){clearInterval(timerLoop);timerLoop=null;loseToKraken()}},1000)}
function loseToKraken(){if(!failureHandled)registerFailedAttempt('The Kraken’s countdown reached zero.');document.body.classList.add('boss-shake');setTimeout(()=>document.body.classList.remove('boss-shake'),700);showDialogue('THE KRAKEN','GLUB… GLUB… THE DEEP CLAIMS ANOTHER SHIP!');won=false;started=false;stopAmbience();sfx('fail');if(attemptsUsed[li]>=ATTEMPT_LIMITS[li]){registerFailedAttempt('The Kraken caught your ship.');}else{$('overlay-title').textContent='DRAGGED INTO THE DEEP';$('overlay-copy').textContent='The Kraken caught your ship! You have one more chance to try a faster route.';$('start-btn').textContent='↻ Try Again';$('start-btn').onclick=()=>{failureHandled=false;loadLevel(li,true)};$('overlay').classList.remove('hidden');}say('The countdown reached zero. The Kraken has claimed the sea!');showDialogue('THE KRAKEN','Your time is up, little captain…')}
function showDialogue(name,message){$('comic-bubble').querySelector('.bubble-name').textContent=name;$('bubble-text').textContent=message;$('comic-bubble').classList.add('visible');clearTimeout(bubbleTimer);bubbleTimer=setTimeout(()=>$('comic-bubble').classList.remove('visible'),12500)}
$('bubble-close').addEventListener('click',()=>$('comic-bubble').classList.remove('visible'));

function say(t){$('message').textContent=t;$('footer-message').textContent=t}
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),1700)}
function updateAttemptUI(){
 document.querySelectorAll('.level-tab').forEach((b,j)=>{const label=$(`attempt-label-${j}`);if(label)label.textContent=`${attemptsUsed[j]}/${ATTEMPT_LIMITS[j]} Attempts`;b.disabled=(j>0&&!levelsCleared[j-1])||levelsCleared[j]||j>li&&!levelsCleared[j-1];b.classList.toggle('locked-level',b.disabled);b.classList.toggle('cleared-level',levelsCleared[j]);b.setAttribute('aria-label',b.disabled?`Level ${j+1} locked`:`Level ${j+1}, ${attemptsUsed[j]} of ${ATTEMPT_LIMITS[j]} attempts used`);});
}
function updateQuest(){[['map-state',hasKey?'KEY LOCATED':'FOLLOW THE GLOW',hasKey],['key-state',hasKey?'FOUND':'MISSING',hasKey],['riddle-state',solved?'SOLVED':L.witch?'UNSOLVED':'N/A',solved],['treasure-state',won?'CLAIMED':'HIDDEN',won]].forEach(([id,t,ok])=>{const el=$(id);if(!el)return;el.textContent=t;el.classList.toggle('done',ok)})}
function currentRiddles(){return li===1?witchRiddles:li===2?krakenRiddles:[{q:'RIDDLE 1 / 1 — What has keys but cannot open locks?',a:'piano',opts:[['piano','A piano'],['map','A map'],['chest','A chest']]}]}
function setupRiddle(level){const panel=$('answer-options'),list=currentRiddles(),r=list[Math.min(riddleStep,list.length-1)];$('riddle-text').textContent=r.q;panel.innerHTML=r.opts.map(o=>`<button data-answer="${o[0]}">${o[1]}</button>`).join('');panel.querySelectorAll('[data-answer]').forEach(b=>b.addEventListener('click',answerRiddle));}
function answerRiddle(){if(!started)return;const b=this,list=currentRiddles(),r=list[Math.min(riddleStep,list.length-1)];if(b.dataset.answer===r.a){if(riddleMistakes===0)firstTryRiddles++;riddleMistakes=0;b.classList.add('correct-answer');sfx('magic');riddleStep++;const total=list.length;if(riddleStep<total){$('riddle-feedback').textContent=`Seal ${riddleStep} of ${total} broken! The next clue emerges…`;$('riddle-feedback').style.color='#77e6b0';setTimeout(()=>setupRiddle(li),300);showDialogue(li===2?'CAPTAIN JACK':'THE SEA WITCH',li===2?'Another seal shatters! Keep your wits sharp, captain!':'The mist parts… but four riddles guard my passage.');say(`Riddle ${riddleStep} of ${total} solved.`);return;}solved=true;document.body.classList.remove('mobile-riddle-open');$('riddle-panel').classList.add('locked');$('riddle-feedback').textContent=li===2?'All eight seals shattered! The Kraken’s passage is open.':(li===0?'The treasure seal breaks! Claim your chest!':'All four riddles solved! The witch’s spell is broken.');$('riddle-feedback').style.color='#77e6b0';panelDisable();create(ship.x,ship.y,'#a7f7ff',40);say('The final seal breaks! Sail for the treasure!');toast('CURSE SEAL BROKEN!');updateQuest();showDialogue('CAPTAIN JACK',li===2?'Eight seals? Now THAT is a tale worth telling! Get to the treasure, matey!':'Ha! You outsmarted the Sea Witch. Now let’s relieve her of that treasure!');}else{wrongAnswers++;levelMistakes[li]++;riddleMistakes++;b.classList.add('wrong-answer');$('riddle-feedback').textContent='Wrong answer… the curse tightens. Try another choice!';$('riddle-feedback').style.color='#ffb49b';sfx('bump');setTimeout(()=>b.classList.remove('wrong-answer'),300);if(li===2){countdown=Math.max(0,countdown-5);$('timer-value').textContent=countdown;toast('Wrong answer! 5 seconds lost!');if(countdown<=0)loseToKraken();}else if(li===1){create(ship.x,ship.y,'#b77aff',10);toast('The witch’s fog thickens…')}}}
function panelDisable(){document.querySelectorAll('#answer-options button').forEach(x=>x.disabled=true);}
function beginNewVoyage(){attemptsUsed=[0,0,0];levelsCleared=[false,false,false];wrongAnswers=0;lostAttempts=0;firstTryRiddles=0;levelMistakes=[0,0,0];levelFailed=[false,false,false];riddleMistakes=0;failureHandled=false;voyageStartedAt=Date.now();updateAttemptUI();const oldVictory=document.getElementById('victory-scene');if(oldVictory)oldVictory.classList.remove('show','victory-finale');loadLevel(0,true);}
function loadLevel(i,intro=true){if(i===0&&!levelsCleared[0]&&attemptsUsed.every(v=>v===0)){wrongAnswers=0;lostAttempts=0;firstTryRiddles=0;levelMistakes=[0,0,0];levelFailed=[false,false,false];riddleMistakes=0;voyageStartedAt=Date.now();}if(i>0&&!levelsCleared[i-1]){toast('Complete the previous voyage to unlock this level!');return;}failureHandled=false;document.body.classList.remove('mobile-riddle-open');clearTimeout(introTimer);introTimer=null;$('cinematic-intro').classList.remove('active');$('cinematic-intro').setAttribute('aria-hidden','true');li=i;L=levels[i];ship={...L.start,rx:L.start.x,ry:L.start.y};cursed=false;shipBroken=false;hasKey=false;solved=false;won=false;moving=false;particles=[];started=!intro;countdown=60;clearInterval(timerLoop);timerLoop=null;$('timer-value').textContent=countdown;$('timer-hud').classList.remove('urgent');$('timer-hud').classList.toggle('visible',i===2&&started);
$('map-title').textContent=i===0?'THE CURSED WATERS':i===1?"THE WITCH'S STRAIT":"THE KRAKEN'S MAZE";$('map-status').textContent=L.status;
document.querySelectorAll('.level-tab').forEach((b,j)=>b.classList.toggle('active',i===j));updateAttemptUI();
riddleStep=0;setupRiddle(i);
$('riddle-feedback').textContent='Find the key using the map clue, then sail onto the purple rune beside the treasure.';$('riddle-feedback').style.color='';$('riddle-panel').classList.toggle('locked',true);
document.querySelectorAll('[data-answer]').forEach(b=>b.disabled=false);
$('overlay-title').textContent=i===0?'Break the Curse':i===1?"The Sea Witch's Bargain":"The Kraken's Curse";
$('overlay-copy').textContent=i===0?'Tap a direction to sail. Find the key, avoid the reefs, and claim the treasure.':i===1?"Navigate the haunted strait, face the Sea Witch's riddle, and unlock the treasure.":'A maze of reefs, a hungry Kraken, and one legendary chest. Can you escape?';
$('start-btn').textContent=i===0?'⚓ Set Sail':i===1?'Enter the Strait':'Face the Kraken';$('start-btn').onclick=()=>{startVoyage()};
$('overlay').classList.toggle('hidden',!intro);updateQuest();
say(i===0?'The tide is whispering, captain. Find the key, then the treasure.':i===1?'A Sea Witch guards this passage. Reach her and answer wisely.':'The Kraken stirs beneath the waves. Find the key and escape the maze.');
}
document.querySelectorAll('.level-tab').forEach(b=>b.addEventListener('click',()=>{if(!moving&&!b.disabled)loadLevel(+b.dataset.level,true)}));

document.querySelectorAll('[data-direction]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();if(!started)return;moveShip(b.dataset.direction)}));
document.addEventListener('keydown',e=>{const m={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'};if(m[e.key]){e.preventDefault();if(!started)return;moveShip(m[e.key])}});
function rock(x,y){return L.rocks.some(r=>r.x===x&&r.y===y)}
function monster(x,y){return L.monsters.find(m=>m.x===x&&m.y===y)}
function moveShip(d){if(moving||won)return;let [dx,dy]=dirs[d],nx=ship.x+dx,ny=ship.y+dy;
if(nx<0||nx>=C||ny<0||ny>=R){say('The fog grows thick at the edge of the map. Turn back!');sfx('bump');toast('The edge of the cursed sea!');return}
if(rock(nx,ny)){shipwreck('rock');return}
let m=monster(nx,ny);if(m){shipwreck('monster',m);return}
moving=true;sfx('splash');let fx=ship.x,fy=ship.y,start=performance.now();
function step(now){let t=Math.min((now-start)/190,1),e=t*t*(3-2*t);ship.rx=fx+(nx-fx)*e;ship.ry=fy+(ny-fy)*e;if(t<1)requestAnimationFrame(step);else{ship.x=nx;ship.y=ny;ship.rx=nx;ship.ry=ny;moving=false;arrive()}}requestAnimationFrame(step)}
function arrive(){if(!hasKey&&ship.x===L.key.x&&ship.y===L.key.y){hasKey=true;create(ship.x,ship.y,'#ffd65f',25);sfx('key');say('The ancient key glows in your hand. The treasure map now points to the purple seal beside the chest!');toast('Ancient key collected!');showDialogue('CAPTAIN JACK','Ha! A little cursed gold never hurt a pirate. Now find that treasure chest!');updateQuest()}
if(L.witch&&ship.x===L.witch.x&&ship.y===L.witch.y&&!solved){openRiddle();say('A ghostly guardian rises from the mist. Answer the riddle to continue.');sfx('mystery')}
const sealX=L.treasure.x-1,sealY=L.treasure.y;
if(hasKey&&ship.x===sealX&&ship.y===sealY&&!solved){openRiddle();say('The purple rune awakens beside the treasure! Solve its riddle to break the seal.');showDialogue('CAPTAIN JACK',`${captainName}, the rune is awake! Solve its riddle, then the chest will shine gold!`);sfx('mystery')}
if(ship.x===L.treasure.x&&ship.y===L.treasure.y){if(hasKey&&solved)winLevel();else say(!hasKey?'The treasure chest is sealed. The key is still out there!':'The cursed seal remains. Solve the riddle first!')}}

function drawMapTrail(t){
 // A magical dotted route is the in-game treasure map: it points to the key until collected,
 // then points to the purple rune that unlocks the chest.
 const target=hasKey?{x:L.treasure.x-1,y:L.treasure.y}:L.key;
 if(won)return;
 const sx=ship.rx*T+40,sy=ship.ry*T+40,tx=target.x*T+40,ty=target.y*T+40;
 ctx.save();ctx.setLineDash([4,9]);ctx.lineDashOffset=-(t*.018);ctx.strokeStyle=hasKey?'#d5a4ff88':'#ffe08a88';ctx.lineWidth=2;ctx.shadowColor=hasKey?'#c28aff':'#ffdf76';ctx.shadowBlur=8;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(tx,ty);ctx.stroke();ctx.setLineDash([]);ctx.restore();
}
function shipwreck(kind,m){
 if(!started||won)return;registerFailedAttempt(kind==='rock'?'Your ship struck a reef.':'A monster claimed your ship.');started=false;moving=false;clearInterval(timerLoop);timerLoop=null;stopAmbience();document.body.classList.add('boss-shake');setTimeout(()=>document.body.classList.remove('boss-shake'),700);
 if(kind==='rock'){shipBroken=true;create(ship.x,ship.y,'#b9d6e8',45);sfx('fail');showDialogue('CAPTAIN JACK',`${captainName}! ROCKS AHEAD—brace yourself!`);shipwreckMessage('SHIPWRECK!','Your ship smashed against the jagged rocks. The hull is broken and the voyage is lost.');}
 else{cursed=true;create(ship.x,ship.y,'#bd75ff',48);sfx('fail');showDialogue(m&&m.type==='kraken'?'THE KRAKEN':'THE CURSED SPIRITS',`${captainName}… the sea claims you!`);shipwreckMessage('CURSED BY THE DEEP','A monster has cursed your ship. Its colors fade as the curse takes hold.');}
}
function registerFailedAttempt(reason){if(failureHandled)return;failureHandled=true;lostAttempts++;levelFailed[li]=true;attemptsUsed[li]=Math.min(ATTEMPT_LIMITS[li],attemptsUsed[li]+1);updateAttemptUI();const exhausted=attemptsUsed[li]>=ATTEMPT_LIMITS[li];if(exhausted){$('overlay-title').textContent='THE VOYAGE IS LOST';$('overlay-copy').textContent=`You used all ${ATTEMPT_LIMITS[li]} attempt${ATTEMPT_LIMITS[li]===1?'':'s'} on Level ${li+1}. The curse sends you back to the beginning. Your full voyage will restart from Level 1.`;$('start-btn').textContent='↻ Begin Again';$('start-btn').onclick=()=>beginNewVoyage();toast('Attempts exhausted — the voyage resets to Level 1.');}else{$('overlay-title').textContent='VOYAGE INTERRUPTED';$('overlay-copy').textContent=`${reason} Attempt ${attemptsUsed[li]} of ${ATTEMPT_LIMITS[li]} used. You have ${ATTEMPT_LIMITS[li]-attemptsUsed[li]} attempt${ATTEMPT_LIMITS[li]-attemptsUsed[li]===1?'':'s'} left on this level.`;$('start-btn').textContent='↻ Retry This Level';$('start-btn').onclick=()=>{failureHandled=false;loadLevel(li,true)};} $('overlay').classList.remove('hidden');say(reason);}
function shipwreckMessage(title,copy){registerFailedAttempt(copy);if(attemptsUsed[li]>=ATTEMPT_LIMITS[li])return;$('overlay-title').textContent=title;$('overlay-copy').textContent=`${copy} You have ${ATTEMPT_LIMITS[li]-attemptsUsed[li]} attempt${ATTEMPT_LIMITS[li]-attemptsUsed[li]===1?'':'s'} remaining.`;$('start-btn').textContent='↻ Retry This Level';$('start-btn').onclick=()=>{failureHandled=false;loadLevel(li,true)};$('overlay').classList.remove('hidden');say(copy);}
function openRiddle(){if(!hasKey){say('The rune is dormant. Find the key first!');return}$('riddle-panel').classList.remove('locked');document.body.classList.add('mobile-riddle-open');$('riddle-feedback').textContent=li===2?'Eight seals guard the Kraken. Every wrong answer costs 5 seconds!':li===1?'Four riddles bind the Sea Witch’s spell.':'One riddle guards the treasure. Choose wisely, captain.';setupRiddle(li);}
function getCaptainScore(){
 const completed=levelsCleared.filter(Boolean).length;
 const levelBase=[1000,1500,2000].reduce((sum,points,i)=>sum+(levelsCleared[i]?points:0),0);
 const cleanLevelBonus=levelFailed.reduce((sum,failed,i)=>sum+(!failed&&levelsCleared[i]?[200,300,400][i]:0),0);
 const attemptPreservationBonus=attemptsUsed.reduce((sum,used,i)=>sum+Math.max(0,ATTEMPT_LIMITS[i]-used)*100,0);
 const accuracyBonus=firstTryRiddles*100;
 const penalties=wrongAnswers*50+lostAttempts*150;
 const timeBonus=(completed===3)?Math.max(0,countdown)*10:0;
 const score=Math.max(0,levelBase+cleanLevelBonus+attemptPreservationBonus+accuracyBonus+timeBonus-penalties);
 const name=(captainName||'Moonlit Captain').trim().slice(0,18)||'Moonlit Captain';
 return {name,score,levels:completed,wrongAnswers,lostAttempts,firstTryRiddles,updated:Date.now(),completedAt:Date.now()-voyageStartedAt};
}
function saveCaptainScore(){
 // Qualify only after the player actually wins Level 3. Earlier levels cannot enter the Hall.
 // The number of failed attempts affects points, never eligibility.
 if(li!==2||!levelsCleared[2]||!levelsCleared[0]||!levelsCleared[1])return;
 const record=getCaptainScore();
 try{
  const key='ghostShipCaptainsHallV4';
  // V4 starts a clean Hall of Fame; do not migrate development/test records from older versions.
  let records=JSON.parse(localStorage.getItem(key)||'[]');
  if(!Array.isArray(records)) records=[];
  const old=records.findIndex(r=>(r.name||r.nickname||'').trim().toLowerCase()===record.name.toLowerCase());
  if(old>=0){if(Number(records[old].score||0)<=record.score)records[old]={...record};}else records.push(record);
  records.sort((a,b)=>Number(b.score||0)-Number(a.score||0)||Number(a.lostAttempts||0)-Number(b.lostAttempts||0)||Number(a.wrongAnswers||0)-Number(b.wrongAnswers||0)||Number(a.completedAt||Infinity)-Number(b.completedAt||Infinity));
  // Keep a generous local leaderboard so non-medal qualifiers remain visible.
  localStorage.setItem(key,JSON.stringify(records.slice(0,100)));
 }catch(e){console.warn('Could not save local captain score:',e);}
 renderCaptainHall();
 submitOnlineScore(record);
}
function getSupabaseClient(){
 const cfg=window.GHOST_SHIP_SUPABASE;
 if(!cfg||!cfg.url||!cfg.anonKey||cfg.url.includes('YOUR_PROJECT')||cfg.anonKey.includes('YOUR_SUPABASE'))return null;
 if(!window.supabase||!window.supabase.createClient)return null;
 if(!window.__ghostShipSupabaseClient)window.__ghostShipSupabaseClient=window.supabase.createClient(cfg.url,cfg.anonKey);
 return window.__ghostShipSupabaseClient;
}
async function submitOnlineScore(record){
 const status=$('hall-status');
 const client=getSupabaseClient();
 if(!client){if(status)status.textContent='Local Hall of Fame · completed voyages only; unfinished runs never qualify';return;}
 // Never insert browser-calculated scores directly into the public table. A trusted
 // Edge Function must validate a completed run before any competitive score is accepted.
 if(status)status.textContent='Supabase connected · secure score-submission function still needs to be deployed';
 await renderCaptainHall();
}
async function renderCaptainHall(){
 const list=$('hall-list');if(!list)return;
 const status=$('hall-status');
 const client=getSupabaseClient();
 if(client){
  try{
   const {data,error}=await client.from('captain_scores').select('nickname,score,levels_completed,created_at').order('score',{ascending:false}).limit(5);
   if(error)throw error;
   list.innerHTML='';
   if(!data||!data.length){list.innerHTML='<li>Be the first captain on the online leaderboard!</li>';}
   else data.forEach((r,i)=>{const item=document.createElement('li');item.innerHTML='<span class="hall-rank"></span><span class="hall-name"></span><b class="hall-score"></b>';item.querySelector('.hall-rank').textContent=['🥇','🥈','🥉','4.','5.'][i];item.querySelector('.hall-name').textContent=(r.nickname||'Unknown Captain')+' · '+(r.levels_completed||0)+' level'+(r.levels_completed===1?'':'s');item.querySelector('.hall-score').textContent=Number(r.score||0).toLocaleString()+' pts';list.appendChild(item);});
   if(status)status.textContent='🌐 Online Hall of Fame · shared across players';
   return;
  }catch(err){console.warn('Could not load online scores:',err);if(status)status.textContent='Online scores unavailable · showing local scores';}
 }else if(status){status.textContent='Best completed voyages only · unfinished runs do not qualify';}
 try{
  // Show only results saved under the clean V4 key; older test records are intentionally ignored.
  let records=JSON.parse(localStorage.getItem('ghostShipCaptainsHallV4')||'[]');
  if(!Array.isArray(records)) records=[];
  records=records.filter(r=>Number(r.levels||r.levels_completed||0)>=3).sort((a,b)=>Number(b.score||0)-Number(a.score||0)||Number(a.lostAttempts||0)-Number(b.lostAttempts||0)||Number(a.wrongAnswers||0)-Number(b.wrongAnswers||0)||Number(a.completedAt||Infinity)-Number(b.completedAt||Infinity));
  list.innerHTML='';
  if(!records.length){list.innerHTML='<li>Win Level 3 to earn your place, captain.</li>';return;}
  records.forEach((r,i)=>{const item=document.createElement('li');item.innerHTML='<span class="hall-rank"></span><span class="hall-name"></span><b class="hall-score"></b>';item.querySelector('.hall-rank').textContent=i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`;item.querySelector('.hall-name').textContent=(r.name||r.nickname||'Unknown Captain')+' · 3 levels';item.querySelector('.hall-score').textContent=Number(r.score||0).toLocaleString()+' pts';list.appendChild(item);});
 }catch(e){list.innerHTML='<li>Hall of Fame is unavailable in this browser.</li>';}
}
function winLevel(){levelsCleared[li]=true;saveCaptainScore();updateAttemptUI();clearInterval(timerLoop);timerLoop=null;$('timer-hud').classList.remove('visible');won=true;create(ship.x,ship.y,'#ffd65f',75);sfx('win');showDialogue('CAPTAIN JACK',`HA-HA-HA-HA! ${captainName}, the sea shall remember your name for a thousand tides! You have earned your place among legends, matey!`);laughEffect();updateQuest();
 let victory=document.getElementById('victory-scene');if(!victory){victory=document.createElement('section');victory.id='victory-scene';victory.className='victory-scene';victory.innerHTML='<div class="victory-art"></div><div class="victory-vignette"></div><div class="victory-copy"><span id="victory-kicker"></span><h2 id="victory-title"></h2><p id="victory-line"></p><small id="victory-subtitle"></small><button id="victory-next"></button></div><div class="victory-sparkles">✦　·　✧　✦　·　✧　✦</div>';document.querySelector('.canvas-wrap').appendChild(victory)}
 const titles=['THE KEY IS OURS!','THE WITCH IS DEFEATED!','THE CURSE IS BROKEN!'],lines=[`Well done, Captain ${captainName}! The ancient key is yours. The sea has revealed its first secret… but more adventures await!`,`Magnificent, Captain ${captainName}! The Sea Witch’s spell is broken. Her purple curse fades into the deep—and the final challenge calls!`,`YOU DID IT, CAPTAIN ${captainName.toUpperCase()}! The Kraken is defeated, the storm is fading, and your crew celebrates. The treasure is yours… and so is your legend!`];
 victory.className='victory-scene victory-level-'+(li+1);victory.querySelector('#victory-kicker').textContent='VOYAGE '+(li+1)+' COMPLETE';victory.querySelector('#victory-title').textContent=titles[li];victory.querySelector('#victory-line').textContent=lines[li];victory.querySelector('#victory-subtitle').textContent=li===2?'✦ THE SEA WILL SING OF YOUR LEGEND ✦':'✦ THE CREW CELEBRATES YOUR TRIUMPH ✦';const next=victory.querySelector('#victory-next');next.textContent=li<2?'⚓ Continue the Voyage →':'✨ Witness the Final Epilogue';next.onclick=()=>{if(li<2){victory.classList.remove('show');loadLevel(li+1,true);return;}victory.classList.add('victory-finale');victory.querySelector('#victory-kicker').textContent='THE CURSE IS BROKEN · THE SEA IS AT PEACE';victory.querySelector('#victory-title').textContent='THE END… OR JUST THE BEGINNING?';victory.querySelector('#victory-line').textContent=`The last storm drifts beyond the horizon. Your crew raises their lanterns as calm waters shimmer beneath the moon, Captain ${captainName}. The treasure is yours—but somewhere beyond the stars, another adventure is waiting…`;victory.querySelector('#victory-subtitle').textContent='✦ YOUR LEGEND WILL LIVE FOR A THOUSAND TIDES ✦';next.textContent='⚓ Sail Again';next.onclick=()=>beginNewVoyage();};victory.classList.remove('show');void victory.offsetWidth;victory.classList.add('show');say(li<2?`Level ${li+1} complete! The crew celebrates your victory!`:`LEGENDARY CAPTAIN ${captainName.toUpperCase()}! You broke the Kraken’s curse!`)}
$('restart-btn').addEventListener('click',()=>{if(started&&!won){registerFailedAttempt('You abandoned this attempt and chose to restart.');if(attemptsUsed[li]>=ATTEMPT_LIMITS[li])return;}failureHandled=false;loadLevel(li,false);started=true;if(li===2)startCountdown();say('Level restarted. Your ship is back at the starting point.')});
$('hint-btn').addEventListener('click',()=>{showDialogue('CAPTAIN JACK',li===2?'Tick-tock, captain! '+L.hint+' The eight seals are in order; wrong answers cost five seconds.':li===1?'Four riddles, four answers. Look for patterns, not just the obvious! '+L.hint:L.hint);say('The captain leans closer and whispers a clue…');sfx('magic')});
function laughEffect(){if(!sound)return;initAudio();if(!audio)return;const notes=[392,440,392,330,349,294];notes.forEach((f,i)=>setTimeout(()=>{if(!sound||!audio)return;const o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(.0001,audio.currentTime);g.gain.exponentialRampToValueAtTime(.045,audio.currentTime+.025);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+.14);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.15)},i*115))}
function create(x,y,color,n=12){for(let i=0;i<n;i++)particles.push({x:x*T+40,y:y*T+40,vx:(Math.random()-.5)*4,vy:(Math.random()-.5)*4,life:30+Math.random()*25,color})}
function drawOcean(t){let g=ctx.createLinearGradient(0,0,800,560);g.addColorStop(0,'#071b2b');g.addColorStop(.5,'#0b4354');g.addColorStop(1,'#041522');ctx.fillStyle=g;ctx.fillRect(0,0,800,560);
for(let y=0;y<R;y++)for(let x=0;x<C;x++){let px=x*T,py=y*T;ctx.fillStyle=(x+y)%2?'#0a3445':'#0b3b4b';ctx.fillRect(px+2,py+2,T-4,T-4);ctx.strokeStyle='#176c7e';ctx.strokeRect(px+2,py+2,T-4,T-4);ctx.strokeStyle='#53ccda44';ctx.beginPath();ctx.moveTo(px+10,py+16);ctx.lineTo(px+25,py+27);ctx.lineTo(px+19,py+40);ctx.moveTo(px+25,py+27);ctx.lineTo(px+45,py+21);ctx.lineTo(px+60,py+35);ctx.stroke();let off=(t*.024+x*13+y*7)%58;ctx.strokeStyle='#69efeb44';ctx.beginPath();ctx.moveTo(px+off,py+61);ctx.quadraticCurveTo(px+off+7,py+56,px+off+14,py+61);ctx.stroke()}
for(let i=0;i<4;i++){let x=(t*.012+i*240)%1000-100,f=ctx.createRadialGradient(x,280,4,x,280,145);f.addColorStop(0,'#50becd17');f.addColorStop(1,'#50becd00');ctx.fillStyle=f;ctx.fillRect(0,0,800,560)}
 // Tiny enchanted plankton and starlight drift over the water.
 for(let i=0;i<34;i++){let x=(i*137+(t*.012*(i%3+1)))%800,y=(i*83+Math.sin(t*.0015+i)*18)%560,alpha=.25+.55*(.5+.5*Math.sin(t*.004+i*2));ctx.globalAlpha=alpha;ctx.fillStyle=i%5===0?'#ffe6a0':'#73faff';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=7;ctx.beginPath();ctx.arc(x,y,1+(i%3)*.45,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;ctx.shadowBlur=0;}
function drawRock(r){let x=r.x*T+40,y=r.y*T+43;ctx.save();ctx.fillStyle='#0008';ctx.beginPath();ctx.ellipse(x,y+15,29,13,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(x-28,y+12);ctx.lineTo(x-32,y-5);ctx.lineTo(x-18,y-27);ctx.lineTo(x-3,y-33);ctx.lineTo(x+12,y-24);ctx.lineTo(x+29,y-2);ctx.lineTo(x+27,y+12);ctx.closePath();let g=ctx.createLinearGradient(x-25,y-25,x+25,y+15);g.addColorStop(0,'#a9bdc9');g.addColorStop(.4,'#607689');g.addColorStop(1,'#283c4e');ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#b0d0dd';ctx.lineWidth=2;ctx.stroke();ctx.strokeStyle='#30495b';ctx.beginPath();ctx.moveTo(x-3,y-27);ctx.lineTo(x-10,y-7);ctx.lineTo(x+1,y+2);ctx.moveTo(x+13,y-15);ctx.lineTo(x+7,y-2);ctx.stroke();ctx.restore()}
function drawPlanks(x,y){let px=x*T+8,py=y*T+8;ctx.fillStyle='#58371f';ctx.fillRect(px,py,64,64);for(let i=0;i<4;i++){ctx.fillStyle=i%2?'#8b5a32':'#a16c3b';ctx.fillRect(px+2,py+3+i*15,60,12);ctx.strokeStyle='#3b281d';ctx.strokeRect(px+2,py+3+i*15,60,12)}}
function drawKey(t){if(hasKey)return;let x=L.key.x*T+40,y=L.key.y*T+40+Math.sin(t*.004)*4;ctx.save();ctx.translate(x,y);ctx.rotate(-.55);ctx.shadowColor='#ffd45e';ctx.shadowBlur=18;ctx.strokeStyle='#ffdf72';ctx.lineWidth=5;ctx.beginPath();ctx.arc(-7,-9,8,0,Math.PI*2);ctx.moveTo(-1,-3);ctx.lineTo(17,15);ctx.lineTo(12,20);ctx.moveTo(8,11);ctx.lineTo(3,16);ctx.stroke();ctx.restore()}
function drawSeal(t){if(solved)return;let x=(L.treasure.x-1)*T+40,y=L.treasure.y*T+40;ctx.save();ctx.translate(x,y);ctx.rotate(t*.00035);ctx.shadowColor='#b78cff';ctx.shadowBlur=12+Math.sin(t*.006)*5;ctx.strokeStyle='#cda6ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,17,0,Math.PI*2);ctx.moveTo(0,-12);ctx.lineTo(10,8);ctx.lineTo(-10,8);ctx.closePath();ctx.stroke();ctx.fillStyle='#e8d4ff';ctx.font='bold 15px Georgia';ctx.textAlign='center';ctx.fillText('?',0,5);ctx.restore()}
function drawChest(t){let x=L.treasure.x*T+16,y=L.treasure.y*T+23;ctx.save();ctx.shadowColor=solved?'#ffb82e':'#73808a';ctx.shadowBlur=solved?14+Math.sin(t*.005)*5:2;ctx.globalAlpha=solved?1:.48;ctx.fillStyle=solved?'#a85b18':'#414c55';ctx.beginPath();ctx.moveTo(x,y+8);ctx.lineTo(x+5,y-5);ctx.quadraticCurveTo(x+24,y-18,x+43,y-5);ctx.lineTo(x+48,y+8);ctx.closePath();ctx.fill();ctx.strokeStyle='#ffd36a';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#814015';ctx.fillRect(x,y+7,48,27);ctx.fillStyle=solved?'#f6c34d':'#68737b';ctx.fillRect(x+5,y+6,5,29);ctx.fillRect(x+38,y+6,5,29);ctx.strokeRect(x,y+7,48,27);ctx.fillStyle=solved?'#ffdf77':'#879199';ctx.fillRect(x+19,y+16,11,11);ctx.strokeStyle='#ffe9a1';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x+24.5,y+16,5,Math.PI,0);ctx.stroke();ctx.fillStyle=solved?'#42e7f1':'#68737b';ctx.beginPath();ctx.moveTo(x+5,y+39);ctx.lineTo(x+11,y+33);ctx.lineTo(x+17,y+39);ctx.lineTo(x+11,y+45);ctx.closePath();ctx.fill();ctx.restore()}
function drawShip(t){let x=ship.rx*T+40,y=ship.ry*T+40+Math.sin(t*.004)*2;ctx.save();if(cursed)ctx.filter='hue-rotate(105deg) saturate(.65)';if(shipBroken)ctx.globalAlpha=.45;ctx.translate(x,y);ctx.fillStyle='#0006';ctx.beginPath();ctx.ellipse(0,20,25,9,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#633719';ctx.beginPath();ctx.moveTo(-25,5);ctx.lineTo(25,5);ctx.lineTo(17,20);ctx.quadraticCurveTo(0,29,-17,20);ctx.closePath();ctx.fill();ctx.strokeStyle='#d59a4b';ctx.lineWidth=2;ctx.stroke();ctx.strokeStyle='#ad773c';ctx.beginPath();ctx.moveTo(-17,12);ctx.lineTo(17,12);ctx.moveTo(-11,18);ctx.lineTo(11,18);ctx.stroke();ctx.fillStyle='#d8b47a';ctx.fillRect(-2,-29,4,36);ctx.fillStyle='#e6dfc7';ctx.beginPath();ctx.moveTo(-3,-25);ctx.lineTo(-21,-5);ctx.lineTo(-3,-3);ctx.closePath();ctx.fill();ctx.fillStyle='#d8d1b7';ctx.beginPath();ctx.moveTo(3,-18);ctx.lineTo(18,-4);ctx.lineTo(3,-3);ctx.closePath();ctx.fill();ctx.fillStyle='#10151d';ctx.beginPath();ctx.moveTo(-1,-29);ctx.lineTo(20,-26);ctx.lineTo(17,-14);ctx.lineTo(-1,-17);ctx.closePath();ctx.fill();ctx.fillStyle='#fff0c9';ctx.beginPath();ctx.arc(9,-23,4,0,Math.PI*2);ctx.fill();ctx.fillRect(6,-20,6,3);ctx.strokeStyle='#f2e5bf';ctx.beginPath();ctx.moveTo(5,-15);ctx.lineTo(14,-10);ctx.moveTo(14,-15);ctx.lineTo(5,-10);ctx.stroke();if(cursed){ctx.globalAlpha=.7;ctx.strokeStyle='#a95dff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-2,31+Math.sin(t*.01)*3,0,Math.PI*2);ctx.stroke()}ctx.restore()}
function drawMonster(m,t){let drift=m.type==='kraken'?Math.sin(t*.0015+m.x)*5:Math.sin(t*.002+m.y)*2;let x=m.x*T+40+drift,y=m.y*T+42+Math.sin(t*.003+m.x)*5;ctx.save();ctx.translate(x,y);if(m.type==='witch'){ctx.shadowColor='#a64dff';ctx.shadowBlur=22;ctx.fillStyle='#3c245d';ctx.beginPath();ctx.ellipse(0,0,23,25,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#141020';ctx.beginPath();ctx.moveTo(-24,-12);ctx.lineTo(0,-43);ctx.lineTo(23,-12);ctx.closePath();ctx.fill();ctx.fillStyle='#d2a0ff';ctx.fillRect(-12,-3,7,4);ctx.fillRect(5,-3,7,4);ctx.strokeStyle='#c58bff';ctx.beginPath();ctx.arc(0,10,8,.15,Math.PI-.15);ctx.stroke()}else if(m.type==='kraken'){ctx.shadowColor='#a64dff';ctx.shadowBlur=19;ctx.fillStyle='#57388b';ctx.beginPath();ctx.ellipse(0,-2,20,18,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#9d76dc';ctx.lineWidth=7;for(let i=0;i<6;i++){let s=i<3?-1:1,j=i%3;ctx.beginPath();ctx.moveTo(s*12,8);ctx.quadraticCurveTo(s*(25+j*2),14+j*5,s*(26+j*3),25+j*3);ctx.stroke()}ctx.fillStyle='#ff7a9d';ctx.beginPath();ctx.arc(-7,-5,4,0,Math.PI*2);ctx.arc(7,-5,4,0,Math.PI*2);ctx.fill()}else{ctx.shadowColor='#6cefff';ctx.shadowBlur=20;ctx.fillStyle='#b4faff';ctx.globalAlpha=.8;ctx.beginPath();ctx.moveTo(0,-25);ctx.quadraticCurveTo(24,-10,17,10);ctx.lineTo(8,19);ctx.lineTo(0,12);ctx.lineTo(-9,20);ctx.lineTo(-17,8);ctx.quadraticCurveTo(-24,-10,0,-25);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#123747';ctx.fillRect(-9,-7,5,5);ctx.fillRect(5,-7,5,5)}ctx.restore()}
function drawParticles(){particles=particles.filter(p=>p.life>0);for(let p of particles){ctx.globalAlpha=Math.min(p.life/25,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill();p.x+=p.vx;p.y+=p.vy;p.life--}ctx.globalAlpha=1}
function render(t){drawOcean(t);drawMapTrail(t);[{x:3,y:0},{x:1,y:3},{x:5,y:3},{x:6,y:6}].forEach(p=>drawPlanks(p.x,p.y));L.rocks.forEach(drawRock);L.monsters.forEach(m=>drawMonster(m,t));drawKey(t);drawSeal(t);drawChest(t);drawShip(t);drawParticles();requestAnimationFrame(render)}
function initAudio(){if(audio)return;let AC=window.AudioContext||window.webkitAudioContext;if(AC)audio=new AC()}
function sfx(type){if(!sound)return;initAudio();if(!audio)return;if(audio.state==='suspended')audio.resume();let now=audio.currentTime;function tone(f,d,v,w='sine',end){let o=audio.createOscillator(),g=audio.createGain();o.type=w;o.frequency.setValueAtTime(f,now);if(end)o.frequency.exponentialRampToValueAtTime(end,now+d);g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(v,now+.02);g.gain.exponentialRampToValueAtTime(.0001,now+d);o.connect(g);g.connect(audio.destination);o.start(now);o.stop(now+d+.02)}if(type==='splash'){tone(250,.12,.025,'sine',130);tone(520,.08,.009,'triangle',260)}if(type==='bump')tone(115,.22,.04,'triangle',65);if(type==='key'){tone(660,.18,.03);setTimeout(()=>sound&&tone(880,.25,.025),110)}if(type==='magic'){tone(440,.3,.025,'sine',660);setTimeout(()=>sound&&tone(780,.4,.02,'sine',1050),100)}if(type==='mystery')tone(190,.5,.025,'sawtooth',130);if(type==='warning')tone(320,.32,.035,'square',170);if(type==='fail'){tone(160,.7,.05,'sawtooth',48);setTimeout(()=>sound&&tone(90,.8,.04,'sine',45),160)}if(type==='win'){tone(523,.22,.035);setTimeout(()=>sound&&tone(659,.22,.035),130);setTimeout(()=>sound&&tone(784,.42,.04),260)}}
function startSeaAmbience(){if(!sound||seaAmbience)return;seaAmbience=true;oceanWaves.play().catch(()=>{seaAmbience=false;toast('Tap SFX On to start the ocean waves.');});}
function stopSeaAmbience(){oceanWaves.pause();oceanWaves.currentTime=0;seaAmbience=null}
function startMusic(){
 if(!music)return;
 // Play the bundled fantasy-orchestral soundtrack; browsers start it after the player's click.
 if(soundtrack.paused){soundtrack.play().catch(()=>{toast('Tap Music On to start the soundtrack.');});}
}
function stopMusic(){soundtrack.pause();soundtrack.currentTime=0;musicLayer=null}
function stopAmbience(){stopSeaAmbience();stopMusic()}
$('sound-btn').addEventListener('click',()=>{sound=!sound;$('sound-btn').setAttribute('aria-pressed',String(sound));$('sound-label').textContent=sound?'SFX On':'SFX Off';if(sound){initAudio();if(audio&&audio.state==='suspended')audio.resume();startSeaAmbience();sfx('magic');toast('Sound effects on!')}else{stopSeaAmbience();toast('Sound effects off.')}});
$('music-btn').addEventListener('click',()=>{music=!music;$('music-btn').setAttribute('aria-pressed',String(music));$('music-label').textContent=music?'Music On':'Music Off';if(music){initAudio();if(audio&&audio.state==='suspended')audio.resume();startMusic();playIntroBell();toast('Fantasy soundtrack on…')}else{stopMusic();toast('Music off. The sea is still yours.')}});
updateAttemptUI();renderCaptainHall();loadLevel(0,true);requestAnimationFrame(render);
