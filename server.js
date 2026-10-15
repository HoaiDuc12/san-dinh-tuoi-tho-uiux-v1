import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { randomBytes } from 'node:crypto';
import { WebSocket, WebSocketServer } from 'ws';
import {GAMES,GAME_IDS,newMatch,applyAction,publicState} from './games.js';

const port=Number(process.env.PORT||3000);
const root=resolve('public'),rooms=new Map();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/health'){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({ok:true,rooms:rooms.size,games:GAME_IDS.length}));return;}
 let decoded;try{decoded=decodeURIComponent(path);}catch{res.writeHead(400);res.end('Bad request');return;}
 const target=resolve(root,'.'+(decoded==='/'?'/index.html':decoded));
 if(!target.startsWith(root+sep)){res.writeHead(403);res.end('Forbidden');return;}
 try{if(!(await stat(target)).isFile())throw Error('missing');const data=await readFile(target);res.writeHead(200,{'content-type':mime[extname(target)]||'application/octet-stream','cache-control':/\.(html|js|css|webmanifest)$/.test(target)?'no-cache':'public, max-age=3600','x-content-type-options':'nosniff'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}
});
const wss=new WebSocketServer({server,maxPayload:2048});
const send=(ws,msg)=>{if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(msg));};
const code=()=>{let n;do{n=randomBytes(4).toString('hex').slice(0,6).toUpperCase();}while(rooms.has(n));return n;};
const token=()=>randomBytes(24).toString('base64url');
const isOnline=(r,i)=>r.solo&&i===1 || r.players[i].socket?.readyState===WebSocket.OPEN;
const trimName=x=>String(x||'').trim().slice(0,22).replace(/[<>]/g,'')||'Người chơi';
function broadcast(r){
 for(let i=0;i<2;i++)send(r.players[i].socket,{type:'state',room:r.id,seat:i,token:r.players[i].token,gameId:r.gameId,state:r.gameId?publicState(r.gameId,r.match,i):null,connected:[isOnline(r,0),isOnline(r,1)],players:r.players.map((p,k)=>({name:p.name||`Người chơi ${k+1}`,connected:isOnline(r,k)})),rematch:r.rematch,history:r.history,solo:!!r.solo});
}
function enter(ws,r,seat){
 const p=r.players[seat];if(p.socket&&p.socket!==ws)p.socket.close(4001,'Reconnected from another device');
 p.socket=ws;ws.room=r.id;ws.seat=seat;r.updated=Date.now();broadcast(r);
}
function err(ws,message){send(ws,{type:'error',message});}
function summarize(r,reason='finished'){
 if(!r.gameId||!r.match)return;
 const m=r.match;
 if(m.seq===0||r.archivedMatch===m)return;
 const record={id:randomBytes(5).toString('hex'),gameId:r.gameId,gameName:GAMES[r.gameId].name,at:new Date().toISOString(),reason,turns:m.seq,status:m.status,winner:m.status==='finished'?m.winner:null,players:r.players.map(p=>p.name),score:r.gameId==='quan'?m.score.map((x,i)=>x-(m.borrow[i]||0)):r.gameId==='rps'?m.scores:r.gameId==='ganh'?[m.cells.filter(x=>x===0).length,m.cells.filter(x=>x===1).length]:null};
 r.archivedMatch=m;r.history.unshift(record);r.history=r.history.slice(0,30);
}
function botAction(r){
 if(!r.solo||!r.match||r.match.status!=='playing'||r.gameId===null)return;
 if(r.botTimer)clearTimeout(r.botTimer);
 r.botTimer=setTimeout(()=>{
  if(!rooms.has(r.id)||!r.solo||!r.match||r.match.status!=='playing')return;
  const seat=1,m=r.match,id=r.gameId;
  if(id!=='rps'&&m.turn!==seat)return;
  if(id==='rps'&&m.choices[seat]!==null)return;
  let choices=[];
  if(id==='quan')for(let pit=6;pit<=10;pit++)if(m.cells[pit].n>0)for(const dir of [-1,1])choices.push({pit,dir});
  if(id==='caro')for(let idx=0;idx<100;idx++)if(m.cells[idx]===null)choices.push({idx});
  if(id==='ganh')for(let from=0;from<25;from++)if(m.cells[from]===1)for(let to=0;to<25;to++)if(m.cells[to]===null)choices.push({from,to});
  if(id==='rps')choices=[{choice:Math.floor(Math.random()*3)}];
  let picked=null,high=-Infinity;
  for(const a of choices){try{
   const result=applyAction(id,m,seat,a),st=result.state;
   const weight=id==='quan'?(st.score[1]-m.score[1])*3+Math.random()*2:id==='ganh'?st.cells.filter(x=>x===1).length*3+Math.random():id==='caro'? (st.status==='finished'&&st.winner===1?100:Math.random()*8-Math.abs(a.idx%10-4.5)*.2):Math.random();
   if(weight>high){high=weight;picked={action:a,result};}
  }catch{}}
  if(!picked)return;
  r.match=picked.result.state;r.rematch=[false,false];
  for(const p of r.players)send(p.socket,{type:'animation',gameId:id,seq:r.match.seq,events:picked.result.events});
  if(r.match.status==='finished')summarize(r);
  broadcast(r);if(r.match.status==='playing')botAction(r);
 },r.gameId==='rps'?950:550);
 r.botTimer.unref?.();
}
function switchGame(r,id){
 if(!GAME_IDS.includes(id))throw Error('Trò chơi chưa được hỗ trợ online');
 summarize(r,'switched');r.gameId=id;r.match=newMatch(id);r.rematch=[false,false];r.updated=Date.now();
 broadcast(r);botAction(r);
}
wss.on('connection',ws=>{
 ws.alive=true;ws.room=null;ws.seat=null;ws.reactionAt=0;
 ws.on('pong',()=>ws.alive=true);
 ws.on('message',raw=>{
  let msg;try{msg=JSON.parse(raw.toString());}catch{err(ws,'Dữ liệu không hợp lệ');return;}
  try{
   if(msg.type==='create'){
    if(ws.room)throw Error('Bạn đã ở trong phòng');
    const id=code(),r={id,gameId:null,match:null,solo:msg.solo===true,history:[],players:[{token:token(),socket:null,name:trimName(msg.name)},{token:null,socket:null,name:'Người chơi 2'}],rematch:[false,false],updated:Date.now()};
    if(r.solo){r.players[1].token='BOT';r.players[1].name='Máy làng 🎋';}rooms.set(id,r);enter(ws,r,0);return;
   }
   if(msg.type==='join'||msg.type==='resume'){
    if(ws.room)throw Error('Bạn đã ở trong phòng');
    const id=String(msg.code||'').trim().toUpperCase(),r=rooms.get(id);
    if(!r)throw Error('Phòng không tồn tại hoặc đã hết hạn');
    if(msg.type==='resume'){
     const seat=r.players.findIndex(p=>p.token&&p.token===msg.token);
     if(seat<0)throw Error('Phiên kết nối không hợp lệ');
     enter(ws,r,seat);return;
    }
    if(r.solo)throw Error('Phòng luyện tập không nhận khách');const seat=r.players.findIndex(p=>!p.token);
    if(seat===-1)throw Error('Phòng đã đủ 2 người');
    r.players[seat].token=token();r.players[seat].name=trimName(msg.name);enter(ws,r,seat);return;
   }
   const r=rooms.get(ws.room);
   if(!r||r.players[ws.seat]?.socket!==ws)throw Error('Bạn chưa vào phòng');
   r.updated=Date.now();
   if(msg.type==='leave'){
    const seat=ws.seat;r.players[seat].socket=null;r.players[seat].token=null;
    ws.room=null;ws.seat=null;send(ws,{type:'left'});
    if(r.players.every(p=>!p.token))rooms.delete(r.id);else{if(r.gameId)summarize(r,'abandoned');if(r.gameId)r.match=newMatch(r.gameId);r.rematch=[false,false];broadcast(r);}
    return;
   }
   if(msg.type==='name'){r.players[ws.seat].name=trimName(msg.name);broadcast(r);return;}
   if(msg.type==='select_game'){
    if(ws.seat!==0)throw Error('Chỉ chủ phòng được chọn trò chơi');
    switchGame(r,msg.gameId);return;
   }
   if(msg.type==='return_lobby'){
    if(ws.seat!==0)throw Error('Chỉ chủ phòng đổi trò chơi');
    summarize(r,'switched');r.gameId=null;r.match=null;r.rematch=[false,false];broadcast(r);return;
   }
   if(msg.type==='reaction'){
    const emoji=String(msg.emoji||'');
    if(!['👏','😂','😮','🔥','❤️','👍','🎉','🌾'].includes(emoji))throw Error('Emoji không hợp lệ');
    if(Date.now()-ws.reactionAt<650)throw Error('Gửi emoji chậm lại một chút nhé');
    ws.reactionAt=Date.now();for(const p of r.players)send(p.socket,{type:'reaction',emoji,seat:ws.seat});return;
   }
   if(msg.type==='move'){
    if(!r.gameId||!r.match)throw Error('Hãy chọn trò chơi trước');
    if(!isOnline(r,0)||!isOnline(r,1))throw Error('Đang đợi cả hai người kết nối');
    if(msg.seq!==r.match.seq)throw Error('Nước đi đã cũ, hãy thử lại');
    const {state,events}=applyAction(r.gameId,r.match,ws.seat,msg);
    r.match=state;r.rematch=[false,false];if(state.status==='finished')summarize(r);
    for(const p of r.players)send(p.socket,{type:'animation',gameId:r.gameId,seq:state.seq,events});
    broadcast(r);botAction(r);return;
   }
   if(msg.type==='rematch'){
    if(!r.match||r.match.status!=='finished')throw Error('Ván chơi chưa kết thúc');
    r.rematch[ws.seat]=true;if(r.solo)r.rematch[1]=true;
    if(r.rematch.every(Boolean))r.match=newMatch(r.gameId),r.rematch=[false,false];
    broadcast(r);if(r.solo)botAction(r);return;
   }
   throw Error('Lệnh không hợp lệ');
  }catch(e){err(ws,e.message);}
 });
 ws.on('close',()=>{
  const r=rooms.get(ws.room);
  if(r?.players[ws.seat]?.socket===ws){r.players[ws.seat].socket=null;r.updated=Date.now();broadcast(r);}
 });
});
setInterval(()=>{
 for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}
 const now=Date.now();for(const [id,r] of rooms)if(now-r.updated>3*60*60*1000&&r.players.every(p=>!p.socket))rooms.delete(id);
},30000).unref();
server.listen(port,'0.0.0.0',()=>console.log(`Sân Đình Tuổi Thơ V3: http://localhost:${port}`));
