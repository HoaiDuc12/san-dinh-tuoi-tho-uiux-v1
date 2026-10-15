// Unique-solution Sudoku puzzles, shuffled from a valid seed grid.
export const SUDOKU_LEVELS={easy:{name:'Dễ',clues:44},medium:{name:'Vừa',clues:36},hard:{name:'Khó',clues:30},expert:{name:'Chuyên gia',clues:26}};
const shuffled=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;};
const BASE=(r,c)=>(r*3+Math.floor(r/3)+c)%9+1;
export function createSolution(){
 const digits=shuffled([1,2,3,4,5,6,7,8,9]);
 const shuffleIndex=()=>shuffled([0,1,2]).flatMap(group=>shuffled([0,1,2]).map(i=>group*3+i));
 const rows=shuffleIndex(),cols=shuffleIndex();
 return rows.flatMap(r=>cols.map(c=>digits[BASE(r,c)-1]));
}
const peers=i=>{const r=Math.floor(i/9),c=i%9,set=new Set();for(let x=0;x<9;x++){set.add(r*9+x);set.add(x*9+c);set.add((Math.floor(r/3)*3+Math.floor(x/3))*9+Math.floor(c/3)*3+x%3);}set.delete(i);return [...set];};
export const PEERS=Array.from({length:81},(_,i)=>peers(i));
export function candidates(board,i){if(board[i])return [];const banned=new Set(PEERS[i].map(j=>board[j]));return [1,2,3,4,5,6,7,8,9].filter(n=>!banned.has(n));}
export function solutionCount(board,cap=2){
 let found=0;const b=board.slice();function dfs(){if(found>=cap)return;
  let index=-1,opts=null;for(let i=0;i<81;i++)if(!b[i]){const c=candidates(b,i);if(!c.length)return;if(opts===null||c.length<opts.length){opts=c;index=i;if(opts.length===1)break;}}
  if(index===-1){found++;return;}for(const n of opts){b[index]=n;dfs();b[index]=0;if(found>=cap)return;}
 }dfs();return found;
}
export function makeSudoku(level='easy'){
 const solution=createSolution(),board=solution.slice(),target=SUDOKU_LEVELS[level]?.clues||44;
 const indices=shuffled(Array.from({length:81},(_,i)=>i));
 for(const idx of indices){if(board.filter(Boolean).length<=target)break;const old=board[idx];board[idx]=0;if(solutionCount(board,2)!==1)board[idx]=old;}
 return {level,board,solution,givens:board.map(Boolean),createdAt:Date.now()};
}
export function sudokuConflicts(board,idx){const val=board[idx];return val?PEERS[idx].filter(j=>board[j]===val):[];}
