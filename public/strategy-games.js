// Self-contained, deterministic board engines shared by the server and clients.
const clone = v => structuredClone(v);
const opposite = x => 1-x;
const FILES='abcdefgh';
const white=p=>p && p===p.toUpperCase();
const belongs=(p,seat)=>!!p && (seat===0?white(p):!white(p));
const enemy=(p,seat)=>!!p && !belongs(p,seat);
const at=(r,c,w)=>r>=0&&r<w&&c>=0&&c<w;

// CHESS — orthodox moves, legal check, castling, en passant, queen promotion,
// mate/stalemate. Draw handling includes 50-move rule (threefold not yet supported).
export function newChess(){
 const board=[...'rnbqkbnr',...Array(8).fill('p'),...Array(32).fill(null),...Array(8).fill('P'),...'RNBQKBNR'];
 return {board,turn:0,status:'playing',winner:null,seq:0,last:null,castle:'KQkq',ep:null,halfmove:0};
}
function attacked(s,square,by){
 const b=s.board,tr=Math.floor(square/8),tc=square%8;
 const pawn=by===0?'P':'p',pawnRow=tr+(by===0?1:-1);
 for(const d of [-1,1]){const c=tc+d;if(at(pawnRow,c,8)&&b[pawnRow*8+c]===pawn)return true;}
 const knight=by===0?'N':'n';for(const [dr,dc] of [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[-1,2],[1,-2],[-1,-2]]){const r=tr+dr,c=tc+dc;if(at(r,c,8)&&b[r*8+c]===knight)return true;}
 for(const [dr,dc] of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]){
  let r=tr+dr,c=tc+dc,steps=1;
  while(at(r,c,8)){
   const p=b[r*8+c];if(p){if(belongs(p,by)){
    const t=p.toUpperCase(),axis=dr===0||dc===0;
    if((axis&&(t==='R'||t==='Q'))||(!axis&&(t==='B'||t==='Q'))||(steps===1&&t==='K'))return true;
   }break;}r+=dr;c+=dc;steps++;
  }
 }
 return false;
}
export function chessCheck(s,seat){const pos=s.board.findIndex(p=>p===(seat===0?'K':'k'));return pos<0||attacked(s,pos,opposite(seat));}
function chessPseudo(s,seat){
 const b=s.board,m=[];const add=(from,to,extra={})=>{if(!b[to]||enemy(b[to],seat)){if(b[to]?.toUpperCase()!=='K')m.push({from,to,...extra});}};
 for(let i=0;i<64;i++){
  const p=b[i];if(!belongs(p,seat))continue;const t=p.toUpperCase(),r=i>>3,c=i%8,dir=seat===0?-1:1;
  if(t==='P'){
   const r1=r+dir;if(at(r1,c,8)&&!b[r1*8+c]){
    add(i,r1*8+c,{...(r1===0||r1===7?{promotion:'Q'}:{})});
    if(r===(seat===0?6:1)&&!b[(r+2*dir)*8+c])add(i,(r+2*dir)*8+c);
   }
   for(const dc of [-1,1]){const nc=c+dc;if(!at(r1,nc,8))continue;const to=r1*8+nc;
    if(enemy(b[to],seat))add(i,to,{...(r1===0||r1===7?{promotion:'Q'}:{})});
    if(s.ep===to)add(i,to,{enpassant:true});
   }
  }else if(t==='N'){
   for(const [dr,dc] of [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[-1,2],[1,-2],[-1,-2]])if(at(r+dr,c+dc,8))add(i,(r+dr)*8+c+dc);
  }else if(t==='K'){
   for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if((dr||dc)&&at(r+dr,c+dc,8))add(i,(r+dr)*8+c+dc);
   const home=seat===0?60:4,rank=seat===0?7:0,keys=seat===0?'KQ':'kq';
   if(i===home&&!chessCheck(s,seat)){
    if(s.castle.includes(keys[0])&&b[rank*8+7]===(seat===0?'R':'r')&&!b[home+1]&&!b[home+2]&&!attacked(s,home+1,1-seat)&&!attacked(s,home+2,1-seat))m.push({from:i,to:home+2,castle:'k'});
    if(s.castle.includes(keys[1])&&b[rank*8]===(seat===0?'R':'r')&&!b[home-1]&&!b[home-2]&&!b[home-3]&&!attacked(s,home-1,1-seat)&&!attacked(s,home-2,1-seat))m.push({from:i,to:home-2,castle:'q'});
   }
  }else{
   const dirs=[];if(t==='R'||t==='Q')dirs.push([1,0],[-1,0],[0,1],[0,-1]);if(t==='B'||t==='Q')dirs.push([1,1],[1,-1],[-1,1],[-1,-1]);
   for(const [dr,dc] of dirs){let nr=r+dr,nc=c+dc;while(at(nr,nc,8)){const dst=nr*8+nc;add(i,dst);if(b[dst])break;nr+=dr;nc+=dc;}}
  }
 }
 return m;
}
function chessRaw(s,m,seat){
 const n=clone(s),b=n.board,p=b[m.from],captured=b[m.to];b[m.to]=p;b[m.from]=null;n.last={from:m.from,to:m.to};n.ep=null;
 if(m.enpassant){b[m.to+(seat===0?8:-8)]=null;}
 if(m.castle){if(m.castle==='k'){const rookFrom=m.from+3;b[m.from+1]=b[rookFrom];b[rookFrom]=null;}else{const rookFrom=m.from-4;b[m.from-1]=b[rookFrom];b[rookFrom]=null;}}
 if(p.toUpperCase()==='P'){
  if(Math.abs(m.to-m.from)===16)n.ep=(m.to+m.from)/2;
  if(m.to<8||m.to>=56)b[m.to]=seat===0?'Q':'q';
 }
 if(p==='K')n.castle=n.castle.replace(/[KQ]/g,'');if(p==='k')n.castle=n.castle.replace(/[kq]/g,'');
 for(const [idx,key] of [[63,'K'],[56,'Q'],[7,'k'],[0,'q']])if(m.from===idx||m.to===idx)n.castle=n.castle.replace(key,'');
 n.halfmove=(p.toUpperCase()==='P'||captured||m.enpassant)?0:n.halfmove+1;n.turn=opposite(seat);n.seq++;
 return n;
}
export function chessLegal(s,seat=s.turn){return chessPseudo(s,seat).filter(m=>!chessCheck(chessRaw(s,m,seat),seat));}
export function chessMove(s,seat,action){
 if(s.status!=='playing'||s.turn!==seat)throw Error('Chưa đến lượt bạn');
 const m=chessLegal(s,seat).find(x=>x.from===action.from&&x.to===action.to);if(!m)throw Error('Nước cờ vua không hợp lệ');
 const n=chessRaw(s,m,seat),next=chessLegal(n,n.turn);if(!next.length){n.status='finished';n.winner=chessCheck(n,n.turn)?seat:'draw';}
 else if(n.halfmove>=100){n.status='finished';n.winner='draw';}
 return {state:n,events:[{type:'pieceMove',...m}]};
}

