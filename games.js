import { initialState as newQuan, applyMove as playQuan } from './rules.js';

export const GAMES = {
  quan:{id:'quan',name:'Ô Ăn Quan',emoji:'🪨',description:'Nhặt sỏi, rải quân và ăn Quan.',players:2},
  ganh:{id:'ganh',name:'Cờ Gánh',emoji:'♟️',description:'Bước quân, gánh và vây quân đối phương.',players:2},
  caro:{id:'caro',name:'Caro học trò',emoji:'✏️',description:'Đặt 5 dấu liền nhau để chiến thắng.',players:2},
  rps:{id:'rps',name:'Oẳn tù tì',emoji:'✊',description:'Chọn kín, cùng lật tay, thắng 3 lượt.',players:2}
};
export const GAME_IDS=Object.keys(GAMES);
const duplicate=o=>structuredClone(o);
const win=(state,winner)=>{state.status='finished';state.winner=winner;};

export function newMatch(id){
 if(id==='quan')return newQuan();
 if(id==='caro')return {cells:Array(100).fill(null),turn:0,status:'playing',winner:null,seq:0,last:-1,winning:[]};
 if(id==='ganh'){
  const cells=Array(25).fill(null);
  for(let x=0;x<5;x++){cells[x]=1;cells[20+x]=0;}
  for(const [r,c] of [[1,0],[1,4]])cells[r*5+c]=1;
  for(const [r,c] of [[3,0],[3,4]])cells[r*5+c]=0;
  cells[2*5+0]=0;cells[2*5+4]=1;
  return {cells,turn:0,status:'playing',winner:null,seq:0,last:null,captured:[]};
 }
 if(id==='rps')return {scores:[0,0],round:1,choices:[null,null],reveal:null,turn:null,status:'playing',winner:null,seq:0};
 throw Error('Trò chơi không tồn tại');
}

function requireTurn(prev,seat){
 if(prev.status!=='playing')throw Error('Ván đã kết thúc');
 if(prev.turn!==seat)throw Error('Chưa đến lượt bạn');
}

function playCaro(prev,seat,data){
 requireTurn(prev,seat);
 const idx=data.idx;
 if(!Number.isInteger(idx)||idx<0||idx>=100||prev.cells[idx]!==null)throw Error('Ô caro không hợp lệ');
 const state=duplicate(prev);state.cells[idx]=seat;state.last=idx;
 const x=idx%10,y=Math.floor(idx/10);
 for(const [dx,dy] of [[1,0],[0,1],[1,1],[1,-1]]){
  const line=[idx];
  for(const sign of [-1,1])for(let k=1;k<5;k++){
   const xx=x+sign*k*dx,yy=y+sign*k*dy;
   if(xx<0||yy<0||xx>=10||yy>=10||state.cells[yy*10+xx]!==seat)break;
   line.push(yy*10+xx);
  }
  if(line.length>=5){state.winning=line;win(state,seat);break;}
 }
 if(state.status==='playing'){
  if(state.cells.every(c=>c!==null))win(state,'draw');
  else state.turn=1-seat;
 }
 state.seq++;return {state,events:[{type:'place',idx,player:seat}]};
}

export function ganhNeighbors(idx){
 const r=Math.floor(idx/5),c=idx%5,steps=[[0,1],[0,-1],[1,0],[-1,0]];
 if((r+c)%2===0)steps.push([1,1],[1,-1],[-1,1],[-1,-1]);
 return steps.map(([dr,dc])=>[r+dr,c+dc]).filter(([rr,cc])=>rr>=0&&rr<5&&cc>=0&&cc<5).map(([rr,cc])=>rr*5+cc);
}
function possible(cells,seat){return cells.some((p,i)=>p===seat && ganhNeighbors(i).some(j=>cells[j]===null));}
function playGanh(prev,seat,data){
 requireTurn(prev,seat);
 const {from,to}=data;
 if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=25||to>=25||prev.cells[from]!==seat||prev.cells[to]!==null||!ganhNeighbors(from).includes(to))throw Error('Nước Cờ Gánh không hợp lệ');
 const state=duplicate(prev);state.cells[from]=null;state.cells[to]=seat;state.last={from,to};
 const r=Math.floor(to/5),c=to%5,enemy=1-seat,converted=new Set();
 // Gánh: opposite enemy tokens across the newly occupied intersection.
 for(const [dr,dc] of [[1,0],[0,1],[1,1],[1,-1]]){
  const a=[r+dr,c+dc],b=[r-dr,c-dc];
  if([...a,...b].every(v=>v>=0&&v<5)){
   const ia=a[0]*5+a[1],ib=b[0]*5+b[1];
   if(ganhNeighbors(to).includes(ia)&&ganhNeighbors(to).includes(ib)&&state.cells[ia]===enemy&&state.cells[ib]===enemy){converted.add(ia);converted.add(ib);}
  }
 }
 for(const i of converted)state.cells[i]=seat;
 // Vây: capture surrounded connected enemy groups without an empty adjacent intersection.
 const seen=new Set();for(let i=0;i<25;i++){
  if(state.cells[i]!==enemy||seen.has(i))continue;
  const group=[i];seen.add(i);let liberty=false;
  for(let j=0;j<group.length;j++)for(const near of ganhNeighbors(group[j])){
   if(state.cells[near]===null)liberty=true;
   else if(state.cells[near]===enemy&&!seen.has(near)){seen.add(near);group.push(near);}
  }
  if(!liberty)for(const pos of group)converted.add(pos);
 }
 for(const i of converted)state.cells[i]=seat;
 state.captured=[...converted];
 if(!state.cells.includes(enemy)||!possible(state.cells,enemy))win(state,seat);
 else state.turn=enemy;
 state.seq++;
 return {state,events:[{type:'ganh',from,to,captured:state.captured,player:seat}]};
}
function playRps(prev,seat,data){
 if(prev.status!=='playing')throw Error('Ván đã kết thúc');
 if(![0,1,2].includes(data.choice)||!Number.isInteger(data.choice))throw Error('Vui lòng chọn Búa, Bao hoặc Kéo');
 if(prev.choices[seat]!==null)throw Error('Bạn đã chọn rồi, chờ đối thủ');
 const state=duplicate(prev);state.choices[seat]=data.choice;state.reveal=null;
 const events=[];
 if(state.choices.every(c=>c!==null)){
  const [a,b]=state.choices;const outcome=(a-b+3)%3;
  const winner=outcome===0?null:outcome===1?0:1;
  if(winner!==null)state.scores[winner]++;
  state.reveal={choices:[a,b],winner,round:state.round};
  events.push({type:'reveal',...state.reveal});
  state.round++;
  state.choices=[null,null];
  if(state.scores.some(v=>v>=3))win(state,state.scores[0]>state.scores[1]?0:1);
 }
 state.seq++;
 return {state,events};
}
export function applyAction(id,prev,seat,data={}){
 if(id==='quan')return playQuan(prev,seat,data.pit,data.dir);
 if(id==='ganh')return playGanh(prev,seat,data);
 if(id==='caro')return playCaro(prev,seat,data);
 if(id==='rps')return playRps(prev,seat,data);
 throw Error('Chưa hỗ trợ trò chơi này');
}
// Never disclose an opponent's selection before both reveal. Secret choices stay on the server.
export function publicState(id,state,seat){
 if(id!=='rps')return state;
 return {...state,choices:[state.choices[0]!==null,state.choices[1]!==null],yourChoice:state.choices[seat]};
}
