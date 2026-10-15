import {makeSudoku,PEERS,sudokuConflicts,SUDOKU_LEVELS} from './sudoku-engine.js';
const KEY='sandinh-sudoku-progress-v6',STATS='sandinh-sudoku-records-v6';
const $=id=>document.getElementById(id);
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}};
const formatTime=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
export function initSudoku({toast,beep}){
 let current=read(KEY,null),records=read(STATS,{}),selected=0,noteMode=false,history=[],wrongShown=false,active=false,interval=null;
 function save(){if(current)localStorage.setItem(KEY,JSON.stringify(current));localStorage.setItem(STATS,JSON.stringify(records));}
 function newGame(level='easy'){const puzzle=makeSudoku(level);current={...puzzle,entries:puzzle.board.slice(),notes:Array(81).fill(null).map(()=>[]),seconds:0,hints:0,done:false,startedAt:Date.now()};selected=current.board.findIndex(n=>!n);history=[];wrongShown=false;save();draw();}
 function draw(){if(!current)return;
  $('sdk-level').value=current.level;$('sdk-clock').textContent='⏱ '+formatTime(current.seconds||0);
  $('sdk-progress').textContent=`${current.entries.filter(Boolean).length} / 81 ô`;
  const grid=$('sudoku-grid');grid.replaceChildren();
  const sr=Math.floor(selected/9),sc=selected%9,chosen=current.entries[selected];
  for(let i=0;i<81;i++){
   const b=document.createElement('button');b.type='button';b.className='sdk-cell';b.dataset.idx=i;
   const row=Math.floor(i/9),col=i%9,val=current.entries[i];
   if(current.givens[i])b.classList.add('given');
   if(row===sr||col===sc||(Math.floor(row/3)===Math.floor(sr/3)&&Math.floor(col/3)===Math.floor(sc/3)))b.classList.add('peer');
   if(i===selected)b.classList.add('focused');
   if(val&&val===chosen)b.classList.add('same-number');
   if(val&&sudokuConflicts(current.entries,i).length)b.classList.add('conflict');
   if(wrongShown&&val&&val!==current.solution[i])b.classList.add('mistake');
   if(val)b.textContent=String(val);
   else if(current.notes[i]?.length){const small=document.createElement('span');small.className='sdk-notes';for(let n=1;n<=9;n++){const e=document.createElement('span');e.textContent=current.notes[i].includes(n)?n:'';small.append(e);}b.append(small);}
   b.setAttribute('aria-label',`Hàng ${row+1} cột ${col+1}: ${val||'trống'}${current.givens[i]?' cố định':''}`);
   b.onclick=()=>{selected=i;wrongShown=false;draw();};grid.append(b);
  }
  const pad=$('sdk-pad');pad.replaceChildren();for(let v=1;v<=9;v++){
   const btn=document.createElement('button');btn.type='button';btn.textContent=v;
   const remaining=9-current.entries.filter(n=>n===v).length;btn.title=`Số ${v} · còn ${remaining} ô`;
   const remain=document.createElement('small');remain.textContent=remaining;remain.setAttribute('aria-hidden','true');btn.append(remain);if(remaining===0)btn.classList.add('complete');btn.onclick=()=>writeDigit(v);pad.append(btn);
  }
  $('sdk-notes').classList.toggle('active',noteMode);$('sdk-notes').setAttribute('aria-pressed',String(noteMode));
  const row=records[current.level]||{wins:0,best:null,perfect:0};
  $('sdk-records').innerHTML=`<strong>🏆 Thành tích · ${SUDOKU_LEVELS[current.level].name}</strong><span>Đã giải: ${row.wins||0} đề</span><span>Nhanh nhất: ${row.best===null?'—':formatTime(row.best)}</span><span>Không gợi ý: ${row.perfect||0} đề</span><small>Lưu trên trình duyệt này</small>`;
  $('sudoku-status').textContent=current.done?'🏮 Tuyệt vời! Anh đã hoàn thành đề này.':noteMode?'✎ Ghi chú: chạm số để thêm/bỏ số nhỏ.':'Chạm ô, rồi chọn số. Ô đỏ là số trùng trong hàng/cột/vùng.';
  $('sdk-undo').disabled=!history.length;$('sdk-hint').disabled=!!current.done;
 }
 function mutate(callback){if(!current||current.done||current.givens[selected])return;
  history.push({entries:current.entries.slice(),notes:current.notes.map(a=>a.slice()),hints:current.hints});if(history.length>100)history.shift();callback();wrongShown=false;save();draw();checkCompleted();
 }
 function writeDigit(n){if(!current||current.done)return;
  if(current.givens[selected]){toast('Ô số cố định không thể sửa');return;}
  mutate(()=>{if(noteMode){const arr=current.notes[selected];current.notes[selected]=arr.includes(n)?arr.filter(x=>x!==n):[...arr,n].sort();}else{current.entries[selected]=n;current.notes[selected]=[];}});
  beep(520,.012,.08);
 }
 function checkCompleted(){if(current?.entries.every((v,i)=>v===current.solution[i])){
  current.done=true;const r=records[current.level]||{wins:0,best:null,perfect:0};r.wins++;if(r.best===null||current.seconds<r.best)r.best=current.seconds;if(!current.hints)r.perfect++;records[current.level]=r;save();draw();toast('🎉 Đã hoàn thành Sudoku · '+formatTime(current.seconds));beep(900,.04,.18);
 }}
 function undo(){if(!history.length||current.done)return;const old=history.pop();current.entries=old.entries;current.notes=old.notes;current.hints=old.hints;wrongShown=false;save();draw();}
 function hint(){if(!current||current.done)return;const empty=current.entries.map((n,i)=>!current.givens[i]&&n!==current.solution[i]?i:-1).filter(i=>i>=0);if(!empty.length)return;
  const at=empty.includes(selected)?selected:empty[0];selected=at;mutate(()=>{current.entries[at]=current.solution[at];current.notes[at]=[];current.hints++;});toast('✦ Gợi ý đã điền đúng một ô');
 }
 $('sudoku-close').onclick=()=>$('sudoku-dialog').close();
 $('sdk-notes').onclick=()=>{noteMode=!noteMode;draw();};
 $('sdk-erase').onclick=()=>mutate(()=>{current.entries[selected]=0;current.notes[selected]=[];});
 $('sdk-undo').onclick=undo;$('sdk-hint').onclick=hint;
 $('sudoku-check').onclick=()=>{if(!current)return;wrongShown=true;draw();const wrong=current.entries.filter((n,i)=>n&&n!==current.solution[i]).length;toast(wrong?`${wrong} ô chưa đúng đã được tô đỏ`:'Chính xác đến đây rồi!');};
 $('sudoku-new').onclick=()=>{if(current&&!current.done&&current.entries.some((v,i)=>!current.givens[i]&&v)&&!confirm('Tạo đề mới sẽ thay đề đang chơi. Tiếp tục?'))return;newGame($('sdk-level').value);};
 $('sdk-level').onchange=()=>{const next=$('sdk-level').value;if(current&&!current.done&&current.entries.some((v,i)=>!current.givens[i]&&v)&&!confirm('Thay mức độ khó sẽ tạo đề mới. Tiếp tục?')){$('sdk-level').value=current.level;return;}newGame(next);};
 document.addEventListener('keydown',e=>{if(!$('sudoku-dialog').open||!current||e.target.matches('select'))return;
  const step={ArrowLeft:-1,ArrowRight:1,ArrowUp:-9,ArrowDown:9}[e.key];if(step){e.preventDefault();selected=Math.max(0,Math.min(80,selected+step));draw();return;}
  if(/^[1-9]$/.test(e.key)){e.preventDefault();writeDigit(Number(e.key));}else if(['Delete','Backspace','0'].includes(e.key)){e.preventDefault();$('sdk-erase').click();}else if(e.key.toLowerCase()==='n'){noteMode=!noteMode;draw();}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo();}
 });
 $('sudoku-dialog').addEventListener('close',()=>{active=false;save();});
 interval=setInterval(()=>{if(active&&current&&!current.done){current.seconds++;$('sdk-clock').textContent='⏱ '+formatTime(current.seconds);if(current.seconds%5===0)save();}},1000);
 return {open(){if(!current||!current.entries||current.done)newGame('easy');active=true;draw();$('sudoku-dialog').showModal();}};
}
