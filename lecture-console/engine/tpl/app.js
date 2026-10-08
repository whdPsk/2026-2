(function(){
'use strict';
var DATA=JSON.parse(document.getElementById('amdata').textContent);
/* ── storage: localStorage mirror + per-viewer db doc ── */
var LS=null; try{localStorage.setItem('_t','1');localStorage.removeItem('_t');LS=localStorage;}catch(e){LS=null;}
var K=DATA.storageKey||'console.v1';
function lget(k){try{return LS?LS.getItem(k):null}catch(e){return null}}
function lset(k,v){try{if(LS)LS.setItem(k,v)}catch(e){}}
var ST={st:{},qz:{},note:{},t:0};
try{var raw=lget(K); if(raw){var o=JSON.parse(raw); ST.st=o.st||{}; ST.qz=o.qz||{}; ST.note=o.note||{}; ST.t=o.t||0;}}catch(e){}
var dbRef=null, saveT=null, syncEl=document.getElementById('sync');
function persist(){
  ST.t=Date.now(); lset(K,JSON.stringify(ST));
  if(!dbRef) return;
  clearTimeout(saveT);
  saveT=setTimeout(function(){
    dbRef.set({st:ST.st,qz:ST.qz,note:ST.note,t:ST.t}).then(function(){syncEl.textContent='동기화됨';syncEl.className='on';})
      .catch(function(){syncEl.textContent='이 기기에만 저장';syncEl.className='';});
  },1200);
}
(function connect(){
  if(!window.claude||!window.claude.use){ syncEl.textContent=LS?'이 기기에만 저장':''; return; }
  Promise.all([window.claude.use('db'),window.claude.use('user')]).then(function(r){
    var db=r[0], user=r[1];
    if(!db||!user){ syncEl.textContent=LS?'이 기기에만 저장':''; return; }
    return user.id().then(function(uid){
      if(!uid){ syncEl.textContent=LS?'이 기기에만 저장':''; return; }
      dbRef=db.doc('data/users/'+uid+'/progress');
      return dbRef.get().then(function(snap){
        var d=snap.exists?snap.data():null;
        if(d && (d.t||0)>=(ST.t||0)){
          ST.st=Object.assign({},d.st||{}); ST.qz=Object.assign({},d.qz||{}); ST.note=Object.assign({},d.note||{}); ST.t=d.t||0;
          lset(K,JSON.stringify(ST)); rehydrate();
        } else if(ST.t){ persist(); }
        syncEl.textContent='동기화됨'; syncEl.className='on';
      });
    });
  }).catch(function(){ syncEl.textContent=LS?'이 기기에만 저장':''; });
})();

var UNITS=DATA.units, CH=DATA.chapters;
var uMeta={}; UNITS.forEach(function(u){uMeta[u.id]=u;});
var units=[].slice.call(document.querySelectorAll('article.unit'));
var exs=[].slice.call(document.querySelectorAll('article.ex'));
var ids=units.map(function(u){return u.id});
function rangeOfCh(c){return (CH[c]||{}).range||1;}
function rangeOfUnit(id){return rangeOfCh(uMeta[id].ch);}
function chOk(sel,ch){ if(sel==='all')return true;
  if(sel==='mid')return rangeOfCh(ch)===1; if(sel==='fin')return rangeOfCh(ch)===2;
  if(sel==='lec')return false;
  return String(ch)===sel; }
var RLAB={1:'중간',2:'기말'};

/* ── rail ── */
var rail=document.getElementById('rail');
(function(){var cur=null,html='';
 ids.forEach(function(id){var m=uMeta[id], c=m.ch;
  if(c!==cur){cur=c;var rr=rangeOfCh(c);
    html+='<h6 data-ch="'+c+'">Ch.'+c+' · '+CH[c].ko+' <span class="rngbadge r'+rr+'">'+RLAB[rr]+'</span></h6>';}
  html+='<a href="#/'+id+'" data-u="'+id+'"><span class="st">○</span><span class="ix">'+id.slice(1)+'</span><span class="tt">'+m.title+(m.lec?'<span class="lecdot" title="강의에서 다룸"></span>':'')+'</span></a>';});
 rail.insertAdjacentHTML('beforeend',html);})();

/* ── progress ── */
var MARK=['○','◐','●'];
function setState(id,s){ if(s) ST.st[id]=s; else delete ST.st[id]; persist(); paint(); }
function paint(){
  var d=ST.st;
  ids.forEach(function(id){
    var s=d[id]||0, a=rail.querySelector('a[data-u="'+id+'"]');
    if(a){var e=a.querySelector('.st'); e.textContent=MARK[s]; e.className='st s'+s;}
  });
  var mb=document.querySelector('article.unit.active .mstbar');
  if(mb){var s=d[activeId]||0;
    mb.querySelectorAll('button').forEach(function(b){b.classList.toggle('on',+b.dataset.s===s&&s>0);});}
  var mid=0,fin=0,read=0,lecm=0,lect=0; ids.forEach(function(id){var s=d[id]||0;
    if(s===2){ if(rangeOfUnit(id)===1) mid++; else fin++; } if(s>=1)read++;
    if(uMeta[id].lec){lect++; if(s===2)lecm++;} });
  var weak=0,good=0; for(var k in ST.qz){ if(ST.qz[k]===0) weak++; else if(ST.qz[k]===1) good++; }
  setT('k-mid',mid); setT('k-fin',fin); setT('k-read',read); setT('k-weak',weak); setT('k-done',good);
  setT('k-lec',lecm+' / '+lect);
}
function setT(id,v){var e=document.getElementById(id); if(e) e.textContent=v;}

/* ── unit chrome ── */
var PMAP=DATA.probmap||{};
units.forEach(function(u,i){
  var body=u.querySelector('.unit-body')||u;
  var rel=Object.keys(PMAP).filter(function(p){return PMAP[p]===u.id;});
  var relHtml = rel.length ? '<div class="relprob"><b>이 단원 관련 과제·연습</b> — '+
      rel.map(function(p){return '<a href="#/hw?p='+encodeURIComponent(p)+'">'+p+'</a>';}).join('')+'</div>' : '';
  var exl = exs.filter(function(e){return e.dataset.unit===u.id;})
               .map(function(e){var n=e.dataset.num;
                 return '<a href="#/examples?e='+n+'">'+(DATA.exLabel||'Example')+' '+n+(e.dataset.lec?' ★':'')+'</a>';});
  var exHtml = exl.length ? '<div class="exlist"><b>이 단원의 '+(DATA.exLabel==='Example'?'교과서 Example':(DATA.exLabel||'예제'))+'</b> — '+exl.join('')+
      (DATA.exLabel==='Example'?' <span class="note">(★ = 강의노트에서 지정 · 각 Example마다 +α 변형 2개)</span>':'')+'</div>' : '';
  var prev=i>0?ids[i-1]:null, next=i<ids.length-1?ids[i+1]:null;
  body.insertAdjacentHTML('beforeend',
    exHtml+relHtml+
    '<div class="unote"><label for="note-'+u.id+'">내 메모 — 수업에서 교수님이 강조하신 것, 헷갈린 점</label>'+
    '<textarea id="note-'+u.id+'" data-note="'+u.id+'" placeholder="강의노트에 없는 판서·구두 강조를 적어두세요."></textarea>'+
    '<div class="hint">자동 저장됩니다.</div></div>'+
    '<div class="mstbar"><strong>이 단원</strong>'+
    '<button data-s="1">봤음</button><button data-s="2">숙달</button>'+
    '<span class="hint">유도를 빈 종이에 처음부터 재구성할 수 있을 때만 숙달로 표시하세요</span></div>'+
    '<div class="unav">'+
    (prev?'<a class="pv" href="#/'+prev+'"><small>이전</small>'+uMeta[prev].title+'</a>':'<a class="pv off" href="#/'+ids[0]+'">·</a>')+
    (next?'<a class="nx" href="#/'+next+'"><small>다음</small>'+uMeta[next].title+'</a>':'<a class="nx off" href="#/'+ids[0]+'">·</a>')+
    '</div>');
  u.querySelector('.mstbar').addEventListener('click',function(e){
    var b=e.target.closest('button[data-s]'); if(!b) return;
    var cs=ST.st[u.id]||0, ns=+b.dataset.s;
    setState(u.id, cs===ns?0:ns);
  });
});

/* ── notes ── */
var noteT=null;
document.querySelectorAll('textarea[data-note]').forEach(function(ta){
  ta.addEventListener('input',function(){
    clearTimeout(noteT); noteT=setTimeout(function(){
      var v=ta.value.trim();
      if(v) ST.note[ta.dataset.note]=v; else delete ST.note[ta.dataset.note];
      persist();
    },500);
  });
});

/* ── checkpoints ── */
function paintQz(){
  document.querySelectorAll('.qz').forEach(function(q){
    var v=ST.qz[q.dataset.q];
    q.classList.toggle('flag',v===0);
    q.querySelectorAll('[data-v]').forEach(function(b){b.classList.toggle('on',v===+b.dataset.v);});
  });
}
document.addEventListener('click',function(e){
  var q=e.target.closest('.qz'); if(!q) return;
  var r=e.target.closest('.rv');
  if(r){ q.classList.add('open'); texNow(q); return; }
  var v=e.target.closest('button[data-v]');
  if(v){
    var id=q.dataset.q, val=+v.dataset.v;
    if(ST.qz[id]===val) delete ST.qz[id]; else ST.qz[id]=val;
    persist(); paintQz(); paint(); buildWeak();
  }
});
function rehydrate(){
  document.querySelectorAll('textarea[data-note]').forEach(function(ta){ta.value=ST.note[ta.dataset.note]||'';});
  paintQz(); paint(); if(activeView==='status'){buildGrid();buildWeak();}
}

/* ── MathJax: visible-first, then background ── */
var texEl=document.getElementById('tex'), pend=[], total=0, doneN=0, pumping=false;
function collect(){
  units.forEach(function(u){pend.push(u);});
  exs.forEach(function(e){pend.push(e);});
  document.querySelectorAll('.view:not(#v-study) .page').forEach(function(e){pend.push(e);});
  total=pend.length;
}
function tex(el){
  if(!el||el.dataset.tex||!window.MathJax||!MathJax.typesetPromise) return Promise.resolve();
  el.dataset.tex='1';
  return MathJax.typesetPromise([el]).catch(function(){}).then(function(){
    doneN++; texEl.textContent = doneN>=total ? '' : '수식 '+Math.min(99,Math.round(100*doneN/total))+'%';
  });
}
function pump(){ if(pumping) return; pumping=true;
  (function step(){
    var el; do{ el=pend.shift(); }while(el&&el.dataset.tex);
    if(!el){ texEl.textContent=''; pumping=false; return; }
    tex(el).then(function(){ setTimeout(step,0); });
  })();
}
function texNow(el){ if(el&&!el.dataset.tex){ total++; return tex(el); } return Promise.resolve(); }

/* ── router ── */
var VIEWS=['study','lecture','examples','formulas','hw','status'];
if(document.getElementById('v-lab')) VIEWS.push('lab');
var activeId=ids[0], activeView='study';
function showView(v){
  activeView=v;
  document.querySelectorAll('.view').forEach(function(e){e.classList.toggle('active',e.id==='v-'+v);});
  document.querySelectorAll('#modes button').forEach(function(b){b.setAttribute('aria-current',String(b.dataset.view===v));});
  rail.hidden = v!=='study';
  document.querySelector('.shell').style.gridTemplateColumns = v==='study' ? '' : '1fr';
  if(v!=='study') texNow(document.querySelector('#v-'+v+' .page'));
  if(v==='examples') filterEx();
  if(v==='formulas') buildFormulas();
  if(v==='hw') filterProbs();
  if(v==='status'){ paint(); buildGrid(); buildWeak(); }
  if(v==='lab' && window.labInit) window.labInit();
}
function showUnit(id){
  if(ids.indexOf(id)<0) id=ids[0];
  activeId=id;
  units.forEach(function(u){u.classList.toggle('active',u.id===id);});
  rail.querySelectorAll('a[data-u]').forEach(function(a){a.setAttribute('aria-current',String(a.dataset.u===id));});
  var cur=rail.querySelector('a[data-u="'+id+'"]'); if(cur&&cur.scrollIntoView) cur.scrollIntoView({block:'nearest'});
  texNow(document.getElementById(id));
  if(!ST.st[id]) setState(id,1); else paint();
  window.scrollTo(0,0);
}
function route(){
  var h=(location.hash||'#/'+(DATA.frontier||ids[0])).replace(/^#\/?/,'');
  var qi=h.indexOf('?'), qs=qi>=0?h.slice(qi+1):''; if(qi>=0) h=h.slice(0,qi);
  if(VIEWS.indexOf(h)>0){
    showView(h);
    if(h==='hw'&&qs){ var m=/p=([^&]+)/.exec(qs); if(m) focusProb(decodeURIComponent(m[1])); }
    if(h==='examples'&&qs){ var me=/e=([\w.\-]+)/.exec(qs); if(me) focusEx(me[1]); }
    if(h==='lecture'&&qs){ var ml=/l=([\w-]+)/.exec(qs); if(ml){var t=document.getElementById('lec-'+ml[1]); if(t) setTimeout(function(){t.scrollIntoView({block:'start'});},60);} }
  } else if(h==='study'){ showView('study'); showUnit(activeId); }
  else { showView('study'); showUnit(h||ids[0]); }
}
window.addEventListener('hashchange',route);
document.getElementById('modes').addEventListener('click',function(e){
  var b=e.target.closest('button[data-view]'); if(!b) return;
  location.hash = b.dataset.view==='study' ? '#/'+activeId : '#/'+b.dataset.view;
});

/* ── formula sheet ── */
var fxBuilt=false;
function buildFormulas(){
  if(fxBuilt) return; fxBuilt=true;
  var out=document.getElementById('fx-out');
  out.innerHTML='<p class="note">단원 수식을 불러오는 중…</p>';
  Promise.all(units.map(function(u){return texNow(u);})).then(function(){
    var cur=null,frag=document.createElement('div');
    units.forEach(function(u){
      var boxes=u.querySelectorAll('.formula'); if(!boxes.length) return;
      var c=uMeta[u.id].ch;
      if(c!==cur){cur=c; frag.insertAdjacentHTML('beforeend','<div class="fx-group"><h3>Ch.'+c+' · '+CH[c].ko+'</h3></div>');}
      var g=frag.lastElementChild;
      boxes.forEach(function(b){
        var w=document.createElement('div'); w.className='fx-item';
        w.innerHTML='<div class="src"><a href="#/'+u.id+'">'+u.id.toUpperCase()+' · '+uMeta[u.id].title+'</a></div>';
        var cl=b.cloneNode(true); cl.removeAttribute('data-tex'); w.appendChild(cl); g.appendChild(w);
      });
    });
    out.innerHTML=''; out.appendChild(frag);
  });
}

/* ── hw / problems ── */
var probs=[].slice.call(document.querySelectorAll('details.prob'));
probs.forEach(function(p){
  p.dataset.txt=(p.textContent||'').toLowerCase();
  p.addEventListener('toggle',function(){ if(p.open) texNow(p); });
});
var pfCh='all';
function filterProbs(){
  var qe=document.getElementById('pq'); if(!qe) return;
  var q=(qe.value||'').trim().toLowerCase(), n=0;
  probs.forEach(function(p){
    var ok=chOk(pfCh,p.dataset.ch) && (!q||p.dataset.num.toLowerCase().indexOf(q)===0||p.dataset.txt.indexOf(q)>=0);
    p.hidden=!ok; if(ok) n++;
  });
  document.querySelectorAll('section.hwset').forEach(function(s){
    s.hidden=!s.querySelector('details.prob:not([hidden])');
  });
  setT('pcnt',n+' / '+probs.length+'문항');
}
var pf=document.getElementById('pf');
if(pf){
  pf.addEventListener('click',function(e){
    var b=e.target.closest('button[data-ch]'); if(!b) return;
    pfCh=b.dataset.ch;
    this.querySelectorAll('button[data-ch]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});
    filterProbs();
  });
  document.getElementById('pq').addEventListener('input',filterProbs);
}
function focusProb(num){
  var qe=document.getElementById('pq'); if(!qe) return;
  qe.value=''; pfCh='all';
  document.querySelectorAll('#pf button[data-ch]').forEach(function(x){x.setAttribute('aria-pressed',String(x.dataset.ch==='all'));});
  filterProbs();
  var t=probs.filter(function(p){return p.dataset.num===num;})[0];
  if(t){ t.open=true; texNow(t); setTimeout(function(){t.scrollIntoView({block:'center'});},60); }
}

/* ── examples ── */
exs.forEach(function(e){
  e.dataset.txt=((e.querySelector('.exh')||{}).textContent||'').toLowerCase()+' '+((e.querySelector('.exq')||{}).textContent||'').toLowerCase();
});
var efCh='all';
function filterEx(){
  var q=(document.getElementById('eq').value||'').trim().toLowerCase(), n=0;
  exs.forEach(function(e){
    var ok=(efCh==='lec'?!!e.dataset.lec:chOk(efCh,e.dataset.ch))&&(!q||e.dataset.num.indexOf(q)===0||e.dataset.txt.indexOf(q)>=0);
    e.hidden=!ok; if(ok){n++;}
  });
  setT('ecnt',n+' / '+exs.length+'제');
  var vis=exs.filter(function(e){return !e.hidden;}).slice(0,4); vis.forEach(texNow);
}
document.getElementById('ef').addEventListener('click',function(e){
  var b=e.target.closest('button[data-ch]'); if(!b) return;
  efCh=b.dataset.ch;
  this.querySelectorAll('button[data-ch]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});
  filterEx();
});
document.getElementById('eq').addEventListener('input',filterEx);
function focusEx(num){
  document.getElementById('eq').value=''; efCh='all';
  document.querySelectorAll('#ef button[data-ch]').forEach(function(x){x.setAttribute('aria-pressed',String(x.dataset.ch==='all'));});
  filterEx();
  var t=exs.filter(function(e){return e.dataset.num===num;})[0];
  if(t) texNow(t).then(function(){setTimeout(function(){t.scrollIntoView({block:'start'});},60);});
}

/* ── status ── */
function buildGrid(){
  var d=ST.st, h='', lastR=0;
  ids.forEach(function(id){var s=d[id]||0, r=rangeOfUnit(id), m=uMeta[id];
    if(r!==lastR){ lastR=r;
      h+='<div style="grid-column:1/-1;margin:'+(r===1?'0':'14px')+' 0 2px;font:700 11.5px/1 var(--sans);color:var(--ink3);letter-spacing:.06em">'+DATA.rangeLabel[r]+'</div>'; }
    h+='<a class="cell s'+s+(ST.note[id]?' hasnote':'')+(m.lec?' lecd':'')+'" href="#/'+id+'"><u>'+MARK[s]+' '+id.toUpperCase()+(m.lec?' · 강의':'')+'</u>'+m.title+'</a>';});
  document.getElementById('st-grid').innerHTML=h;
}
function buildWeak(){
  var h='';
  document.querySelectorAll('.qz').forEach(function(q){
    if(ST.qz[q.dataset.q]!==0) return;
    var u=q.closest('article.unit'), x=q.closest('article.ex');
    var t=((q.querySelector('.qq')||{}).textContent||'').replace(/\s+/g,' ').slice(0,110);
    if(u) h+='<a href="#/'+u.id+'"><em>'+u.id.toUpperCase()+'</em>'+t+'…</a>';
    else if(x) h+='<a href="#/examples?e='+x.dataset.num+'"><em>Ex '+x.dataset.num+'</em>'+t+'…</a>';
  });
  var el=document.getElementById('st-weak');
  if(el) el.innerHTML = h || '<div class="empty">아직 없습니다. 체크포인트를 풀고 <b>더 볼 것</b>을 누르면 여기 모입니다.</div>';
}

/* ── D-day ── */
(function(){
  var el=document.getElementById('dday'); if(!el) return;
  var now=new Date(), best=null;
  (DATA.exams||[]).forEach(function(x){ var d=new Date(x.date+'T00:00:00+09:00'); var n=Math.ceil((d-now)/864e5);
    if(n>=0&&(!best||n<best.n)) best={n:n,x:x}; });
  if(!best){ el.hidden=true; return; }
  el.innerHTML=best.x.name+' <b>D-'+best.n+'</b>'+(best.x.tentative?' (예정)':'');
  el.title=best.x.note||'';
})();

/* ── misc chrome ── */
var dH=document.getElementById('dlg-help');
document.getElementById('t-help').onclick=function(){dH.showModal();};
document.getElementById('help-close').onclick=function(){dH.close();};
var tD=document.getElementById('t-dark');
function curTheme(){var a=document.documentElement.getAttribute('data-theme'); if(a) return a;
  return (window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';}
function theme(t){document.documentElement.setAttribute('data-theme',t);tD.textContent=t==='dark'?'☀':'◐';}
tD.onclick=function(){var t=curTheme()==='dark'?'light':'dark';theme(t);lset(K+'.theme',t);};
var th=lget(K+'.theme'); if(th) theme(th); else tD.textContent=curTheme()==='dark'?'☀':'◐';
var rs=document.getElementById('t-reset'), rc=document.getElementById('reset-confirm');
rs.onclick=function(){rc.hidden=false; rs.hidden=true;};
document.getElementById('reset-no').onclick=function(){rc.hidden=true; rs.hidden=false;};
document.getElementById('reset-yes').onclick=function(){
  ST.st={}; ST.qz={}; persist(); paintQz(); paint(); buildGrid(); buildWeak(); rc.hidden=true; rs.hidden=false;
};

/* ── rail search + range selector ── */
var q=document.getElementById('q');
q.addEventListener('input',function(){
  var v=q.value.trim().toLowerCase();
  rail.classList.toggle('filtering',!!v);
  rail.querySelectorAll('a[data-u]').forEach(function(a){
    a.classList.toggle('hit', !!v && a.textContent.toLowerCase().indexOf(v)>=0);
  });
});
q.addEventListener('keydown',function(e){if(e.key==='Escape'){q.value='';q.blur();rail.classList.remove('filtering');}});
var railR='all';
function applyRail(){
  rail.querySelectorAll('a[data-u]').forEach(function(a){
    var m=uMeta[a.dataset.u];
    a.classList.toggle('rout', railR==='lec' ? !m.lec : (railR!=='all' && rangeOfUnit(a.dataset.u)!==+railR));
  });
  rail.querySelectorAll('h6[data-ch]').forEach(function(h){
    var c=+h.dataset.ch;
    var anyLec=UNITS.some(function(u){return u.ch===c&&u.lec;});
    h.classList.toggle('rout', railR==='lec' ? !anyLec : (railR!=='all' && rangeOfCh(c)!==+railR));
  });
}
document.getElementById('rsel').addEventListener('click',function(e){
  var b=e.target.closest('button[data-r]'); if(!b) return;
  railR=b.dataset.r;
  this.querySelectorAll('button').forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});
  applyRail();
});

/* ── keyboard ── */
document.addEventListener('keydown',function(e){
  var t=e.target.tagName;
  if(t==='INPUT'||t==='TEXTAREA'||e.metaKey||e.ctrlKey||e.altKey) return;
  if(e.key==='/'){e.preventDefault();if(activeView!=='study')location.hash='#/'+activeId;setTimeout(function(){q.focus();},50);return;}
  var mv={'1':'study','2':'lecture','3':'examples','4':'formulas','5':'hw','6':'status','7':'lab'}[e.key];
  if(mv&&VIEWS.indexOf(mv)>=0){location.hash = mv==='study'?'#/'+activeId:'#/'+mv;return;}
  if(activeView!=='study') return;
  var i=ids.indexOf(activeId);
  if((e.key==='ArrowRight')&&i<ids.length-1) location.hash='#/'+ids[i+1];
  if((e.key==='ArrowLeft')&&i>0) location.hash='#/'+ids[i-1];
});

/* ── 원자료 팝업 ── */
(function(){
  var C=(DATA.cite||{}), pop=document.getElementById('citepop'); if(!pop) return;
  function esc(t){return String(t).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];});}
  document.addEventListener('click',function(e){
    var a=e.target.closest('a.cite');
    if(!a){ if(!e.target.closest('#citepop')) pop.hidden=true; return; }
    e.preventDefault();
    var it=(C.cites||{})[a.dataset.c]; if(!it) return; var s=(C.sources||{})[it.s]||{};
    document.getElementById('cp-t').textContent=s.title||it.s;
    document.getElementById('cp-l').textContent=(s.date?s.date+' · ':'')+it.l;
    document.getElementById('cp-r').innerHTML=esc(it.r).replace(/\n/g,'<br>');
    var n=document.getElementById('cp-n'); n.textContent=it.n||''; n.hidden=!it.n;
    var l=document.getElementById('cp-a'); if(s.url){l.href=s.url;l.hidden=false;}else l.hidden=true;
    pop.hidden=false;
    var r=a.getBoundingClientRect(), w=Math.min(520,window.innerWidth-24);
    pop.style.width=w+'px';
    pop.style.left=Math.max(12,Math.min(r.left,window.innerWidth-w-12))+'px';
    var top=r.bottom+8; if(top+320>window.innerHeight) top=Math.max(12,r.top-330);
    pop.style.top=top+'px';
  });
  document.getElementById('cp-x').onclick=function(){pop.hidden=true;};
  window.addEventListener('hashchange',function(){pop.hidden=true;});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')pop.hidden=true;});
})();

/* initial: jump to lecture frontier if no hash */
if(!location.hash && DATA.frontier){ try{ history.replaceState(null,'','#/'+DATA.frontier); }catch(e){ activeId=DATA.frontier; } }
collect(); rehydrate(); applyRail(); route();
(function w(){ if(window.MathJax&&MathJax.startup&&MathJax.startup.promise) MathJax.startup.promise.then(pump); else setTimeout(w,80); })();
})();
