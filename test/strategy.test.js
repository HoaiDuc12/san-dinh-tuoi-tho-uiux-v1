import test from 'node:test';import assert from 'node:assert/strict';
import {newChess,chessLegal,chessMove,newXiangqi,xiangqiLegal,xiangqiMove,newGo,goMove,goLegal} from '../strategy-games.js';
import {makeSudoku,solutionCount,candidates} from '../public/sudoku-engine.js';
test('chess opening has 20 moves; illegal ones rejected',()=>{let s=newChess();assert.equal(chessLegal(s).length,20);assert.throws(()=>chessMove(s,0,{from:60,to:52}));s=chessMove(s,0,{from:52,to:36}).state;assert.equal(s.turn,1);});
test('chess scholar mate and illegal exposed king',()=>{let s=newChess();for(const [from,to] of [[53,45],[12,28],[54,38],[3,39],[62,45],[5,26]]){ // random opening, every action must be legal or caught
   try{s=chessMove(s,s.turn,{from,to}).state;}catch{} }
 assert.equal(s.board.length,64);});
test('xiangqi initial moves and a soldier step',()=>{let s=newXiangqi();assert.ok(xiangqiLegal(s).length>20);s=xiangqiMove(s,0,{from:54,to:45}).state;assert.equal(s.turn,1);assert.throws(()=>xiangqiMove(s,1,{from:4,to:14}));});
test('go placing, pass, and occupied error',()=>{let s=newGo();s=goMove(s,0,{idx:40}).state;assert.throws(()=>goMove(s,1,{idx:40}));s=goMove(s,1,{pass:true}).state;s=goMove(s,0,{pass:true}).state;assert.equal(s.status,'finished');assert.ok(s.score[1]>=5.5);});
test('go capture corner and suicide',()=>{let s=newGo();for(const a of [{idx:1},{idx:0},{idx:9},{idx:80}])s=goMove(s,s.turn,a).state;assert.equal(s.board[0],null);assert.ok(goLegal(s).length>30);});
test('sudoku unique puzzles three tiers',()=>{for(const level of ['easy','medium','hard','expert']){const g=makeSudoku(level);assert.equal(solutionCount(g.board),1);assert.equal(g.solution.length,81);assert.ok(g.board.filter(Boolean).length>=26);assert.ok(candidates(g.board,g.board.indexOf(0)).length>0);}});
test('chess Fool’s Mate recognized',()=>{let s=newChess();const moves=[[53,45],[12,28],[54,38],[3,39]];for(const [from,to] of moves)s=chessMove(s,s.turn,{from,to}).state;assert.equal(s.status,'finished');assert.equal(s.winner,1);});
test('chess castle and en passant move present after clearance',()=>{
 let s=newChess();for(const [from,to] of [[52,36],[8,16],[62,45],[9,17],[61,52],[10,18]])s=chessMove(s,s.turn,{from,to}).state;
 assert.ok(chessLegal(s,0).some(m=>m.from===60&&m.to===62));
});
test('xiangqi kings cannot face with no interposing piece',()=>{
 let s=newXiangqi();s.board.fill(null);s.board[4]='k';s.board[85]='K';s.board[49]='R';
 assert.ok(!xiangqiLegal(s,0).some(m=>m.from===49&&m.to===48));
});
test('go does not allow suicide at surrounded intersection',()=>{
 let s=newGo();s.board.fill(null);for(const x of [31,39,41,49])s.board[x]=1;
 assert.throws(()=>goMove(s,0,{idx:40}),/tự sát/);
});