// XIANGQI (red seat 0 below, black seat 1 above). Rules include flying generals,
// self-check, checkmate, elephant eye, horse leg, cannon screen, palace/river.
export function newXiangqi(){
 const b=Array(90).fill(null);const back=['r','h','e','a','k','a','e','h','r'];
 back.forEach((p,c)=>{b[c]=p;b[9*9+c]=p.toUpperCase();});
 for(const c of [1,7]){b[2*9+c]='c';b[7*9+c]='C';}
 for(const c of [0,2,4,6,8]){b[3*9+c]='p';b[6*9+c]='P';}
 return {board:b,turn:0,status:'playing',winner:null,seq:0,last:null};
}
const xy=(r,c)=>r>=0&&r<10&&c>=0&&c<9;
function xMoves(s,seat,attacking=false){
 const b=s.board,res=[];
 const push=(from,to)=>{if(!b[to]||enemy(b[to],seat))res.push({from,to});};
 for(let i=0;i<90;i++){
  const p=b[i];if(!belongs(p,seat))continue;const t=p.toUpperCase(),r=Math.floor(i/9),c=i%9;
  const palace=(rr,cc)=>cc>=3&&cc<=5&&(seat===0?rr>=7&&rr<=9:rr<=2);
  if(t==='K'||t==='A'){
   for(const [dr,dc] of (t==='K'?[[1,0],[-1,0],[0,1],[0,-1]]:[[1,1],[1,-1],[-1,1],[-1,-1]])){
    const rr=r+dr,cc=c+dc;if(palace(rr,cc))push(i,rr*9+cc);
   }
   if(t==='K')for(const dr of [-1,1]){let rr=r+dr;while(xy(rr,c)){const to=rr*9+c;if(b[to]){if(b[to].toUpperCase()==='K'&&enemy(b[to],seat))push(i,to);break;}rr+=dr;}}
  }else if(t==='E'){
   for(const [dr,dc] of [[2,2],[2,-2],[-2,2],[-2,-2]]){const rr=r+dr,cc=c+dc;if(xy(rr,cc)&&(seat===0?rr>=5:rr<=4)&&!b[(r+dr/2)*9+c+dc/2])push(i,rr*9+cc);}
  }else if(t==='H'){
   for(const [dr,dc,lr,lc] of [[-2,-1,-1,0],[-2,1,-1,0],[2,-1,1,0],[2,1,1,0],[-1,-2,0,-1],[1,-2,0,-1],[-1,2,0,1],[1,2,0,1]]){
    const rr=r+dr,cc=c+dc;if(xy(rr,cc)&&!b[(r+lr)*9+c+lc])push(i,rr*9+cc);
   }
  }else if(t==='R'||t==='C'){
   for(const [dr,dc] of [[0,1],[0,-1],[1,0],[-1,0]]){
    let rr=r+dr,cc=c+dc,screen=false;
    while(xy(rr,cc)){const to=rr*9+cc;
     if(t==='R'){if(!b[to])push(i,to);else {if(enemy(b[to],seat))push(i,to);break;}}
     else if(!screen){if(!b[to]){if(!attacking)push(i,to);}else screen=true;}
     else if(b[to]){if(enemy(b[to],seat))push(i,to);break;}
     rr+=dr;cc+=dc;
    }
   }
  }else if(t==='P'){
   const dir=seat===0?-1:1;const crossed=seat===0?r<=4:r>=5;
   for(const [dr,dc] of (crossed?[[dir,0],[0,1],[0,-1]]:[[dir,0]]))if(xy(r+dr,c+dc))push(i,(r+dr)*9+c+dc);
  }
 }
 return res;
}
export function xiangqiCheck(s,seat){const king=s.board.findIndex(p=>p===(seat===0?'K':'k'));return king<0||xMoves(s,1-seat,true).some(m=>m.to===king);}
function xRaw(s,m,seat){const n=clone(s);n.board[m.to]=n.board[m.from];n.board[m.from]=null;n.last=m;n.turn=1-seat;n.seq++;return n;}
export function xiangqiLegal(s,seat=s.turn){return xMoves(s,seat).filter(m=>!xiangqiCheck(xRaw(s,m,seat),seat));}
export function xiangqiMove(s,seat,a){
 if(s.status!=='playing'||s.turn!==seat)throw Error('Chưa đến lượt bạn');
 const m=xiangqiLegal(s,seat).find(m=>m.from===a.from&&m.to===a.to);if(!m)throw Error('Nước Cờ tướng không hợp lệ');
 const n=xRaw(s,m,seat);if(!xiangqiLegal(n,1-seat).length){n.status='finished';n.winner=seat;}
 return {state:n,events:[{type:'pieceMove',...m}]};
}

