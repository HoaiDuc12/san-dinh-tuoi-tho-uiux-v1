import test from 'node:test';
import assert from 'node:assert/strict';
import {newMatch,applyAction,ganhNeighbors,publicState,GAME_IDS} from '../games.js';

test('four online titles available',()=>assert.deepEqual(GAME_IDS.sort(),['caro','ganh','quan','rps']));
test('Ô Ăn Quan only allows current player own side',()=>{
 const s=newMatch('quan');
 assert.throws(()=>applyAction('quan',s,1,{pit:6,dir:1}),/lượt/);
 assert.throws(()=>applyAction('quan',s,0,{pit:6,dir:1}),/không hợp lệ/);
 const next=applyAction('quan',s,0,{pit:0,dir:1});assert.equal(next.state.seq,1);assert.equal(s.seq,0);
});
test('Caro recognizes five signs in same column',()=>{
 let s=newMatch('caro');const seq=[0,1,10,11,20,21,30,31,40];
 for(let i=0;i<seq.length;i++)s=applyAction('caro',s,i%2,{idx:seq[i]}).state;
 assert.equal(s.status,'finished');assert.equal(s.winner,0);assert.ok(s.winning.includes(40));
});
test('Caro stops invalid cell and wrong-turn moves',()=>{
 const s=newMatch('caro');assert.throws(()=>applyAction('caro',s,1,{idx:0}),/lượt/);
 const first=applyAction('caro',s,0,{idx:22}).state;
 assert.throws(()=>applyAction('caro',first,1,{idx:22}),/không hợp lệ/);
});
test('Cờ Gánh has 8 tokens per side with legal diagonals only',()=>{
 const s=newMatch('ganh');assert.equal(s.cells.filter(x=>x===0).length,8);assert.equal(s.cells.filter(x=>x===1).length,8);
 assert.ok(ganhNeighbors(12).includes(6));assert.ok(!ganhNeighbors(11).includes(5));
 assert.throws(()=>applyAction('ganh',s,0,{from:20,to:14}),/không hợp lệ/);
});
test('Cờ Gánh performs legal first movement',()=>{
 const s=newMatch('ganh'),out=applyAction('ganh',s,0,{from:20,to:16});
 assert.equal(out.state.cells[20],null);assert.equal(out.state.cells[16],0);assert.equal(out.state.turn,1);
});
test('Cờ Gánh converts opposing tokens when gánh',()=>{
 const s=newMatch('ganh');s.cells=Array(25).fill(null);s.cells[7]=0;s.cells[11]=1;s.cells[13]=1;
 s.turn=0;const next=applyAction('ganh',s,0,{from:7,to:12}).state;
 assert.equal(next.cells[11],0);assert.equal(next.cells[13],0);assert.ok(next.captured.includes(11));
});
test('RPS choices remain secret and reveal after both pick',()=>{
 const a=newMatch('rps');const b=applyAction('rps',a,0,{choice:0}).state;
 const pubForOpponent=publicState('rps',b,1);
 assert.equal(pubForOpponent.yourChoice,null);assert.deepEqual(pubForOpponent.choices,[true,false]);
 assert.equal(JSON.stringify(pubForOpponent).includes('"choices":[0'),false);
 const c=applyAction('rps',b,1,{choice:2}).state;
 assert.equal(c.scores[0],1);assert.deepEqual(c.reveal.choices,[0,2]);
});
test('RPS cannot choose twice during waiting round',()=>{
 const a=applyAction('rps',newMatch('rps'),0,{choice:0}).state;
 assert.throws(()=>applyAction('rps',a,0,{choice:1}),/chọn rồi/);
});
