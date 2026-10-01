/* 개념 실험실 (astro1) — 슬라이더 → SVG 그래프 */
(function(){
  var bound=false;
  function plot(points,xlabel,ylabel,xmax,ymax,ref){
    var X=function(x){return 55+x/xmax*575}, Y=function(y){return 235-y/ymax*200};
    var d=points.map(function(p,i){return (i?'L':'M')+X(p[0]).toFixed(2)+' '+Y(p[1]).toFixed(2)}).join(' ');
    return '<svg class="chart" viewBox="0 0 670 290" role="img" aria-label="'+ylabel+' 대 '+xlabel+' 그래프">'+
      '<line x1="55" y1="235" x2="630" y2="235"/><line x1="55" y1="35" x2="55" y2="235"/>'+
      '<text x="20" y="30">'+ylabel+'</text><text x="595" y="276">'+xlabel+'</text><text x="35" y="254">0</text>'+
      '<text x="615" y="254">'+xmax+'</text><text x="15" y="43">'+ymax+'</text>'+
      (ref===undefined?'':'<path class="ref" d="M55 '+Y(ref)+'H630"/>')+'<path d="'+d+'"/></svg>';
  }
  function $(id){return document.getElementById(id)}
  function draw(){
    var I=+$('labI').value,S=+$('labS').value,t=+$('labT').value,a=+$('labA').value;
    $('outI').textContent=I; $('outS').textContent=S; $('outT').textContent=t; $('outA').textContent=a+'°';
    var pts=[]; for(var i=0;i<=100;i++){var x=i/20; pts.push([x,I*Math.exp(-x)+S*(1-Math.exp(-x))]);}
    $('transferPlot').innerHTML=plot(pts,'τ','I',5,10,S);
    $('transferResult').innerHTML='<span>나오는 세기 <strong>'+(I*Math.exp(-t)+S*(1-Math.exp(-t))).toFixed(3)+'</strong></span>'+
      '<span>배경 투과율 <strong>'+(Math.exp(-t)*100).toFixed(1)+'%</strong></span><span>'+(S>I?'방출 대비':S<I?'흡수 대비':'대비 없음')+'</span>';
    var p=function(x){var c=Math.pow(Math.cos(x*Math.PI/180),2);return (1-c)/(1+c);};
    var sp=[]; for(var k=0;k<=180;k++) sp.push([k,p(k)]);
    $('scatterPlot').innerHTML=plot(sp,'θ (°)','p',180,1);
    $('scatterResult').innerHTML='<span>선편광도 <strong>'+(100*p(a)).toFixed(1)+'%</strong></span>'+
      '<span>정규화 각분포 1+cos²θ <strong>'+(1+Math.pow(Math.cos(a*Math.PI/180),2)).toFixed(3)+'</strong></span>';
  }
  window.labInit=function(){
    if(!$('labI')) return;
    if(!bound){ ['labI','labS','labT','labA'].forEach(function(id){$(id).addEventListener('input',draw);}); bound=true; }
    draw();
  };
})();