// GO — 9x9 Chinese area scoring with 5.5 komi to White. Two consecutive
// passes end the game. Simple ko (not positional superko).
export const GO_SIZE=9;
export function newGo(){return {board:Array(81).fill(null),turn:0,seq:0,status:'playing',winner:null,passes:0,last:null,previousBoard:null,score:null};}
const goNear=i=>[i%9?i-1:-1,i%9<8?i+1:-1,i>=9?i-9:-1,i<72?i+9:-1].filter(j=>j>=0);
function goGroup(b,i){const owner=b[i],nodes=[i],seen=new Set([i]),lib=new Set();for(let k=0;k<nodes.length;k++)for(const j of goNear(nodes[k])){if(b[j]===null)lib.add(j);else if(b[j]===owner&&!seen.has(j)){seen.add(j);nodes.push(j);}}return {nodes,lib};}
function goScore(board){const score=[0,5.5],seen=new Set();for(let i=0;i<81;i++){
  if(board[i]!==null){score[board[i]]++;continue;}
  if(seen.has(i))continue;const group=[i],owners=new Set();seen.add(i);
  for(let k=0;k<group.length;k++)for(const n of goNear(group[k])){if(board[n]===null&&!seen.has(n)){seen.add(n);group.push(n);}else if(board[n]!==null)owners.add(board[n]);}
  if(owners.size===1)score[[...owners][0]]+=group.length;
 }return score;}
