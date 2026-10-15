import {legalFor} from './strategy-games.js';
import {initSudoku} from './sudoku-ui.js';
const $=id=>document.getElementById(id);
const one=(selector,root=document)=>root.querySelector(selector);
const all=(selector,root=document)=>[...root.querySelectorAll(selector)];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const copy=value=>structuredClone(value);
const setText=(id,value)=>{const el=$(id);if(el)el.textContent=value;};
const GAME_DATA=[
 {id:'quan',name:'Ô Ăn Quan',emoji:'🪨',desc:'Nhặt sỏi, rải quân, ăn Quan — một ván cờ tuổi thơ.',color:'green',online:true},
 {id:'ganh',name:'Cờ Gánh',emoji:'♟️',desc:'Đi theo đường kẻ, gánh và vây quân đối thủ.',color:'ochre',online:true},
 {id:'caro',name:'Caro học trò',emoji:'✏️',desc:'Năm dấu liên tiếp, một lời hẹn trên trang giấy.',color:'paper',online:true},
 {id:'rps',name:'Oẳn tù tì',emoji:'✊',desc:'Hai người chọn kín rồi cùng lật. Ai thắng ba lượt?',color:'rose',online:true},
 {id:'sudoku',name:'Sudoku',emoji:'🔢',desc:'Giải ô số 9×9 · chơi một mình, có kiểm tra đáp án.',color:'paper',online:false,soloReady:true},
 {id:'chess',name:'Cờ vua',emoji:'♚',desc:'Cờ vua 8×8 · nhập thành, bắt tốt qua đường, phong hậu.',color:'green',online:true},
 {id:'xiangqi',name:'Cờ tướng',emoji:'帥',desc:'Bàn sông Hán 9×10 · pháo, mã, tượng và tướng.',color:'ochre',online:true},
 {id:'go',name:'Cờ vây',emoji:'⚫',desc:'Bàn 9×9 · bắt quân, tính khí, đi qua lượt và tính đất.',color:'rose',online:true},
 {id:'lo-co',name:'Nhảy lò cò',emoji:'🟫',desc:'Những ô gạch và tiếng cười sân trường.',color:'ochre',online:false},
 {id:'chuyen',name:'Chơi chuyền',emoji:'🪵',desc:'Khéo tay, nhanh mắt, từng nhịp tuổi thơ.',color:'green',online:false},
 {id:'banh-dua',name:'Banh đũa',emoji:'🥢',desc:'Nhịp tay và những chiếc que tre.',color:'paper',online:false},
 {id:'do-vui',name:'Đố vui dân gian',emoji:'📜',desc:'Những câu đố của ông bà để lại.',color:'rose',online:false},
 {id:'bit-mat',name:'Bịt mắt bắt dê',emoji:'🐐',desc:'Gọi nhau í ới khắp sân đình.',color:'green',online:false},
 {id:'rong-ran',name:'Rồng rắn lên mây',emoji:'🐉',desc:'Chạy thành hàng dài qua ký ức.',color:'ochre',online:false}
];
const GAME_BY_ID=Object.fromEntries(GAME_DATA.map(g=>[g.id,g]));
const SESSION_KEY='sandinh-v3-room';
const bgm=$('music');bgm.volume=Number(localStorage.getItem('sandinh-bgm-volume')||.28);let bgmOn=localStorage.getItem('sandinh-music')==='on';
$('music-toggle').onclick=async()=>{bgmOn=!bgmOn;sound=bgmOn;localStorage.setItem('sandinh-music',bgmOn?'on':'off');localStorage.setItem('sandinh-sound',bgmOn?'on':'off');try{if(bgmOn)await bgm.play();else bgm.pause();}catch{bgmOn=false;sound=false;toast('Trình duyệt chưa cho phép phát nhạc · thử lại sau khi chạm trang');} $('music-toggle').textContent=bgmOn?'🔊':'🔇';$('music-toggle').setAttribute('aria-pressed',String(bgmOn));};
document.addEventListener('pointerdown',()=>{if(bgmOn&&bgm.paused)bgm.play().catch(()=>{});},{once:true});

let nickname=localStorage.getItem('sandinh-name')||'Người bạn sân đình';
const session={room:'',seat:null,token:'',gameId:null,match:null,visual:null,connected:[false,false],players:[{name:'Người chơi 1'},{name:'Người chơi 2'}],rematch:[false,false],socket:null,retry:null,intentional:false,selected:null,busy:false,graphics:null,three:false,events:new Map(),playback:false,pending:[],lastGame:null,history:[],votes:[null,null],settings:{difficulty:'medium',board:'classic',light:'twilight',turnSeconds:0},solo:false};
const pitNodes=new Map();let currentView='home';let toastTimer=null,animGeneration=0;
const reduceMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
let sound=bgmOn,audioCtx=null;
function beep(freq=550,volume=.02,duration=.12){if(!sound)return;try{audioCtx??=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();const osc=audioCtx.createOscillator(),gain=audioCtx.createGain(),at=audioCtx.currentTime;osc.type='sine';osc.frequency.setValueAtTime(freq,at);osc.frequency.exponentialRampToValueAtTime(Math.max(90,freq/2),at+duration);gain.gain.setValueAtTime(volume,at);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);osc.connect(gain).connect(audioCtx.destination);osc.start(at);osc.stop(at+duration);}catch{}}
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3400);}
$('music-toggle').textContent=bgmOn?'🔊':'🔇';$('music-toggle').setAttribute('aria-pressed',String(bgmOn));

function view(which){
 currentView=which;
 all('.view').forEach(el=>el.classList.toggle('active',el.dataset.viewPage===which));
 all('[data-view]').forEach(el=>el.classList.toggle('active',el.dataset.view===which));
 history.replaceState(null,'',location.pathname+location.search+'#'+which);
 window.scrollTo({top:0,behavior:'instant'});
 if(which==='lobby')renderLobby();
 if(which==='play')renderPlay();
 if(which==='profile')renderProfileStats();
 updateMobileHelpers();
}
document.addEventListener('click',event=>{const btn=event.target.closest('[data-view]');if(btn)view(btn.dataset.view);});
function gameCard(g){return `<article class="game-card"><div class="card-art ${g.color}"><span class="card-status ${g.online?'':'soon'}">${g.online?'● CHƠI ONLINE':g.soloReady?'● CHƠI SOLO':'SẮP RA MẮT'}</span><span class="card-icon">${g.emoji}</span></div><div class="card-body"><h3>${g.name}</h3><p>${g.desc}</p><div class="card-footer"><small>${g.online?'♧ 2 người · Một mã phòng':g.soloReady?'✧ Chơi offline':'✧ Đang phát triển'}</small><button data-pick="${g.id}" ${g.online||g.soloReady?'':'disabled'}>${g.online||g.soloReady?'Chơi ngay →':'Chưa mở'}</button></div></div></article>`;}
function renderCards(filter='all'){
 $('featured-games').innerHTML=GAME_DATA.filter(g=>g.online).map(gameCard).join('');
 $('all-games').innerHTML=GAME_DATA.filter(g=>filter==='all'||(filter==='online'&&g.online)||(filter==='soon'&&!g.online)).map(gameCard).join('');
}
renderCards();
all('[data-filter]').forEach(b=>b.onclick=()=>{all('[data-filter]').forEach(c=>c.classList.toggle('active',c===b));renderCards(b.dataset.filter);});
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-pick]');if(!button)return;
 const id=button.dataset.pick;
 if(GAME_BY_ID[id]?.soloReady){openSudoku();return;} if(!GAME_BY_ID[id]?.online)return;
 if(session.room){selectGame(id);view('lobby');}
 else{view('lobby');toast('Tạo phòng hoặc nhập mã trước, sau đó chọn trò nhé!');}
});
$('home-create').onclick=()=>{if(session.room){view('lobby');return;}createRoom();};

