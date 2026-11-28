/* extras.js - реални карти (OpenStreetMap) и реални снимки (Wikimedia) за Бот */
(function(){
  var RE='\\[\\[(карта|снимка):\\s*([^\\]]+)\\]\\]';
  var hist=false;
  function tagsOf(t){var out=[],re=new RegExp(RE,'gi'),m;while((m=re.exec(t)))out.push([m[1].toLowerCase(),m[2].trim()]);return out;}
  function strip(t){return t.replace(new RegExp(RE,'gi'),'').trim();}
  function st(el,s){el.style.cssText=s;return el;}
  function lnk(txt,href){
    var a=document.createElement('a');a.textContent=txt;a.href=href;a.target='_blank';a.rel='noopener';
    return st(a,'display:inline-block;margin:6px 6px 0 0;padding:7px 12px;border-radius:14px;background:#2f2f2f;color:#fff;text-decoration:none;font-size:14px');
  }
  async function geocode(q){
    var r=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=bg&q='+encodeURIComponent(q));
    var j=await r.json(); if(!j.length) return null;
    var p=j[0];
    return {lat:+p.lat,lon:+p.lon,name:p.display_name,bb:p.boundingbox.map(Number)};
  }
  async function loadMap(c,q){
    c.textContent='🗺️ Зареждам картата...';
    try{
      var g;
      if(q==='@тук'){
        var pos=await new Promise(function(res,rej){navigator.geolocation.getCurrentPosition(res,rej,{enableHighAccuracy:true,timeout:15000});});
        var la=pos.coords.latitude,lo=pos.coords.longitude;
        g={lat:la,lon:lo,name:'Ти си тук',bb:[la-.006,la+.006,lo-.01,lo+.01]};
      } else g=await geocode(q);
      if(!g){c.textContent='Не намерих такова място: '+q;return;}
      var s=g.bb[0],n=g.bb[1],w=g.bb[2],e=g.bb[3];
      var pl=Math.max((n-s)*.1,.002),po=Math.max((e-w)*.1,.003);
      var bbox=[w-po,s-pl,e+po,n+pl].join(',');
      c.textContent='';
      var f=document.createElement('iframe');
      f.src='https://www.openstreetmap.org/export/embed.html?bbox='+bbox+'&layer=mapnik&marker='+g.lat+','+g.lon;
      f.loading='lazy';
      st(f,'width:100%;height:280px;border:0;border-radius:12px;background:#333;max-width:none');
      c.appendChild(f);
      var cap=document.createElement('div');st(cap,'font-size:13px;color:#aaa;margin:4px 0');cap.textContent=g.name.slice(0,120);c.appendChild(cap);
      c.appendChild(lnk('🔎 Голяма карта','https://www.openstreetmap.org/?mlat='+g.lat+'&mlon='+g.lon+'#map=15/'+g.lat+'/'+g.lon));
      c.appendChild(lnk('🧭 Навигация','https://www.google.com/maps/dir/?api=1&destination='+g.lat+','+g.lon));
      c.appendChild(lnk('🛰️ Сателит','https://www.google.com/maps/@?api=1&map_action=map&center='+g.lat+','+g.lon+'&zoom=15&basemap=satellite'));
    }catch(err){
      c.textContent=(err&&err.code===1)?'Нямам достъп до местоположението. Разреши го в настройките на сайта.':'Не успях да заредя картата. Провери интернета.';
    }
  }
  async function commons(q){
    var u='https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=15&gsrsearch='+encodeURIComponent(q+' filetype:bitmap')+'&prop=imageinfo&iiprop=url|mime|extmetadata&iiurlwidth=800&iiextmetadatafilter=Artist|LicenseShortName';
    var j=await (await fetch(u)).json();
    return Object.values((j.query&&j.query.pages)||{})
      .filter(function(p){return p.imageinfo&&/^image\/(jpeg|png)/.test(p.imageinfo[0].mime);})
      .sort(function(a,b){return a.index-b.index;})
      .map(function(p){var i=p.imageinfo[0];return {src:i.thumburl||i.url,page:i.descriptionurl};});
  }
  async function wiki(q,lang){
    var u='https://'+lang+'.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrlimit=6&gsrsearch='+encodeURIComponent(q)+'&prop=pageimages|info&inprop=url&piprop=thumbnail&pithumbsize=800';
    var j=await (await fetch(u)).json();
    return Object.values((j.query&&j.query.pages)||{})
      .filter(function(p){return p.thumbnail;})
      .sort(function(a,b){return a.index-b.index;})
      .map(function(p){return {src:p.thumbnail.source,page:p.fullurl};});
  }
  async function loadPhotos(c,q){
    c.textContent='🖼️ Търся реални снимки...';
    try{
      var ph=await commons(q);
      if(!ph.length) ph=await wiki(q,'bg');
      if(!ph.length) ph=await wiki(q,'en');
      if(!ph.length){c.textContent='Не намерих подходящи снимки за „'+q+'“.';return;}
      c.textContent='';
      var grid=st(document.createElement('div'),'display:grid;grid-template-columns:1fr 1fr;gap:6px');
      ph.slice(0,4).forEach(function(p){
        var a=document.createElement('a');a.href=p.page;a.target='_blank';a.rel='noopener';
        var im=new Image();im.loading='lazy';im.src=p.src;
        st(im,'width:100%;height:130px;object-fit:cover;border-radius:10px;max-height:none;margin:0;display:block');
        a.appendChild(im);grid.appendChild(a);
      });
      c.appendChild(grid);
      var cap=document.createElement('div');st(cap,'font-size:12px;color:#aaa;margin-top:4px');
      cap.textContent='Реални снимки от Wikimedia. Натисни снимка за автор и лиценз.';
      c.appendChild(cap);
    }catch(err){c.textContent='Не успях да заредя снимките. Провери интернета.';}
  }
  function attach(b,tags,auto){
    tags.forEach(function(t){
      var k=t[0],q=t[1],c=st(document.createElement('div'),'margin-top:8px;min-width:min(78vw,420px)');
      var go=function(){return k==='карта'?loadMap(c,q):loadPhotos(c,q);};
      if(auto) go();
      else{
        var bt=st(document.createElement('button'),'padding:8px 12px;border:0;border-radius:12px;background:#2f2f2f;color:#fff;font:inherit;font-size:14px');
        bt.textContent=(k==='карта'?'🗺️ Карта: ':'🖼️ Снимки: ')+(q==='@тук'?'моето място':q);
        bt.onclick=function(){bt.remove();go();};
        c.appendChild(bt);
      }
      b.appendChild(c);
    });
  }
  function widgetCmd(t){
    var s=t.trim(),m;
    if(/^(къде съм|покажи къде съм|моето местоположение|карта тук|карта около мен)\??$/i.test(s)) return '[[карта: @тук]]';
    if((m=s.match(/^(?:покажи(?:\s+ми)?\s+)?карта\s+(?:на\s+)?(.{2,})$/i))) return '[[карта: '+m[1].trim()+']]';
    if((m=s.match(/^(?:покажи(?:\s+ми)?\s+)?(?:реални\s+)?(?:снимки|снимка|фото|фотографии)\s+(?:на\s+)?(.{2,})$/i))) return '[[снимка: '+m[1].trim()+']]';
    return null;
  }

  /* закачане към приложението */
  var _show=window.showReply,_render=window.render,_local=window.local,_say=window.say;
  window.showReply=function(b,t,auto){
    var tags=tagsOf(t);
    _show(b,strip(t));
    if(tags.length) attach(b,tags,!hist);
  };
  window.render=function(){hist=true;try{_render();}finally{hist=false;}};
  window.local=function(t){var w=widgetCmd(t);return w?w:_local(t);};
  window.say=function(t){t=strip(t||'');if(t)_say(t);};

  var EX=' Ако потребителят иска карта на място, добави в отговора ред [[карта: място]]. Ако иска реална снимка на място, обект, животно или растение, добави ред [[снимка: обект]] (по възможност на английски или с оригиналното име). Таговете показват истинска карта от OpenStreetMap и истински снимки от Wikimedia, така че не казвай, че не можеш. Не можеш да генерираш нови фотореалистични снимки. Когато рисуваш SVG, прави го богат и красив: градиенти, слоеве, сенки и детайли.';
  var _fetch=window.fetch.bind(window);
  window.fetch=function(u,o){
    try{
      if(String(u).indexOf('api.anthropic.com')>-1&&o&&typeof o.body==='string'){
        var b=JSON.parse(o.body);
        if(typeof b.system==='string'){b.system+=EX;o=Object.assign({},o,{body:JSON.stringify(b)});}
      }
    }catch(e){}
    return _fetch(u,o);
  };
  window.render();
})();