export function goMove(s,seat,a){
 if(s.status!=='playing'||s.turn!==seat)throw Error('Chưa đến lượt bạn');
 const n=clone(s);n.previousBoard=s.board.slice();n.last=null;
 if(a.pass===true){n.passes++;n.last={pass:true};n.turn=1-seat;n.seq++;if(n.passes>=2){n.status='finished';n.score=goScore(n.board);n.winner=n.score[0]===n.score[1]?'draw':n.score[0]>n.score[1]?0:1;}return {state:n,events:[{type:'pass'}]};}
 if(!Number.isInteger(a.idx)||a.idx<0||a.idx>=81||s.board[a.idx]!==null)throw Error('Giao điểm không hợp lệ');
 n.board[a.idx]=seat;let captured=[];
 for(const k of goNear(a.idx))if(n.board[k]===1-seat){const g=goGroup(n.board,k);if(!g.lib.size){captured.push(...g.nodes);for(const z of g.nodes)n.board[z]=null;}}
 if(!goGroup(n.board,a.idx).lib.size)throw Error('Không thể đặt quân tự sát');
 if(s.previousBoard&&s.previousBoard.every((v,i)=>v===n.board[i]))throw Error('Nước đi vi phạm luật Ko');
 n.last={idx:a.idx,captured};n.passes=0;n.turn=1-seat;n.seq++;
 return {state:n,events:[{type:'place',idx:a.idx,captured}]};
}
export function goLegal(s,seat=s.turn){const out=[{pass:true}];if(s.status!=='playing')return [];for(let idx=0;idx<81;idx++)if(s.board[idx]===null){try{goMove(s,seat,{idx});out.push({idx});}catch{}}return out;}

export function legalFor(id,s,seat=s.turn){if(id==='chess')return chessLegal(s,seat);if(id==='xiangqi')return xiangqiLegal(s,seat);if(id==='go')return goLegal(s,seat);return [];}
export function playStrategy(id,s,seat,a){if(id==='chess')return chessMove(s,seat,a);if(id==='xiangqi')return xiangqiMove(s,seat,a);if(id==='go')return goMove(s,seat,a);throw Error('Trò chơi không hỗ trợ');}
export function newStrategy(id){if(id==='chess')return newChess();if(id==='xiangqi')return newXiangqi();if(id==='go')return newGo();throw Error('Trò chơi không tồn tại');}