function send(payload){const ws=session.socket;if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify(payload));return true;}toast('Chưa kết nối máy chủ. Vui lòng đợi một chút.');return false;}
function storeSession(){if(session.room&&session.token)localStorage.setItem(SESSION_KEY,JSON.stringify({room:session.room,token:session.token}));}
function connect(intent,automatic=false){
 if(session.socket?.readyState===WebSocket.OPEN){send(intent);return;}
 if(session.socket?.readyState===WebSocket.CONNECTING)return;
 session.intentional=false;
 const socket=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host);
 session.socket=socket;
 socket.onopen=()=>{clearTimeout(session.retry);socket.send(JSON.stringify(intent));};
 socket.onmessage=e=>{
  let m;try{m=JSON.parse(e.data);}catch{return;}
  if(m.type==='error'){
   toast(m.message);session.busy=false;
   if(automatic||m.message.includes('Phòng không tồn tại')||m.message.includes('Phiên kết nối không hợp lệ')){forgetRoom();session.intentional=true;socket.close();view('lobby');}
   else renderPlay();return;
  }
  if(m.type==='left')return;
  if(m.type==='replay'){openReplay(m.frames);return;}
  if(m.type==='reaction'){showReaction(m.emoji,m.seat);return;}
  if(m.type==='animation'){
   if(m.gameId==='quan')session.events.set(m.gameId+':'+m.seq,m.events);
   return;
  }
  if(m.type==='state')queueState(m);
 };
 socket.onclose=()=>{
  if(socket!==session.socket)return;
  session.connected=[false,false];session.busy=false;renderLobby();renderPlay();
  if(!session.intentional&&session.room&&session.token){
   toast('Mất kết nối, đang nối lại phòng…');clearTimeout(session.retry);
   session.retry=setTimeout(()=>connect({type:'resume',code:session.room,token:session.token},true),2100);
  }else if(!session.intentional)toast('Không kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại.');
 };
 socket.onerror=()=>{};
}
function forgetRoom(){session.room='';session.token='';session.seat=null;session.gameId=null;session.match=null;session.visual=null;session.connected=[false,false];session.rematch=[false,false];session.busy=false;session.selected=null;session.events.clear();session.pending.length=0;session.history=[];session.votes=[null,null];session.solo=false;animGeneration++;localStorage.removeItem(SESSION_KEY);}
function createRoom(){if(session.room){view('lobby');return;}view('lobby');connect({type:'create',name:nickname});}
function joinRoom(code){
 code=String(code||'').trim().toUpperCase();
 if(!/^[A-F0-9]{6}$/.test(code)){toast('Mã phòng gồm 6 ký tự chữ/số');return;}
 if(session.room){if(session.room===code){view('lobby');return;}toast('Bạn cần rời phòng hiện tại trước khi vào phòng khác');return;}
 view('lobby');connect({type:'join',code,name:nickname});
}
$('create-room').onclick=createRoom;
$('solo-create').onclick=()=>{if(session.room){toast('Hãy rời phòng cũ trước nhé');return;}view('lobby');connect({type:'create',solo:true,name:nickname});};
$('join-room').onclick=() => joinRoom($('join-code').value);
$('join-code').addEventListener('keydown',e=>{if(e.key==='Enter')joinRoom($('join-code').value);});
$('leave-room').onclick=()=>{
 if(!confirm('Bạn muốn rời phòng? Nếu có bạn đang chơi cùng, họ sẽ thấy bạn đã rời.'))return;
 send({type:'leave'});session.intentional=true;session.socket?.close();session.socket=null;forgetRoom();view('lobby');toast('Đã rời phòng.');
};
function selectGame(id){if(!session.room){view('lobby');return;}send({type:'vote_game',gameId:id});toast('Đã bỏ phiếu '+(GAME_BY_ID[id]?.name||id)+' · chờ người còn lại đồng ý');}
$('back-to-lobby').onclick=()=>{view('lobby');};
$('play-history').onclick=()=>view('lobby');
async function copyInvite(){if(session.solo){toast('Đây là phòng luyện tập với máy, không thể mời thêm người');return;}const url=`${location.origin}/?room=${encodeURIComponent(session.room)}#lobby`;try{await navigator.clipboard.writeText(url);toast('Đã sao chép link mời!');}catch{toast('Mã phòng: '+session.room);}}
$('share-room').onclick=$('play-copy-link').onclick=copyInvite;
$('header-room').onclick=()=>view('lobby');
function renderHistory(){
 const host=$('room-history');if(!host)return;
 if(!session.history.length){host.innerHTML='<p class="history-empty">Chưa có ván nào được ghi lại trong phòng này. Hoàn thành một ván để lưu kỷ niệm nhé.</p>';return;}
 host.replaceChildren(...session.history.map(h=>{
 const item=document.createElement('article');item.className='history-row';item.tabIndex=0;item.title='Chọn để xem lại ván đấu';item.onclick=()=>send({type:'replay',id:h.id});item.onkeydown=e=>{if(e.key==='Enter')item.click();};
 const icon=document.createElement('span');icon.className='history-icon';icon.textContent=GAME_BY_ID[h.gameId]?.emoji||'🏮';
 const desc=document.createElement('div');const title=document.createElement('b');title.textContent=h.gameName;
 const detail=document.createElement('small');detail.textContent=new Date(h.at).toLocaleString('vi-VN')+' · '+(h.reason==='finished'?(h.winner==='draw'?'Hòa':h.winner===null?'Kết thúc':'Thắng: '+(h.players[h.winner]||'Người chơi')):'Đã đổi trò / rời phòng')+' · '+h.turns+' lượt';
 desc.append(title,detail);const score=document.createElement('strong');score.textContent=h.score?h.score.join(' : '):'✦';item.append(icon,desc,score);return item;
 }));
}
$('history-export').onclick=()=>{
 if(!session.history.length){toast('Chưa có lịch sử để xuất');return;}
 const blob=new Blob([JSON.stringify({room:session.room,history:session.history},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='lich-su-san-dinh-'+session.room+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
function renderLobby(){
 const online=!!session.room;
 $('lobby-entry').hidden=online;$('lobby-connected').hidden=!online;$('header-room').hidden=!online;
 if(!online)return;
 $('header-room').textContent='♧ '+session.room;
 setText('hub-room-code',session.room);setText('hub-presence',session.connected.every(Boolean)?(session.solo?'🤖 Bạn đang luyện tập cùng máy':'✦ Hai người đã vào sân · Sẵn sàng chơi'):'○ Đang chờ người còn lại vào phòng…');
 for(let i=0;i<2;i++){
  const el=$('member-'+i);el.classList.toggle('ready',!!session.connected[i]);
  one('b',el).textContent=session.players[i]?.name||`Người chơi ${i+1}`;
  one('span:not(.member-avatar)',el).textContent=session.connected[i]?'● Đã vào sân':'○ Đang chờ kết nối';
 }
 $('host-hint').textContent='Mỗi người một phiếu · trùng nhau để bắt đầu';
 renderHistory();
 $('vote-message').textContent=session.solo?'Chọn trò để luyện tập với máy.':session.votes?.every(Boolean)?'Hai phiếu chưa trùng nhau — hãy cùng chọn một trò.':`Phiếu chọn: ${session.votes?.map((x,i)=>x?(session.players[i]?.name||'Người chơi')+' → '+(GAME_BY_ID[x]?.name||x):'Đang chờ').join(' · ')}`;
 for(const [id,key] of [['bot-level','difficulty'],['board-style','board'],['light-style','light'],['turn-seconds','turnSeconds']]){$(id).value=String(session.settings[key]);$(id).disabled=session.seat!==0;} $('save-settings').disabled=session.seat!==0;
 document.documentElement.dataset.board=session.settings.board;document.documentElement.dataset.light=session.settings.light;
 $('room-game-picker').innerHTML=GAME_DATA.filter(g=>g.online).map(g=>`<button class="room-pick" data-room-game="${g.id}" ><span class="icon">${g.emoji}</span><span><b>${g.name}</b><small>${session.gameId===g.id?'● ĐANG CHƠI':session.votes?.includes(g.id)?'✓ Đã có phiếu':'Bình chọn' }</small></span></button>`).join('');
}
$('room-game-picker').addEventListener('click',e=>{const btn=e.target.closest('[data-room-game]');if(btn)selectGame(btn.dataset.roomGame);});

async function queueState(m){
 session.pending.push(m);
 if(session.playback)return;
 session.playback=true;
 try{while(session.pending.length)await applyState(session.pending.shift());}
 finally{session.playback=false;}
}
async function applyState(m){
 const oldId=session.gameId,previous=session.visual;
 session.room=m.room;session.token=m.token;session.seat=m.seat;session.connected=m.connected;session.players=m.players;session.rematch=m.rematch;session.gameId=m.gameId;session.match=m.state;session.history=m.history||[];session.votes=m.votes||[null,null];session.settings=m.settings||session.settings;session.solo=!!m.solo;storeSession();
 const switched=oldId!==m.gameId;
 if(switched){animGeneration++;session.selected=null;session.busy=false;session.visual=null;session.events.clear();exit3d();}
 if(!m.gameId){session.visual=null;session.selected=null;renderLobby();view('lobby');return;}
 if(switched || (currentView!=='play' && !session.busy))view('play');
 if(!m.state){renderPlay();return;}
 const events=session.events.get(m.gameId+':'+m.state.seq);session.events.delete(m.gameId+':'+m.state.seq);
 if(m.gameId==='quan' && previous && previous.seq!==m.state.seq && events && !switched){
  const generation=++animGeneration;session.busy=true;session.selected=null;
  session.visual=copy(previous);renderPlay();
  await animateQuan(events,generation);
  if(generation!==animGeneration)return;
 }
 session.visual=copy(m.state);session.busy=false;
 if(session.selected!==null&&!canMakeMove())session.selected=null;
 renderLobby();renderPlay();
 if(previous && previous.seq!==m.state.seq && !switched && m.gameId!=='quan')animateOtherGame(m.gameId,m.state);
 if(m.state.status==='finished' && (switched || !previous || previous.status!=='finished')){
  beep(840,.042,.27);toast(m.state.winner==='draw'?'Hai bạn hòa nhau!':m.state.winner===session.seat?'✦ Bạn thắng rồi!':'Đối thủ đã giành chiến thắng.');
 }
}
function animateOtherGame(gameId,state){
 if(reduceMotion()||currentView!=='play')return;
 const root=$('play-surface');
 if(gameId==='caro'){
  const target=root.querySelectorAll('.caro-cell')[state.last];
  target?.animate([{transform:'scale(.4) rotate(-12deg)',opacity:.4},{transform:'scale(1.18)',opacity:1},{transform:'scale(1)'}],{duration:340,easing:'ease-out'});beep(640,.026,.14);
 }
 if(gameId==='ganh'){
  const target=root.querySelectorAll('[data-ganh]')[state.last?.to]||root.querySelector('.last');
  target?.animate([{filter:'brightness(2)',transform:'scale(.65)'},{filter:'brightness(1.3)',transform:'scale(1.18)'},{filter:'brightness(1)',transform:'scale(1)'}],{duration:430,easing:'ease-out'});beep(410,.026,.18);
 }
 if(['chess','xiangqi','go'].includes(gameId)){const target=root.querySelector('.last');target?.animate([{transform:'scale(.45) translateY(-10px)',opacity:.2},{transform:'scale(1.1)',opacity:1},{transform:'scale(1)',opacity:1}],{duration:360,easing:'cubic-bezier(.2,.8,.2,1)'});beep(460,.025,.14);}
 if(gameId==='rps'){
  all('.rps-hands span',root).forEach((el,i)=>el.animate([{transform:'translateY(18px) rotate(-13deg)',opacity:.3},{transform:'translateY(-12px) rotate(10deg)',opacity:1},{transform:'translateY(0) rotate(0)'}],{duration:490+i*70,easing:'cubic-bezier(.2,.7,.2,1)'}));
 }
}
function canMakeMove(){return !!session.match&&session.match.status==='playing'&&session.connected.every(Boolean)&&!session.busy&&session.seat===session.match.turn;}
function move(payload){if(!session.gameId||!session.match)return;if(!session.connected.every(Boolean)){toast('Đợi bạn cùng chơi kết nối lại nhé');return;}if(session.busy)return;
 if(send({type:'move',seq:session.match.seq,...payload})){session.busy=true;renderPlay();}
}
function playerScore(seat){
 if(!session.match)return '—';
 if(session.gameId==='quan')return (session.match.score[seat]-session.match.borrow[seat])+' điểm';
 if(session.gameId==='rps')return session.match.scores[seat]+' / 3';
 if(session.gameId==='ganh')return session.match.cells.filter(x=>x===seat).length+' quân';
 if(session.gameId==='caro')return seat===0?'X':'O';
 if(session.gameId==='go')return session.match.score?session.match.score[seat]+' điểm':(session.match.board.filter(x=>x===seat).length)+' quân';
 if(session.gameId==='chess')return seat===0?'♔ Trắng':'♚ Đen';
 if(session.gameId==='xiangqi')return seat===0?'🔴 Đỏ':'⚫ Đen';
 return '—';
}
function updateBanner(){
 const state=session.match,el=$('turn-banner');el.className='turn-banner idle';
 if(!state){setText('turn-title','Đang chờ chọn trò');setText('turn-description','Trở về phòng để chọn một trò nhé');return;}
 let title='',desc='',style='idle';
 if(!session.connected.every(Boolean)){title='ĐANG CHỜ BẠN CÙNG CHƠI';desc='Trận tạm dừng để chờ hai người kết nối.';}
 else if(state.status==='finished'){
  title=state.winner==='draw'?'HAI BẠN HÒA NHAU!':state.winner===session.seat?'✦ BẠN ĐÃ CHIẾN THẮNG!':'VÁN ĐẤU KẾT THÚC';
  desc='Chọn chơi lại hoặc trở về phòng để đổi trò.';style='finished';
 }else if(session.busy){title='ĐANG CHUYỂN QUÂN…';desc='Hãy chờ hoạt ảnh hoàn tất để tiếp tục.';}
 else if(session.gameId==='rps'){
  if(state.yourChoice!==null){title='ĐÃ KHÓA LỰA CHỌN ✓';desc='Chờ đối thủ chọn tay, sau đó hai bên cùng lật.';style='theirs';}
  else{title='✦ ĐẾN LƯỢT BẠN CHỌN TAY!';desc='Búa, Bao hay Kéo? Đối thủ không thấy lựa chọn trước khi lật.';style='mine';}
 }else if(state.turn===session.seat){title='✦ ĐẾN LƯỢT BẠN!';desc= session.gameId==='quan'?'Các ô quân của bạn đang phát sáng — chạm một ô để rải.':session.gameId==='ganh'?'Chọn quân sáng rồi chọn điểm đến.':'Chạm vào một ô trống để đánh dấu.';style='mine';}
 else{title='ĐỐI THỦ ĐANG ĐI QUÂN';desc='Chờ một chút nhé, chuẩn bị nước đi tiếp theo!';style='theirs';}
 el.classList.add(style);setText('turn-title',title);setText('turn-description',desc);setText('turn-symbol',style==='mine'?'✦':style==='theirs'?'◷':style==='finished'?'🏆':'◈');
}
function renderPlay(){
 if(currentView!=='play'||!session.gameId||!session.match)return;
 const gd=GAME_BY_ID[session.gameId];
 setText('active-game-name',gd.name);setText('game-category','MỘT MÃ PHÒNG · NHIỀU TRÒ CÙNG CHƠI');setText('play-room-code',session.room);
 const mine=session.seat,opp=1-mine;
 $('my-card').classList.toggle('active',session.match.status==='playing'&&session.match.turn===mine&&session.connected.every(Boolean));
 $('opponent-card').classList.toggle('active',session.match.status==='playing'&&session.match.turn===opp&&session.connected.every(Boolean));
 setText('my-name',session.players[mine]?.name||'Bạn');setText('opponent-name',session.players[opp]?.name||'Bạn cùng chơi');
 setText('my-score',playerScore(mine));setText('opponent-score',playerScore(opp));
 one('.player-icon',$('my-card')).textContent=mine===0?'01':'02';one('.player-icon',$('opponent-card')).textContent=opp===0?'01':'02';
 setText('board-hint',session.gameId==='quan'?'↻ Mỗi người nhìn bàn từ phía của mình. Con số trong ô là số quân thực tế.':session.gameId==='ganh'?'Các quân sáng là quân của bạn. Chạm quân rồi chọn giao điểm sáng.':session.gameId==='caro'?'Đánh lần lượt X rồi O · Nối năm dấu để thắng.':session.gameId==='go'?'⚫ Đen đi trước · 2 lượt qua liên tiếp sẽ tính đất · Trắng +5.5 komi.':session.gameId==='chess'?'♔ Quân trắng đi trước · chọn quân rồi chạm chấm sáng.':session.gameId==='xiangqi'?'帥 Quân đỏ đi trước · không được để tướng bị chiếu.':'Mỗi người chọn bí mật, cùng lật khi đã chọn xong.');
 updateBanner();
 $('three-toggle').hidden=session.gameId!=='quan';
 if(session.gameId==='quan')renderQuan();
 else if(['chess','xiangqi','go'].includes(session.gameId))renderStrategy();
 else if(session.gameId==='ganh')renderGanh();
 else if(session.gameId==='caro')renderCaro();
 else if(session.gameId==='rps')renderRps();
 renderActions();
 updateMobileHelpers();
}

const coords=[[30,35],[60,42],[45,65],[65,67],[26,67],[48,45],[49,35],[79,56],[30,49],[69,27],[45,18]];
function makePit(idx){const btn=document.createElement('button');btn.className='pit'+([5,11].includes(idx)?' quan-pit':'');btn.type='button';btn.dataset.pit=idx;btn.innerHTML='<span class="pit-core"><span class="stones"></span><span class="pit-num"></span><span class="pit-name"></span></span>';pitNodes.set(idx,btn);return btn;}
function setupQuan(){
 pitNodes.clear();const wrapper=document.createElement('div');wrapper.className='oaq-board';wrapper.id='oaq-board';wrapper.innerHTML='<div class="oaq-rows"><div class="pit-row" id="upper-row"></div><div class="pit-row" id="lower-row"></div></div><span class="board-center">✿ TUỔI THƠ ✿</span><div class="stone-flight" id="stone-flight"></div>';
 $('play-surface').replaceChildren(wrapper);
 for(const i of [10,9,8,7,6])$('upper-row').append(makePit(i));
 for(const i of [0,1,2,3,4])$('lower-row').append(makePit(i));
 const left=makePit(11),right=makePit(5);left.classList.add('left');right.classList.add('right');wrapper.append(left,right);
 wrapper.addEventListener('click',e=>{const pit=e.target.closest('[data-pit]');if(pit)selectQuan(+pit.dataset.pit);});
}
function quanLegal(i){if(!canMakeMove())return false;const own=session.seat===0?i>=0&&i<5:i>=6&&i<11;return own&&session.match.cells[i].n>0;}
function drawQuanPit(i){
 const node=pitNodes.get(i),cell=session.visual?.cells[i];if(!node||!cell)return;
 const valid=quanLegal(i),mandarin=i===5||i===11;
 node.classList.toggle('legal',!!valid);node.classList.toggle('chosen',session.selected===i);
 const stones=one('.stones',node);stones.replaceChildren();
 const visible=Math.min(cell.n,8);
 for(let k=0;k<visible;k++){
  const o=document.createElement('i');o.className='stone';const [x,y]=coords[(k+i*3)%coords.length];o.style.left=x+'%';o.style.top=y+'%';o.style.setProperty('--a',((i*29+k*41)%130-65)+'deg');stones.append(o);
 }
 if(cell.q){const o=document.createElement('i');o.className='stone';o.style.left='50%';o.style.top='49%';o.style.width='35%';o.style.height='33%';stones.append(o);}
 one('.pit-num',node).textContent=mandarin?(cell.q?'♛ '+cell.q:String(cell.n)):String(cell.n);
 one('.pit-name',node).textContent=mandarin?'QUAN':'DÂN';
 node.setAttribute('aria-label',mandarin?`Ô Quan: ${cell.q} quan, ${cell.n} quân dân`:`Ô Dân có ${cell.n} quân${valid?', có thể chọn':''}`);
}
function renderQuan(){
 if(!session.visual||!Array.isArray(session.visual.cells))session.visual=copy(session.match);
 if(!pitNodes.size || !one('#oaq-board') && !session.three)setupQuan();
 const board=$('oaq-board');if(board)board.classList.toggle('rotated',session.seat===1);
 if(session.three){session.graphics?.setState(session.visual.cells,session.selected,session.seat,quanLegal);return;}
 for(let i=0;i<12;i++)drawQuanPit(i);
}
function selectQuan(idx){
 if(!canMakeMove()){toast('Chưa đến lượt bạn hoặc đang chờ người cùng chơi.');return;}
 if(!quanLegal(idx)){toast('Chỉ chọn ô Dân còn sỏi ở phía của bạn');return;}
 session.selected=session.selected===idx?null:idx;beep();renderPlay();
}
function quanMove(dir){if(session.selected===null)return;const pit=session.selected;session.selected=null;move({pit,dir});}

function ganhNeighbors(idx){const r=Math.floor(idx/5),c=idx%5,steps=[[1,0],[-1,0],[0,1],[0,-1]];if((r+c)%2===0)steps.push([1,1],[1,-1],[-1,1],[-1,-1]);return steps.map(([dr,dc])=>[r+dr,c+dc]).filter(([rr,cc])=>rr>=0&&rr<5&&cc>=0&&cc<5).map(([rr,cc])=>rr*5+cc);}
function renderGanh(){
 if(!session.visual||!Array.isArray(session.visual.cells))session.visual=copy(session.match);
 const state=session.visual;const shell=document.createElement('div');shell.className='ganh-shell'+(session.seat===1?' rotated':'');
 const board=document.createElement('div');board.className='ganh-board';
 let lines='';for(let i=0;i<25;i++){const r=Math.floor(i/5),c=i%5;for(const j of ganhNeighbors(i).filter(x=>x>i)){const rr=Math.floor(j/5),cc=j%5;lines+=`<line x1="${40+c*80}" y1="${40+r*80}" x2="${40+cc*80}" y2="${40+rr*80}" stroke="#725b41" stroke-width="2.5"/>`;}}
 board.innerHTML=`<svg class="ganh-lines" viewBox="0 0 400 400" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>`;
 const targets=session.selected!==null&&canMakeMove()?ganhNeighbors(session.selected).filter(i=>state.cells[i]===null):[];
 state.cells.forEach((owner,i)=>{
  const el=document.createElement('button');el.type='button';el.className='ganh-point'+(session.selected===i?' selected':'')+(targets.includes(i)?' can-move':'');el.style.left=(10+i%5*20)+'%';el.style.top=(10+Math.floor(i/5)*20)+'%';
  const piece=owner===null?'':`<span class="ganh-piece ${owner===session.seat?'':'enemy'}">${owner===0?'✦':'✿'}</span>`;
  el.innerHTML=piece;el.setAttribute('aria-label',`Hàng ${Math.floor(i/5)+1} cột ${i%5+1}: ${owner===null?'Trống':owner===session.seat?'Quân của bạn':'Quân đối thủ'}`);el.onclick=()=>{
   if(!canMakeMove()){toast('Chờ đến lượt mình nhé');return;}
   if(session.selected!==null&&targets.includes(i)){const from=session.selected;session.selected=null;move({from,to:i});return;}
   if(state.cells[i]===session.seat){session.selected=session.selected===i?null:i;beep();renderPlay();}
   else toast('Chọn quân của bạn rồi chọn một điểm sáng để đi');
  };board.append(el);
 });shell.append(board);$('play-surface').replaceChildren(shell);
}
function renderCaro(){
 const state=session.match;
 const board=document.createElement('div');board.className='caro-shell';const grid=document.createElement('div');grid.className='caro-grid';
 state.cells.forEach((piece,idx)=>{
  const el=document.createElement('button');el.type='button';el.className='caro-cell'+(piece===1?' o':'')+(state.last===idx?' last':'')+(state.winning.includes(idx)?' win':'');
  el.textContent=piece===0?'X':piece===1?'O':'';
  el.disabled=piece!==null||!canMakeMove();
  el.setAttribute('aria-label',`Hàng ${Math.floor(idx/10)+1}, cột ${idx%10+1}: ${piece===null?'trống':piece===0?'X':'O'}`);
  el.onclick=()=>{move({idx});beep(610,.025);};grid.append(el);
 });board.append(grid);$('play-surface').replaceChildren(board);
}
const hands=['✊','✋','✌️'];
function renderRps(){
 const state=session.match;
 const div=document.createElement('div');div.className='rps-stage';
 const reveal=state.reveal;
 const mine=reveal?hands[reveal.choices[session.seat]]:'❔',them=reveal?hands[reveal.choices[1-session.seat]]:'❔';
 const chosen=state.yourChoice;
 div.innerHTML=`<h2>${reveal?reveal.winner===null?'Hai bên hòa!':reveal.winner===session.seat?'Bạn thắng lượt này!':'Đối thủ thắng lượt này':'Ván '+state.round+' · Cùng ra tay!'}</h2><div class="rps-hands"><span>${mine}</span><b>VS</b><span>${them}</span></div><p>${chosen===null?'Chọn tay của mình; đối phương không xem trước được.':'✓ Bạn đã khóa tay. Đợi bạn bên kia nhé.'}</p><div class="rps-choices" id="rps-choices"></div>`;
 const row=one('#rps-choices',div);
 hands.forEach((h,i)=>{const b=document.createElement('button');b.textContent=h;b.type='button';b.title=['Búa','Bao','Kéo'][i];b.disabled=!session.connected.every(Boolean)||state.status==='finished'||chosen!==null||session.busy;b.onclick=()=>{move({choice:i});beep(720);};row.append(b);});
 $('play-surface').replaceChildren(div);
}
const CHESS_SYMBOLS={K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙',k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'};
const XIANGQI_SYMBOLS={K:'帥',A:'仕',E:'相',H:'傌',R:'俥',C:'炮',P:'兵',k:'將',a:'士',e:'象',h:'馬',r:'車',c:'砲',p:'卒'};
function renderStrategy(){
 const id=session.gameId,state=session.match,board=state.board,cols=id==='xiangqi'?9:id==='chess'?8:9;
 const can=canMakeMove();const moves=can&&session.selected!==null&&id!=='go'?legalFor(id,state,session.seat).filter(m=>m.from===session.selected):[];
 const targets=new Set(moves.map(m=>m.to));const shell=document.createElement('div');shell.className='strategy-shell '+id;
 const grid=document.createElement('div');grid.className='strategy-grid '+id;grid.style.setProperty('--cols',cols);
 const order=Array.from({length:board.length},(_,i)=>session.seat===1?board.length-i-1:i);
 for(const idx of order){const p=board[idx],cell=document.createElement('button');cell.type='button';cell.className='strategy-cell';cell.dataset.idx=idx;
  const isMine=p!==null&&p!==undefined&&(id==='go'?p===session.seat:(session.seat===0?p===p.toUpperCase():p===p.toLowerCase()));
  if(p!==null&&p!==undefined){cell.classList.add('occupied');cell.classList.add((id==='go'?p===0:(p===p.toUpperCase()))?'white-piece':'black-piece');}
  if(id==='chess'&&(Math.floor(idx/8)+idx%8)%2===1)cell.classList.add('dark-square');
  if(session.selected===idx)cell.classList.add('selected');if(targets.has(idx))cell.classList.add('legal-target');
  if(state.last?.to===idx||state.last?.idx===idx)cell.classList.add('last');
  if(id==='go'&&p!==null)cell.innerHTML='<span class="go-stone '+(p===0?'black':'white')+'"></span>';
  else if(id==='chess')cell.innerHTML='<span class="chess-piece">'+(CHESS_SYMBOLS[p]||'')+'</span>';
  else if(id==='xiangqi')cell.innerHTML='<span class="xiangqi-piece">'+(XIANGQI_SYMBOLS[p]||'')+'</span>';
  cell.setAttribute('aria-label',`Hàng ${Math.floor(idx/cols)+1}, cột ${idx%cols+1}: ${p===null?'trống':'có quân'}`);
  cell.onclick=()=>{
   if(!can){toast('Hãy chờ đến lượt bạn nhé');return;}
   if(id==='go'){if(p!==null){toast('Giao điểm đã có quân');return;}move({idx});return;}
   if(session.selected!==null&&targets.has(idx)){const from=session.selected;session.selected=null;move({from,to:idx});return;}
   if(isMine){session.selected=session.selected===idx?null:idx;beep(500,.01,.09);renderPlay();}
   else toast('Chạm một quân của bạn, rồi chọn ô có chấm sáng');
  };
  grid.append(cell);
 }
 shell.append(grid);$('play-surface').replaceChildren(shell);
}
function renderActions(){
 const area=$('action-controls'),state=session.match,id=session.gameId;
 area.replaceChildren();
 if(!state)return;
 if(state.status==='finished'){
  setText('action-title','Một ván nữa nhé?');setText('action-description','Hai người cùng chọn chơi lại để bắt đầu ván mới. Hoặc chủ phòng có thể đổi trò.');
  const b=document.createElement('button');b.className='btn primary wide';b.textContent=session.rematch[session.seat]?'✓ Đã đồng ý • chờ bạn':session.solo?'↻ Thử lại với máy':'↻ Chơi lại cùng bạn';b.disabled=!!session.rematch[session.seat];b.onclick=()=>send({type:'rematch'});area.append(b);
  const c=document.createElement('button');c.className='btn outline wide';c.textContent='♧ Trở về phòng · Chọn trò khác';c.onclick=()=>view('lobby');area.append(c);return;
 }
 if(id==='quan'){
  const selected=session.selected,amount=selected===null?'':session.match.cells[selected]?.n||0;
  setText('action-title',selected===null?'Chọn ô để rải quân':'Đã chọn '+amount+' quân');
  setText('action-description',selected===null?'Chọn một ô sáng ở hàng dưới cùng (phía bạn). Số quân luôn hiện trên ô.':'Hai nút trái / phải luôn theo hướng nhìn của bạn, dù bạn là người 1 hay người 2.');
  if(selected!==null){const label=document.createElement('div');label.className='chosen-info';label.textContent=`✦ Ô đang chọn · ${amount} viên sỏi`;area.append(label);}
  const buttons=document.createElement('div');buttons.className='direction-row';
  for(const [dir,sign,label] of [[-1,'←','Rải sang trái'],[1,'→','Rải sang phải']]){
   const btn=document.createElement('button');btn.className='direction';btn.innerHTML=`<span>${sign}</span>${label}`;btn.disabled=selected===null||!canMakeMove();btn.onclick=()=>quanMove(dir);buttons.append(btn);
  }area.append(buttons);
  const cancel=document.createElement('button');cancel.className='small-btn';cancel.textContent='Hủy chọn';cancel.disabled=selected===null;cancel.onclick=()=>{session.selected=null;renderPlay();};area.append(cancel);
 }else if(id==='ganh'){
  setText('action-title',session.selected===null?'Chọn một quân của bạn':'Chọn điểm đến');
  setText('action-description',session.selected===null?'Chạm quân sáng để xem các điểm có thể đi.':'Chạm một vòng sáng liền kề để di chuyển. Quân đối thủ bị gánh/vây sẽ đổi màu.');
  const btn=document.createElement('button');btn.className='btn outline wide';btn.textContent='✕ Bỏ chọn quân';btn.disabled=session.selected===null;btn.onclick=()=>{session.selected=null;renderPlay();};area.append(btn);
 }else if(['chess','xiangqi','go'].includes(id)){
  setText('action-title',id==='go'?'Đặt quân lên giao điểm':session.selected===null?'Chọn quân của bạn':'Chọn điểm đến');
  setText('action-description',id==='go'?'Đen đi trước. Hai lượt Qua liên tiếp sẽ tính điểm diện tích (Trắng +5.5).':'Chấm sáng chỉ các nước hợp lệ. Góc nhìn xoay theo người chơi.');
  if(id==='go'){const b=document.createElement('button');b.className='btn outline wide';b.textContent='↷ Qua lượt (Pass)';b.disabled=!canMakeMove();b.onclick=()=>move({pass:true});area.append(b);}
  else{const b=document.createElement('button');b.className='btn outline wide';b.textContent='✕ Bỏ chọn quân';b.disabled=session.selected===null;b.onclick=()=>{session.selected=null;renderPlay();};area.append(b);}
 }else if(id==='caro'){
  setText('action-title',canMakeMove()?'Đặt '+(session.seat===0?'X':'O'):'Chờ đối thủ đi');
  setText('action-description','Hai người cùng nhìn một bàn Caro. Chỉ người đến lượt mới đặt được dấu vào ô trống.');
 }else if(id==='rps'){
  setText('action-title',state.yourChoice===null?'Chọn kín một tay':'Đã ra tay!');
  setText('action-description','Hai người chọn riêng tư. Khi cả hai cùng chọn, trò chơi tự động mở tay. Ai thắng 3 lượt trước sẽ thắng ván.');
 }
}
function showReaction(emoji,seat){
 const el=document.createElement('div');el.className='flying-emoji';el.style.left=(seat===session.seat?20:63)+'%';el.style.bottom='16%';
 el.textContent=emoji;const s=document.createElement('small');s.textContent=seat===session.seat?'Bạn':session.players[seat]?.name||'Bạn cùng chơi';el.append(s);$('reaction-layer').append(el);setTimeout(()=>el.remove(),2150);
 if(seat!==session.seat)beep(880,.014);
}
function sendReaction(e){const btn=e.target.closest('[data-emoji]');if(btn){if(!session.room){toast('Hãy vào phòng để thả emoji nhé');return;}send({type:'reaction',emoji:btn.dataset.emoji});$('mobile-reaction-tray').hidden=true;}}
$('emoji-buttons').addEventListener('click',sendReaction);
$('mobile-reaction-tray').addEventListener('click',sendReaction);
$('mobile-reaction-toggle').onclick=()=>{$('mobile-reaction-tray').hidden=!$('mobile-reaction-tray').hidden;};
$('dock-left').onclick=()=>quanMove(-1);
$('dock-right').onclick=()=>quanMove(1);
function updateMobileHelpers(){
 const visible=currentView==='play'&&!!session.gameId;
 $('mobile-reaction-toggle').hidden=!visible;
 if(!visible)$('mobile-reaction-tray').hidden=true;
 const hasSelected=visible&&session.gameId==='quan'&&session.selected!==null&&canMakeMove();
 $('mobile-move-dock').hidden=!hasSelected;
 if(hasSelected)setText('dock-description',session.match.cells[session.selected].n+' quân · Rải về phía nào?');
}


// Sowing animation replays the authoritative server event stream. Draw only changed pits.
function flyStone(from,to,duration){
 if(reduceMotion()||session.three||currentView!=='play')return Promise.resolve();
 const a=pitNodes.get(from)?.getBoundingClientRect(),b=pitNodes.get(to)?.getBoundingClientRect(),wrap=$('play-surface').getBoundingClientRect();
 if(!a||!b)return Promise.resolve();
 const node=document.createElement('i');node.className='flying-stone';node.style.left=(a.left+a.width/2-wrap.left)+'px';node.style.top=(a.top+a.height/2-wrap.top)+'px';$('play-surface').append(node);
 const dx=b.left+b.width/2-a.left-a.width/2,dy=b.top+b.height/2-a.top-a.height/2;
 const lift=Math.min(70,Math.max(22,Math.hypot(dx,dy)*.3));const anim=node.animate([{transform:'translate(-50%,-50%) translate(0,0) rotate(-15deg) scale(.9)',offset:0},{transform:`translate(-50%,-50%) translate(${dx*.48}px,${dy*.48-lift}px) rotate(110deg) scale(1.1)`,offset:.49},{transform:`translate(-50%,-50%) translate(${dx}px,${dy}px) rotate(190deg) scale(.84)`,offset:.83},{transform:`translate(-50%,-50%) translate(${dx}px,${dy-8}px) rotate(200deg) scale(.9)`,offset:.91},{transform:`translate(-50%,-50%) translate(${dx}px,${dy}px) rotate(205deg) scale(.88)`,offset:1}],{duration,easing:'linear'});
 return anim.finished.catch(()=>{}).then(()=>node.remove());
}
async function animateQuan(events,generation){
 const drops=events.filter(e=>e.type==='drop').length;
 const delay=reduceMotion()?0:Math.max(28,Math.min(110,3700/Math.max(1,drops)));
 for(const e of events){
  if(animGeneration!==generation)return;
  if(e.type==='pickup')session.visual.cells[e.pit].n=0;
  if(e.type==='drop'){
   await flyStone(e.from,e.pit,delay);session.visual.cells[e.pit].n++;beep(510+(e.pit*29)%230,.014,.08);
  }
  if(e.type==='capture'){
   session.visual.cells[e.pit].n=0;session.visual.cells[e.pit].q=0;beep(325,.045,.2);
   toast(`✦ Ăn được ${e.value} điểm!`);
  }
  if(e.type==='refill')session.visual.cells[e.pit].n++;
  if(session.three)session.graphics?.setState(session.visual.cells,null,session.seat,quanLegal);
  else drawQuanPit(e.pit);
  if(e.type==='pickup'&&!reduceMotion())await sleep(30);
 }
}

function exit3d(){
 if(session.three){session.three=false;session.graphics?.stop();$('three-toggle').textContent='◈ Xem 3D';}
}
$('three-toggle').onclick=async()=>{
 if(session.gameId!=='quan')return;
 if(session.three){exit3d();session.graphics?.stop();setupQuan();renderPlay();return;}
 const toggle=$('three-toggle');toggle.disabled=true;toggle.textContent='Đang tải 3D…';
 try{
  const host=document.createElement('div');host.className='three-viewport';host.id='three-viewport';$('play-surface').replaceChildren(host);
  if(session.graphics){session.graphics.dispose();session.graphics=null;}
  const {makeThreeView}=await import('/three-mode.js');session.graphics=await makeThreeView(host,selectQuan);
  session.three=true;session.graphics.setState(session.visual.cells,session.selected,session.seat,quanLegal);session.graphics.reset(session.seat);session.graphics.start();session.graphics.resize();toggle.textContent='▦ Xem nhẹ';
 }catch(e){console.error(e);session.three=false;session.graphics=null;toast('Không tải được 3D, chuyển lại chế độ nhẹ.');setupQuan();renderPlay();}
 toggle.disabled=false;
};
window.addEventListener('resize',()=>{if(session.three)session.graphics?.resize();});
window.addEventListener('keydown',e=>{if(currentView!=='play'||session.gameId!=='quan'||e.target.matches('input,textarea'))return;if(e.key==='ArrowLeft'){e.preventDefault();quanMove(-1);}if(e.key==='ArrowRight'){e.preventDefault();quanMove(1);}if(e.key==='Escape'){session.selected=null;renderPlay();}});

const RULES={
 quan:['Mỗi người có 5 ô Dân, mỗi ô ban đầu chứa 5 viên; 2 ô lớn hai đầu là Quan.','Khi đến lượt, chọn một ô Dân còn quân ở phía dưới bàn của bạn rồi chọn rải sang trái hoặc phải.','Rải từng viên theo vòng. Gặp ô Dân có quân thì bốc lên rải tiếp. Qua một ô trống để tới ô có quân có thể ăn quân đó.','Khi hết quân bên mình sẽ phải rải lại (trừ 5 điểm). Ván kết thúc khi đã ăn hết 2 Quan.','Góc nhìn hai người được xoay riêng; các nút trái/phải luôn tính theo phía của người đang chơi.'],
 ganh:['Mỗi người bắt đầu với 8 quân trên 25 giao điểm của bàn 5×5.','Di chuyển một quân tới điểm trống liền kề theo đường kẻ. Các đường chéo chỉ hiện tại giao điểm cho phép.','Gánh: sau khi đi, nếu quân mới đứng giữa 2 quân đối phương nằm đối diện nhau trên một đường thì chúng chuyển thành quân của bạn.','Vây: nhóm quân đối phương không còn điểm trống liền kề để đi sẽ đổi thành quân của bạn.','Thắng khi đối phương hết quân hoặc không còn nước đi. Phiên bản này chưa dùng luật Mở bắt buộc.'],
 caro:['Bàn 10×10. Người chơi 1 đánh X, người chơi 2 đánh O.','Hai người lần lượt chọn một ô trống.','Ai tạo được 5 dấu liền nhau theo hàng, cột hoặc đường chéo sẽ thắng. Đây là luật Caro đơn giản, không áp dụng luật chặn hai đầu.'],
 chess:['Trắng đi trước, quân đi theo luật Cờ vua quốc tế.','Có nhập thành, bắt tốt qua đường và tự phong hậu khi tốt đến hàng cuối.','Không được để vua bị chiếu. Chiếu bí thắng; hết nước nhưng không chiếu là hòa.','Hòa sau 50 nước mỗi bên không ăn quân/đi tốt. Phiên bản này chưa hỗ trợ hòa lặp lại vị trí 3 lần.'],
 xiangqi:['Quân Đỏ đi trước trên bàn 9×10 có sông và hai cung.','Xe đi ngang dọc; Pháo cần một quân chắn khi ăn; Mã bị cản chân; Tượng không qua sông; Sĩ và Tướng ở trong cung.','Hai tướng không được nhìn thẳng nhau khi giữa không có quân. Không được để Tướng mình bị chiếu.','Chiếu bí hoặc hết nước đi hợp lệ được xử thắng cho bên còn lại.'],
 go:['Cờ vây bản 9×9: Đen đi trước, mỗi lượt đặt một quân lên giao điểm trống.','Nhóm quân không còn khí sẽ bị bắt. Không được tự sát hoặc lặp lại ngay vị trí cũ (Ko đơn giản).','Có thể Qua lượt; sau 2 lần Qua liên tiếp sẽ tính diện tích: quân trên bàn và vùng trống do một màu bao quanh.','Trắng được cộng 5.5 điểm komi. Chưa áp dụng superko và thương lượng quân chết cuối trận.'],
 rps:['Hai người cùng chọn Búa ✊, Bao ✋ hoặc Kéo ✌️.','Chọn tay của bạn sẽ được giữ kín trên máy chủ cho tới khi đối thủ cũng chọn.','Búa thắng Kéo, Kéo thắng Bao, Bao thắng Búa. Giống nhau thì hòa lượt.','Người thắng 3 lượt đầu tiên là người thắng ván.']
};
$('rules-toggle').onclick=()=>{const d=$('rules-dialog');setText('rules-name',GAME_BY_ID[session.gameId]?.name||'Luật chơi');$('rules-content').replaceChildren(...(RULES[session.gameId]||[]).map((t,i)=>{const p=document.createElement('p');p.textContent=`${i+1}. ${t}`;return p;}));d.showModal();};
$('close-rules').onclick=$('rules-understood').onclick=()=>$('rules-dialog').close();
$('nickname').value=nickname;
$('save-nickname').onclick=()=>{
 const clean=$('nickname').value.trim().slice(0,22).replace(/[<>]/g,'');if(!clean){toast('Hãy nhập một tên hiển thị nhé');return;}
 nickname=clean;localStorage.setItem('sandinh-name',nickname);if(session.room)send({type:'name',name:nickname});toast('Đã lưu tên hiển thị!');
};

let stored;try{stored=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}catch{}
const fromUrl=new URLSearchParams(location.search).get('room');
if(fromUrl&&/^[a-f0-9]{6}$/i.test(fromUrl)){
 const id=fromUrl.toUpperCase();view('lobby');
 if(stored?.room===id&&stored.token){session.room=id;session.token=stored.token;connect({type:'resume',code:id,token:stored.token},true);}
 else if(stored?.room&&stored.token){session.room=stored.room;session.token=stored.token;connect({type:'resume',code:stored.room,token:stored.token},true);toast('Bạn đang ở trong phòng cũ, hãy rời phòng để vào phòng mới.');}
 else joinRoom(id);
}else if(stored?.room&&stored.token){session.room=stored.room;session.token=stored.token;view('lobby');connect({type:'resume',code:stored.room,token:stored.token},true);}
else if(location.hash&&['home','library','lobby','profile'].includes(location.hash.slice(1)))view(location.hash.slice(1));
renderLobby();
if('serviceWorker'in navigator && location.protocol!=='file:')window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));

$('save-settings').onclick=()=>{send({type:'settings',settings:{difficulty:$('bot-level').value,board:$('board-style').value,light:$('light-style').value,turnSeconds:Number($('turn-seconds').value)}});toast('Đã gửi tùy chỉnh phòng');};
let replayFrames=[],replayIndex=0,replayTimer=null;
function replayDraw(){const f=replayFrames[replayIndex];if(!f)return;const st=f.state;setText('replay-meta',`Bước ${replayIndex+1}/${replayFrames.length} · Người đi: ${f.seat===null?'Bắt đầu':f.seat+1} · ${st.status}`);
 let line='';if(st.cells?.length===12)line='Ô Quan: '+st.cells.map((c,i)=>`${i}:${c.n}${c.q?' (Quan)':''}`).join('  ')+'\nĐiểm: '+st.score.join(' - ');else if(st.cells?.length===100)line=Array.from({length:10},(_,i)=>st.cells.slice(i*10,i*10+10).map(v=>v===null?'·':v?'O':'X').join(' ')).join('\n');else if(st.cells?.length===25)line=Array.from({length:5},(_,i)=>st.cells.slice(i*5,i*5+5).map(v=>v===null?'·':v?'○':'●').join(' ')).join('\n');else if(st.board?.length===64)line=Array.from({length:8},(_,i)=>st.board.slice(i*8,i*8+8).map(v=>CHESS_SYMBOLS[v]||'·').join(' ')).join('\n');else if(st.board?.length===90)line=Array.from({length:10},(_,i)=>st.board.slice(i*9,i*9+9).map(v=>XIANGQI_SYMBOLS[v]||'·').join(' ')).join('\n');else if(st.board?.length===81)line=Array.from({length:9},(_,i)=>st.board.slice(i*9,i*9+9).map(v=>v===null?'·':v===0?'●':'○').join(' ')).join('\n');else line='Tỉ số: '+(st.scores||[]).join(' - ')+'\nVòng: '+st.round;setText('replay-board',line);}
function stopReplay(){if(replayTimer){clearInterval(replayTimer);replayTimer=null;}$('replay-play').textContent='▶ Phát';}
function openReplay(frames){stopReplay();replayFrames=frames||[];replayIndex=0;replayDraw();$('replay-dialog').showModal();}
$('replay-close').onclick=()=>{stopReplay();$('replay-dialog').close();};$('replay-dialog').onclose=stopReplay;
$('replay-prev').onclick=()=>{replayIndex=Math.max(0,replayIndex-1);replayDraw();};$('replay-next').onclick=()=>{replayIndex=Math.min(replayFrames.length-1,replayIndex+1);replayDraw();};
$('replay-play').onclick=()=>{if(replayTimer){stopReplay();return;}if(replayIndex>=replayFrames.length-1)replayIndex=0;const tick=()=>{if(replayIndex>=replayFrames.length-1){stopReplay();return;}replayIndex++;replayDraw();};replayTimer=setInterval(tick,Number($('replay-speed').value));$('replay-play').textContent='⏸ Dừng';};
$('replay-speed').onchange=()=>{if(replayTimer){stopReplay();$('replay-play').click();}};

$('music-volume').value=Math.round(bgm.volume*100);$('music-volume').oninput=e=>{bgm.volume=Number(e.target.value)/100;localStorage.setItem('sandinh-bgm-volume',bgm.volume);};
const sudoku = initSudoku({toast,beep});
function openSudoku(){sudoku.open();}

// Public room totals from SQLite + private, device-local Sudoku record.
async function renderProfileStats(){
 const host=$('stat-cards');if(!host)return;
 const create=(title,main,subtitle)=>{const card=document.createElement('article');card.className='stat-tile';const h=document.createElement('span'),v=document.createElement('strong'),p=document.createElement('small');h.textContent=title;v.textContent=main;p.textContent=subtitle;card.append(h,v,p);host.append(card);};
 host.replaceChildren();
 const stats=(()=>{try{return JSON.parse(localStorage.getItem('sandinh-sudoku-records-v6')||'{}');}catch{return {};}})();
 let solved=0,fastest=null;for(const r of Object.values(stats)){solved+=r.wins||0;if(Number.isFinite(r.best)&&(fastest===null||r.best<fastest))fastest=r.best;}
 create('🔢 Sudoku',String(solved)+' đề','Nhanh nhất: '+(fastest===null?'—':`${Math.floor(fastest/60)}:${String(fastest%60).padStart(2,'0')}`));
 try{const response=await fetch('/api/stats',{cache:'no-store'});if(!response.ok)throw Error('not available');const data=await response.json();
  for(const row of data.games||[])create((GAME_BY_ID[row.game]||{name:row.game,emoji:'🎲'}).emoji+' '+(GAME_BY_ID[row.game]?.name||row.game),String(row.matches||0)+' ván','Trên máy chủ · tất cả phòng');
 }catch{create('Phòng online','—','Chưa kết nối được dữ liệu thống kê');}
}
$('profile-sudoku').onclick=()=>openSudoku();
