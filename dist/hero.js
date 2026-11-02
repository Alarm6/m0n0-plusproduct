(() => {
  const section=document.querySelector('.hero-scroll'),sticky=document.querySelector('.hero-sticky'),svg=document.querySelector('.horizon'),surface=document.querySelector('.black-surface'),edges=[...document.querySelectorAll('.edge-glow path')],glow=document.querySelector('.edge-glow'),welcome=document.querySelector('.welcome'),position=document.querySelector('.device-position'),slide=document.querySelector('.device-slide'),iframe=document.querySelector('#hero-device'),config=document.querySelector('.configuration'),cue=document.querySelector('.scroll-cue'),status=document.querySelector('.scene-status');
  const reduced=matchMedia('(prefers-reduced-motion:reduce)'),clamp=x=>Math.max(0,Math.min(1,x)),lerp=(a,b,p)=>a+(b-a)*p,smooth=x=>x*x*(3-2*x);
  let ready=false,introDone=false,target=0,progress=0,raf=0,lastPose=-1,model='pro',color='Plum',storage='256',switching=false,colorBusy=false,lastTime=performance.now(),sceneStarted=false,arrivalStarted=null,loadTimer=0,loadAttempt=0,loadActivity=0,colorTimer=0,operationBusy=false,pendingProduct=null,busyTimer=0,contextRestarts=0,catalogLatched=false,returningUp=false,panStart=null,sceneSerial=0;
  let activeProduct={id:'pro18',name:'iPhone 18 Pro',scene:'pro18',price:135000},buying=false,pendingIncoming=false,wasLive=false,hasShownScene=false,queuedProduct=null;
  function incoming(){if(reduced.matches)return;slide.animate([{transform:'translateX(70%)',opacity:0},{transform:'translateX(-1%)',opacity:1,offset:.85},{transform:'translateX(0)',opacity:1}],{duration:1000,easing:'cubic-bezier(.16,1,.3,1)'});}
  const mobile=matchMedia('(pointer:coarse)').matches||innerWidth<750,touch=document.querySelector('.device-touch'),underlay=document.querySelector('.black-underlay'),baseline=document.querySelector('.baseline-halo');
  const header=document.querySelector('.curtain'),mark=document.querySelector('.mark'),menu=document.querySelector('.menu');
  const poster=document.querySelector('.device-poster'),hint=document.querySelector('.device-interaction-hint');
  const previewRequests=new Map();
  function preparePreview(product){
    const base='model-posters/'+product.scene,key=base+(innerWidth<=700?'-mobile':'-desktop');
    if(!previewRequests.has(key)){
      const urls=[base+'-desktop.webp',base+'-mobile.webp'];
      const task=new Promise((resolve,reject)=>{const img=new Image();img.decoding='async';img.onload=()=>{const decoded=img.decode?img.decode():Promise.resolve();decoded.then(()=>{img.onload=img.onerror=null;resolve(urls);},reject);};img.onerror=reject;img.src=urls[innerWidth<=700?1:0];}).catch(error=>{previewRequests.delete(key);throw error;});
      previewRequests.set(key,task);
    }
    return previewRequests.get(key);
  }
  function installPreview(product,urls){
    const source=document.createElement('source');source.media='(max-width:700px)';source.srcset=urls[1];
    const fresh=document.createElement('img');fresh.src=urls[0];fresh.alt=product.name;fresh.decoding='sync';
    poster.replaceChildren(source,fresh);
  }
  let welcomeAnimations=[];
  function resetWelcome(){welcomeAnimations.forEach(a=>a.cancel());welcomeAnimations=[];}
  function showWelcome(){resetWelcome();welcome.querySelectorAll('p').forEach((line,i)=>{welcomeAnimations.push(line.animate([{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}],{duration:reduced.matches?0:1300,delay:reduced.matches?0:i*140,easing:'cubic-bezier(.4,0,.2,1)',fill:'both'}));});}
  let layout,lastPoseAt=0,mobileCatalogLayout=false,wavePrepared=false;
  function measure(){layout={w:sticky.clientWidth,h:sticky.clientHeight,top:section.offsetTop,range:Math.max(1,section.offsetHeight-innerHeight)};const renderBox=document.querySelector('.device-render'),aspect=innerWidth<=700?312/354:1,renderHeight=Math.min(position.clientHeight,position.clientWidth/aspect);renderBox.style.height=renderHeight+'px';renderBox.style.width=renderHeight*aspect+'px';if(wavePrepared)return;wavePrepared=true;const path='M -10 1000 C 210 1000 210 0 500 0 C 790 0 790 1000 1010 1000';surface.setAttribute('d',path+' L 1010 1010 L -10 1010 Z');edges.forEach(e=>e.setAttribute('d',path));}
  function busyState(){window.dispatchEvent(new CustomEvent('catalog-busy',{detail:{busy:colorBusy||switching||operationBusy}}));}
  function flushProduct(){if(!pendingProduct||colorBusy||switching||buying||operationBusy)return;const p=pendingProduct;pendingProduct=null;window.dispatchEvent(new CustomEvent('catalog-product',{detail:p}));}
  function unlockColor(){clearTimeout(colorTimer);colorBusy=false;document.querySelectorAll('[data-color]').forEach(b=>b.disabled=false);busyState();flushProduct();}
  function monitorScene(){clearTimeout(loadTimer);loadTimer=setTimeout(()=>{if(ready)return;if(performance.now()-loadActivity<30000){monitorScene();return;}if(loadAttempt++<1){sceneStarted=false;startScene();}else{status.textContent='3D не отвечает · нажмите повторить';status.onclick=()=>{loadAttempt=0;sceneStarted=false;startScene();};}},30000);}
  function startScene(){if(sceneStarted)return;window.productNetwork?.stop();sceneStarted=true;const url=new URL(iframe.dataset.src,location.href);url.searchParams.set('dpr',mobile?'1.25':String(Math.min(devicePixelRatio,2)));url.searchParams.set('color',color);url.searchParams.set('size',model);url.searchParams.set('rtSamples',mobile?'0':'2');url.searchParams.set('v','19');url.searchParams.set('request',String(++sceneSerial));iframe.dataset.requestId=String(sceneSerial);iframe.style.visibility='hidden';iframe.src=url.href;iframe.dataset.sceneReady='false';loadActivity=performance.now();monitorScene();window.dispatchEvent(new CustomEvent('catalog-loading',{detail:{loading:true}}));}

  function preloadSelectedScene(){if(queuedProduct&&(section.dataset.brand||'apple')===(queuedProduct.brand||'apple')){const next=queuedProduct;queuedProduct=null;window.dispatchEvent(new CustomEvent('catalog-product',{detail:{...next,activate:true}}));}else if((section.dataset.brand||'apple')===(activeProduct.brand||'apple'))startScene();}
  function send(data){iframe.contentWindow?.postMessage(data,location.origin);}
  function setPressed(selector,key,value){document.querySelectorAll(selector).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[key]===value)));}
  function updatePrice(){const extra={'256':0,'512':20000,'1024':40000,'2048':70000}[storage]||0,price=activeProduct.price==null?null:activeProduct.price+extra;document.querySelector('#device-price').textContent=price==null?'По запросу':new Intl.NumberFormat('ru-RU').format(price);document.querySelector('.price span:last-child').hidden=price==null;document.querySelector('.price-note').textContent=price==null?'Стоимость уточним при заказе':(activeProduct.priceNote||'Цена из макета · демонстрация');window.dispatchEvent(new CustomEvent('catalog-selection',{detail:{product:activeProduct,color,storage,price}}));}
  function updateTarget(){if(buying)return;if(introDone&&catalogLatched&&scrollY<layout.top+layout.range-2){scrollTo({top:layout.top+layout.range,behavior:'instant'});target=1;if(!raf)raf=requestAnimationFrame(frame);return;}if(queuedProduct&&scrollY>section.offsetTop+6){const next=queuedProduct;queuedProduct=null;window.dispatchEvent(new CustomEvent('catalog-product',{detail:{...next,activate:true}}));}target=introDone?clamp((scrollY-layout.top)/layout.range):0;if(!raf)raf=requestAnimationFrame(frame);}
  function paint(){
    if(buying)return;
    const {w,h}=layout,p=progress;if(p<.9)returningUp=false;if(p>.98&&!returningUp)catalogLatched=true;
    if(introDone)window.productHaptics?.reveal(p);
    // The base stays at the bottom while the middle stretches upward.
    // Only in the final phase do the shoulders rise out of the viewport.
    const edgeLift=smooth(clamp((p-.60)/.36));
    const y=lerp(h-5,-h*.12,edgeLift),amp=lerp(16,h*1.20,smooth(clamp(p/.85)));
    // Cache the dome once. Stretch the composited layer, not its filtered paths.
    svg.style.transform=`translate3d(0,${y-h}px,0) scaleY(${amp/h})`;
    underlay.style.transform=`translate3d(0,${y}px,0)`;baseline.style.opacity=1-clamp(p/.24);
    glow.style.opacity=1-smooth(clamp((p-.83)/.15));
    document.querySelector('#device-title').style.opacity=smooth(clamp((p-.24)/.18));welcome.style.opacity=1-smooth(clamp(p/.22));welcome.style.transform=`translateY(${-p*70}px)`;
    const orbit=document.querySelector('.brand-orbit');if(orbit)orbit.style.opacity=1-smooth(clamp(p/.16));
    const now=performance.now();
    
    const previewEnter=smooth(clamp((p-.22)/.70)),enter=ready?previewEnter:0;
    position.style.transform=`translate3d(0,${lerp(h*.87,0,previewEnter)}px,0)`;position.style.opacity=smooth(clamp(previewEnter/.15));
    const live=ready&&(previewEnter>.998||hasShownScene);if(live)hasShownScene=true;
    iframe.style.visibility=live?'visible':'hidden';iframe.style.opacity=live?1:0;poster.style.opacity=live?0:1;
    section.classList.remove('scene-loading');
    if(ready&&Math.abs(enter-lastPose)>.001&&(!mobile||now-lastPoseAt>=32||enter===0||enter===1)){send({type:'hero-pose',progress:enter});lastPose=enter;lastPoseAt=now;}
    if(live&&!wasLive&&activeProduct.presentation!=='image'){send({type:'nudge'});hint.classList.add('visible');setTimeout(()=>hint.classList.remove('visible'),6500);}wasLive=live;
    const settled=p>.90;section.dataset.sceneReady=String(ready);config.classList.toggle('visible',settled);config.inert=!settled;touch.hidden=!settled||switching||!ready||operationBusy||colorBusy||activeProduct.presentation==='image';iframe.style.pointerEvents='none';
    cue.style.opacity=1-clamp(p/.12);cue.style.pointerEvents=p<.1?'auto':'none';
    const dark=p>.84;header.classList.toggle('on-dark',dark);mark.classList.toggle('on-dark',dark);menu.classList.toggle('on-dark',dark);
    document.body.dataset.reveal=settled?'complete':p<.01?'white':'revealing';
    section.classList.toggle('catalog-ready',settled);
    if(mobile&&mobileCatalogLayout!==settled){mobileCatalogLayout=settled;requestAnimationFrame(()=>{measure();paint();});}
    document.querySelectorAll('.catalog-categories,.catalog-models,.purchase-actions').forEach(n=>n.inert=!settled);
  }
  function frame(now){
    raf=0;const dt=Math.min(64,now-lastTime);lastTime=now;
    // The backdrop follows scrolling independently of 3D loading.
    progress=reduced.matches?target:lerp(progress,target,1-Math.exp(-dt/95));
    if(Math.abs(target-progress)<.00015)progress=target;
    paint();if(progress!==target)raf=requestAnimationFrame(frame);
  }
  function scrollBack(){catalogLatched=false;returningUp=true;}
  addEventListener('wheel',e=>{if(e.deltaY<0)scrollBack();},{passive:true,capture:true});
  addEventListener('touchstart',e=>{panStart=e.target.closest('.device-touch')?null:e.touches[0]?.clientY;},{passive:true,capture:true});
  addEventListener('touchmove',e=>{if(panStart!==null&&e.touches[0]?.clientY>panStart+3)scrollBack();},{passive:true,capture:true});
  addEventListener('keydown',e=>{if(!e.target.closest('.device-touch')&&(['Home','PageUp','ArrowUp'].includes(e.key)||(e.key===' '&&e.shiftKey)))scrollBack();},{capture:true});
  addEventListener('scroll',updateTarget,{passive:true});addEventListener('resize',()=>{measure();paint();updateTarget();});
  addEventListener('intro-complete',()=>{introDone=true;showWelcome();updateTarget();requestAnimationFrame(()=>requestAnimationFrame(preloadSelectedScene));});addEventListener('intro-start',()=>{resetWelcome();catalogLatched=false;returningUp=false;introDone=false;progress=target=0;arrivalStarted=null;paint();});
  cue.addEventListener('click',()=>scrollTo({top:layout.top+layout.range,behavior:reduced.matches?'instant':'smooth'}));
  addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==iframe.contentWindow||e.data?.source!=='apple-native-viewer'||(iframe.dataset.requestId&&e.data.requestId!==iframe.dataset.requestId)||(e.data.family&&e.data.family!==activeProduct.scene))return;
    if(e.data.type==='progress'){loadActivity=performance.now();return;}
    if(e.data.type==='busy'){clearTimeout(busyTimer);operationBusy=!!e.data.busy;if(operationBusy)busyTimer=setTimeout(()=>{operationBusy=false;unlockColor();busyState();status.textContent='Повторите действие';paint();},15000);busyState();paint();if(!operationBusy)flushProduct();return;}
    if(e.data.type==='finish-error'){if(e.data.color){color=e.data.color;setPressed('[data-color]','color',color);const finish=activeProduct.colors?.find(c=>c.state===color);if(finish)document.querySelector('#finish-name').textContent=finish.label;updatePrice();}status.textContent='Не удалось загрузить цвет · попробуйте ещё раз';unlockColor();return;}
    if(e.data.type==='context-lost'){if(contextRestarts++<1){ready=false;sceneStarted=false;startScene();}else status.textContent='Недостаточно памяти для 3D · обновите страницу';return;}
    if(e.data.type==='page-scroll'){scrollBy({top:Number(e.data.deltaY)||0,left:0,behavior:'instant'});return;}
    if(e.data.type==='display-hold')iframe.dataset.heldDisplays=String(e.data.count);
    if(e.data.type==='render-budget'){iframe.dataset.renderDpr=String(e.data.dpr);iframe.dataset.renderSamples=String(e.data.samples);}
    if(e.data.type==='finish-appearance')iframe.style.filter='none';
    if(e.data.type==='device-rotate'){iframe.dataset.userYaw=String(e.data.yaw);iframe.dataset.userPitch=String(e.data.pitch);}
    if(e.data.type==='ready'){clearTimeout(loadTimer);clearTimeout(busyTimer);operationBusy=false;busyState();loadAttempt=0;ready=true;iframe.dataset.sceneReady='true';status.textContent='';lastPose=-1;arrivalStarted=progress>.22&&!reduced.matches&&!pendingIncoming?performance.now():null;send({type:'hero-pose',progress:0});updateTarget();paint();if(pendingIncoming){pendingIncoming=false;incoming();}window.dispatchEvent(new CustomEvent('catalog-loading',{detail:{loading:false}}));updatePrice();flushProduct();}
    if(e.data.type==='error'){status.textContent='Не удалось загрузить 3D. Нажмите, чтобы повторить';status.onclick=()=>{ready=false;sceneStarted=false;startScene();};console.warn('3D scene',activeProduct.id,e.data.message);operationBusy=false;unlockColor();busyState();}
    if(e.data.type==='fold-complete')document.querySelector('.fold-device').textContent=e.data.open?'Сложить':'Раскрыть';
    if(e.data.type==='spin-complete'){unlockColor();window.productHaptics?.colorEnd();paint();}
  });
  async function switchModel(next){if(switching||next===model)return;switching=true;document.querySelectorAll('[data-model],[data-color]').forEach(b=>b.disabled=true);
    window.productHaptics?.modelStart();
    const distance=Math.max(innerWidth*.65,position.clientWidth*1.15);
    if(!reduced.matches){await slide.animate([{transform:'translateX(0)',opacity:1},{transform:`translateX(${-distance}px)`,opacity:0}],{duration:520,easing:'cubic-bezier(.55,0,1,.45)',fill:'forwards'}).finished;}
    model=next;send({type:'size',size:model});setPressed('[data-model]','model',model);document.querySelector('#device-title').textContent='iPhone 18 '+(model==='max'?'Pro Max':'Pro');updatePrice();
    if(!reduced.matches){const old=slide.getAnimations();const incoming=slide.animate([{transform:`translateX(${distance}px)`,opacity:0,offset:0},{transform:'translateX(-8px)',opacity:1,offset:.8},{transform:'translateX(0)',opacity:1,offset:1}],{duration:1180,easing:'cubic-bezier(.16,1,.3,1)',fill:'forwards'});await incoming.finished;old.forEach(a=>a.cancel());incoming.cancel();}
    switching=false;window.productHaptics?.modelEnd();document.querySelectorAll('[data-model],[data-color]').forEach(b=>b.disabled=false);paint();
  }
  document.querySelectorAll('[data-model]').forEach(b=>b.addEventListener('click',()=>switchModel(b.dataset.model)));
  document.querySelector('.color-options').addEventListener('click',e=>{const b=e.target.closest('[data-color]');if(!b||colorBusy||switching||!ready||b.dataset.color===color)return;status.textContent='';color=b.dataset.color;setPressed('[data-color]','color',color);document.querySelector('#finish-name').textContent=b.getAttribute('aria-label');updatePrice();window.productHaptics?.colorStart();colorBusy=true;busyState();clearTimeout(colorTimer);colorTimer=setTimeout(()=>{if(!colorBusy)return;status.textContent='Не удалось сменить цвет · выберите модель заново';unlockColor();},12000);if(reduced.matches){send({type:'finish',color});return;}document.querySelectorAll('[data-color]').forEach(b=>b.disabled=true);send({type:'spin-finish',color});});
  document.querySelectorAll('[data-storage]').forEach(b=>b.addEventListener('click',()=>{storage=b.dataset.storage;setPressed('[data-storage]','storage',storage);updatePrice();}));
  addEventListener('catalog-product',async e=>{
    const product=e.detail;if(product?.scene&&product.id!==activeProduct.id)window.productNetwork?.warm(product.scene);if(product&&!product.activate&&scrollY<=section.offsetTop+6&&product.id!==activeProduct.id){queuedProduct=product;preparePreview(product).catch(()=>{});if(introDone&&!sceneStarted)requestAnimationFrame(preloadSelectedScene);return;}if(!product?.scene)return;if(switching||colorBusy||operationBusy){pendingProduct=product;preparePreview(product).catch(()=>{});return;}if(buying)return;
    if(product.id===activeProduct.id){updatePrice();return;}
    switching=true;busyState();touch.hidden=true;window.dispatchEvent(new CustomEvent('catalog-loading',{detail:{loading:true}}));
    let previewURLs;try{previewURLs=await preparePreview(product);}catch{status.textContent='Не удалось загрузить изображение · повторите выбор';switching=false;busyState();window.dispatchEvent(new CustomEvent('catalog-loading',{detail:{loading:!ready}}));flushProduct();return;}
    const out=reduced.matches?null:slide.animate([{transform:'translateX(0)',opacity:1},{transform:'translateX(-22%)',opacity:0}],{duration:350,easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'});
    if(out)await out.finished;
    if(pendingProduct&&pendingProduct.id!==product.id){out?.cancel();switching=false;busyState();flushProduct();return;}
    const sameScene=product.scene===activeProduct.scene,previousColor=color;
    if(!sameScene){ready=false;iframe.style.visibility='hidden';iframe.style.opacity='0';clearTimeout(loadTimer);}
    activeProduct=product;model=product.size==='max'?'max':'pro';color=sameScene&&product.colors.some(c=>c.state===previousColor)?previousColor:product.colors[0].state;storage=(product.storage?.length?product.storage:['256'])[0];
    document.querySelectorAll('[data-storage]').forEach(b=>b.hidden=!!product.storage&&!product.storage.includes(b.dataset.storage));
    document.querySelector('.fold-device').hidden=!product.scene.startsWith('fold');document.querySelector('.storage-options').hidden=product.storage?.length===0;document.querySelector('.color-options').hidden=product.colors.length<2;document.querySelector('#finish-name').hidden=product.colors.length<2;
    document.querySelector('.fold-device').textContent='Раскрыть';
    installPreview(product,previewURLs);poster.style.setProperty('--poster-x',model==='max'?78/71.9:1);poster.style.setProperty('--poster-y',model==='max'?163.4/150:1);wasLive=false;hasShownScene=sameScene;
    document.querySelector('#device-title').textContent=product.name;section.dataset.productCategory=product.category||'iphone';const summary=document.querySelector('.product-summary');if(summary){summary.textContent=product.summary||'';summary.hidden=!product.summary;}
    document.querySelector('.color-options').replaceChildren(...product.colors.map(c=>{const b=document.createElement('button');b.type='button';b.dataset.color=c.state;b.style.setProperty('--swatch',c.hex);b.setAttribute('aria-label',c.label);b.setAttribute('aria-pressed',String(c.state===color));return b;}));
    document.querySelector('#finish-name').textContent=product.colors.find(c=>c.state===color).label;setPressed('[data-storage]','storage',storage);updatePrice();
    position.setAttribute('aria-label',product.name+(product.presentation==='image'?' — официальное изображение':' — 3D-модель'));iframe.title=product.name+(product.presentation==='image'?' — официальное изображение':' — интерактивная 3D-модель');hint.classList.remove('visible');hint.hidden=product.presentation==='image';touch.setAttribute('aria-label','Вращать '+product.name+' — перетащите в любом направлении');const url=new URL(product.viewer==='photo'?'apple-products/viewer.html':product.viewer==='dyson'?'dyson-viewer/index.html':product.viewer==='sony'?'sony-viewer/index.html':product.viewer==='samsung'?'samsung-viewer/index.html':'iphone-viewer/dist/hero-viewer.html',location.href);url.search=new URLSearchParams({scene:product.scene,color,size:model,v:'19'});
    if(sameScene){send({type:'size',size:model});out?.cancel();incoming();window.dispatchEvent(new CustomEvent('catalog-loading',{detail:{loading:false}}));}else{ready=false;sceneStarted=false;loadAttempt=0;lastPose=-1;arrivalStarted=null;pendingIncoming=false;iframe.dataset.src=url.href;startScene();out?.cancel();incoming();}
    switching=false;busyState();paint();flushProduct();
  });
  document.querySelector('.fold-device').addEventListener('click',()=>send({type:'fold'}));
  addEventListener('brand-change',e=>{queuedProduct=null;});
  addEventListener('purchase-start',e=>{buying=true;touch.hidden=true;hint.classList.remove('visible');send({type:'purchase-enter',order:e.detail});});
  addEventListener('purchase-exit',()=>{buying=false;pendingProduct=null;send({type:'purchase-exit'});lastPose=-1;paint();updateTarget();});
  // Defaults remain useful even if the introductory animation has already finished.
  let drag=null,dragFrame=0;
  touch.addEventListener('pointerdown',e=>{if(colorBusy||switching||!ready)return;hint.classList.remove('visible');e.preventDefault();touch.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,dy:0};send({type:'orbit-begin'});});
  function flushDrag(){dragFrame=0;if(!drag)return;send({type:'orbit-drag',dx:drag.dx,dy:drag.dy});drag.dx=drag.dy=0;}
  touch.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;drag.dx+=e.clientX-drag.x;drag.dy+=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;if(!dragFrame)dragFrame=requestAnimationFrame(flushDrag);});
  function endDrag(){if(!drag)return;if(dragFrame){cancelAnimationFrame(dragFrame);flushDrag();}drag=null;send({type:'orbit-end'});}
  touch.addEventListener('pointerup',endDrag);touch.addEventListener('pointercancel',endDrag);
  touch.addEventListener('keydown',e=>{const deltas={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]};if(!deltas[e.key]||colorBusy)return;e.preventDefault();send({type:'orbit-begin'});send({type:'orbit-drag',dx:deltas[e.key][0],dy:deltas[e.key][1]});});
  document.querySelectorAll('.catalog-models,.catalog-categories,.configuration,.purchase-actions').forEach(group=>group.addEventListener('pointerdown',e=>{const button=e.target.closest('button');if(button&&e.pointerType!=='touch'){e.preventDefault();button.focus({preventScroll:true});}}));
  measure();introDone=document.body.dataset.phase==='ready';paint();updateTarget();if(introDone){showWelcome();requestAnimationFrame(()=>requestAnimationFrame(preloadSelectedScene));}
})();



