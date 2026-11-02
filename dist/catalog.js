(() => {
  const section=document.querySelector('.hero-scroll'),list=document.querySelector('#catalog-model-list'),note=document.querySelector('.catalog-model-note'),empty=document.querySelector('.category-empty'),position=document.querySelector('.device-position'),iframe=document.querySelector('#hero-device'),purchase=document.querySelector('.purchase-view'),dialog=document.querySelector('.cart-dialog');
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  let products=[],selection=null,loading=true,busy=false,entering=false,zoom=null,category=new URLSearchParams(location.search).get('category')||'iphone',cart=[],purchaseScroll=0,purchaseInnerScroll=0,brand=section.dataset.brand||'apple';
  try{cart=JSON.parse(localStorage.getItem('plusproduct-cart')||'[]');if(!Array.isArray(cart))cart=[];}catch{cart=[];}
  const money=n=>n==null?'По запросу':new Intl.NumberFormat('ru-RU').format(n)+' ₽';
  const categories={iphone:'iPhone',mac:'Mac',ipad:'iPad',airpods:'AirPods',work:'Для работы',accessories:'Аксессуары'};
  if(!categories[category])category='iphone';
  const categoryOf=product=>product?.category||'iphone';
  function inCategory(product){return product&&(product.brand||'apple')===brand&&categoryOf(product)===category;}
  function selectionMatches(){return inCategory(selection?.product);}
  function renderModels(){
    list.replaceChildren(...products.filter(inCategory).map(p=>{const b=document.createElement('button');b.type='button';b.dataset.product=p.id;b.textContent=p.name.replace('iPhone ','').replace('Galaxy ','').replace('Dyson ','');b.setAttribute('aria-pressed',String(selection?.product.id===p.id));b.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('catalog-product',{detail:p})));return b;}));
    note.textContent=selectionMatches()&&selection?.product.size==='max'?'Модель адаптирована из Pro':'';
  }
  fetch('catalog-products.json?v=7').then(r=>{if(!r.ok)throw Error('catalog');return r.json();}).then(data=>{products=data;window.dispatchEvent(new CustomEvent('catalog-data',{detail:data}));selection={product:data[0],color:data[0].colors[0].state,storage:'256',price:data[0].price};brandCatalog(section.dataset.brand||'apple',category);}).catch(()=>{note.textContent='Не удалось загрузить список моделей. Обновите страницу.';});
  function brandCatalog(next,preferred){
    if(entering)return;
    const keep=preferred||(next===brand?category:'iphone');brand=next;
    document.querySelector('.catalog-categories').setAttribute('aria-label','Продукция '+({apple:'Apple',samsung:'Samsung',sony:'Sony',dyson:'Dyson'}[brand]||brand));
    document.querySelectorAll('button[data-category]').forEach(b=>{b.hidden=brand!=='apple'&&b.dataset.category!=='iphone';if(b.dataset.category==='iphone')b.textContent={apple:'iPhone',samsung:'Galaxy',sony:'PlayStation',dyson:'Стайлеры'}[brand]||'iPhone';});
    selectCategory(keep);
  }
  addEventListener('brand-change',e=>brandCatalog(e.detail.brand));
  function buttons(){document.querySelectorAll('.add-to-cart,.buy-device').forEach(b=>b.disabled=loading||busy||entering||!selectionMatches()||section.classList.contains('category-changing'));}
  addEventListener('catalog-loading',e=>{loading=e.detail.loading;buttons();renderModels();});
  addEventListener('catalog-busy',e=>{busy=e.detail.busy;buttons();});
  addEventListener('catalog-selection',e=>{
    selection={...e.detail,product:products.find(p=>p.id===e.detail.product.id)||e.detail.product};
    if(selectionMatches())section.classList.remove('category-changing');
    buttons();renderModels();
  });
  function selectCategory(next){
    if(entering||!categories[next])return;category=next;section.dataset.category=next;
    document.querySelectorAll('button[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===next)));
    document.querySelector('.catalog-models').setAttribute('aria-label','Модели '+(brand==='apple'?categories[next]:{samsung:'Galaxy',sony:'PlayStation',dyson:'Dyson'}[brand]));
    const product=products.find(inCategory);empty.hidden=!!product||!products.length;
    section.classList.toggle('category-changing',!selectionMatches());buttons();renderModels();
    if(product)window.dispatchEvent(new CustomEvent('catalog-product',{detail:product}));
    else if(products.length){empty.querySelector('h2').textContent=categories[next];empty.querySelector('p').textContent='Каталог готовится';}
  }
  document.querySelectorAll('button[data-category]').forEach(b=>b.addEventListener('click',()=>selectCategory(b.dataset.category)));
  empty.querySelector('button').addEventListener('click',()=>selectCategory('iphone'));selectCategory(category);
  function colorLabel(s){return s.product.colors?.find(c=>c.state===s.color)?.label||s.color;}
  function renderCart(){document.querySelectorAll('.cart-count').forEach(n=>n.textContent=cart.reduce((sum,x)=>sum+x.quantity,0));const items=document.querySelector('.cart-items');items.replaceChildren();if(!cart.length){const p=document.createElement('p');p.textContent='В корзине пока пусто';items.append(p);}cart.forEach((item,i)=>{const row=document.createElement('div');row.className='cart-item';const title=document.createElement('h3');title.textContent=item.name;const text=document.createElement('p');text.textContent=`${item.finish}${item.storage?' · '+item.storage+' GB':''} · ${item.quantity} шт.`;const price=document.createElement('span');price.textContent=money(item.price==null?null:item.price*item.quantity);const remove=document.createElement('button');remove.textContent='Убрать';remove.type='button';remove.addEventListener('click',()=>{cart.splice(i,1);saveCart();});row.append(title,text,price,remove);items.append(row);});document.querySelector('.cart-total').textContent=cart.length?(cart.some(x=>x.price==null)?'Стоимость уточним при заказе':'Итого '+money(cart.reduce((s,x)=>s+x.price*x.quantity,0))):'';}
  function saveCart(){try{localStorage.setItem('plusproduct-cart',JSON.stringify(cart));}catch{}renderCart();}
  function addToCart(){if(!selection||loading||busy||!selectionMatches())return;const s=selection,key=[s.product.id,s.color,s.storage].join(':');const old=cart.find(x=>x.key===key);if(old)old.quantity++;else cart.push({key,name:s.product.name,finish:s.product.summary||colorLabel(s),storage:s.product.storage?.length===0?'':s.storage,price:s.price,quantity:1});saveCart();const b=document.querySelector('.add-to-cart');b.textContent='Добавлено ✓';setTimeout(()=>b.textContent='Добавить в корзину',1600);}
  document.querySelector('.add-to-cart').addEventListener('click',addToCart);document.querySelector('.purchase-add').addEventListener('click',()=>{addToCart();dialog.showModal();});document.querySelector('.open-cart').addEventListener('click',()=>dialog.showModal());document.querySelector('.close-cart').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});renderCart();
  let facingResolve=null,purchaseEpoch=0,facingTimer=0;
  addEventListener('message',e=>{if(e.origin===location.origin&&e.source===iframe.contentWindow&&e.data?.source==='apple-native-viewer'&&(!iframe.dataset.requestId||e.data.requestId===iframe.dataset.requestId)&&(e.data.type==='purchase-facing'||e.data.type==='purchase-error')){if(e.data.type==='purchase-error')document.querySelector('.scene-status').textContent='Не удалось открыть оформление · попробуйте ещё раз';facingResolve?.(e.data.type==='purchase-error'?false:e.data);facingResolve=null;}});
  async function buy(){if(entering||loading||busy||!selection||!selectionMatches()||!section.classList.contains('catalog-ready'))return;const epoch=++purchaseEpoch;entering=true;section.inert=true;buttons();purchaseScroll=scrollY;const catalogueViewport=document.querySelector('.hero-sticky');purchaseInnerScroll=catalogueViewport.scrollTop;if(innerWidth<=700&&selection.product.presentation!=='image')catalogueViewport.scrollTo({top:Math.max(0,position.offsetTop-84),behavior:'instant'});document.body.classList.add('purchasing');
    const rect=position.getBoundingClientRect(),dx=innerWidth/2-(rect.left+rect.width/2),dy=innerHeight/2-(rect.top+rect.height/2);
    const facing=new Promise(resolve=>{facingResolve=resolve;facingTimer=setTimeout(()=>resolve(false),8000);});window.dispatchEvent(new CustomEvent('purchase-start',{detail:{name:selection.product.name,summary:selection.product.storage?.length===0?(selection.product.summary||'Консоль · белый'):`${colorLabel(selection)} · ${selection.storage} GB`,price:money(selection.price)}}));
    const faced=await facing;clearTimeout(facingTimer);if(epoch!==purchaseEpoch)return;if(!faced){document.querySelector('.hero-sticky').scrollTo({top:purchaseInnerScroll,behavior:'instant'});facingResolve=null;entering=false;section.inert=false;buttons();document.body.classList.remove('purchasing');window.dispatchEvent(new Event('purchase-exit'));return;}
    const frame=iframe.getBoundingClientRect(),screen=faced.screen;
    const initial=screen?{left:frame.left+screen.left*frame.width,top:frame.top+screen.top*frame.height,width:(screen.right-screen.left)*frame.width,height:(screen.bottom-screen.top)*frame.height}:{left:rect.left+rect.width*.28,top:rect.top+rect.height*.12,width:rect.width*.44,height:rect.height*.76};
    const cx=initial.left+initial.width/2,cy=initial.top+initial.height/2,px=rect.left+rect.width/2,py=rect.top+rect.height/2;
    const centerAt=scale=>({x:innerWidth/2-(px+(cx-px)*scale),y:innerHeight/2-(py+(cy-py)*scale)}),middle=centerAt(1.5),end=centerAt(18);
    purchase.querySelector('h2').textContent=selection.product.name;purchase.querySelector('h2').style.fontSize=Math.max(27,Math.min(48,innerWidth*.82/(selection.product.name.length*.54)))/16+'em';purchase.querySelector('.purchase-summary').textContent=selection.product.storage?.length===0?(selection.product.summary||'Консоль · белый'):`${colorLabel(selection)} · ${selection.storage} GB`;purchase.querySelector('.purchase-price').textContent=money(selection.price);
    const content=purchase.querySelector('.purchase-content');content.style.fontSize='16px';content.style.transform='none';content.style.opacity='1';
    purchase.hidden=false;purchase.dataset.stage='approaching';purchase.classList.add('expanding');
    if(faced.staticImage){purchase.style.clipPath='none';purchase.dataset.stage='complete';purchase.classList.remove('expanding');purchase.animate([{opacity:0},{opacity:1}],{duration:reduced.matches?0:300});purchase.querySelector('.leave-purchase').focus({preventScroll:true});return;}
    const form=content.getBoundingClientRect(),formWidth=form.width,formHeight=form.height;
    // The handset keeps the original flight beyond the viewport. The live DOM form has its own size limit.
    zoom=position.animate([{transform:'translate3d(0,0,0) scale(1)'},{transform:`translate3d(${middle.x}px,${middle.y}px,0) scale(1.5)`,offset:.3},{transform:`translate3d(${end.x}px,${end.y}px,0) scale(18)`}],{duration:reduced.matches?0:2200,easing:'cubic-bezier(.55,0,.72,.45)',fill:'forwards'});
    function portal(){
      if(epoch!==purchaseEpoch)return;
      const progress=zoom.effect.getComputedTiming().progress??0,first=progress<=.3,t=first?progress/.3:(progress-.3)/.7,scale=first?1+.5*t:1.5+16.5*t,tx=first?middle.x*t:middle.x+(end.x-middle.x)*t,ty=first?middle.y*t:middle.y+(end.y-middle.y)*t;
      const bounds={left:px+(initial.left-px)*scale+tx,top:py+(initial.top-py)*scale+ty,width:initial.width*scale,height:initial.height*scale};
      const top=Math.max(0,bounds.top),right=Math.max(0,innerWidth-bounds.left-bounds.width),bottom=Math.max(0,innerHeight-bounds.top-bounds.height),left=Math.max(0,bounds.left),radius=18*(1-Math.min(1,bounds.width/innerWidth,bounds.height/innerHeight));
      purchase.style.clipPath=`inset(${top}px ${right}px ${bottom}px ${left}px round ${radius}px)`;
      // Re-layout glyphs at the actual font size rather than magnifying a canvas or a text bitmap.
      const size=Math.min(1,bounds.width*.86/formWidth,bounds.height*.86/formHeight);
      content.style.fontSize=16*size+'px';content.style.transform=`translate(${bounds.left+bounds.width/2-innerWidth/2}px,${bounds.top+bounds.height/2-innerHeight/2}px)`;
      if(progress<1)requestAnimationFrame(portal);
    }
    portal();
    try{await zoom.finished;}catch{return;}if(epoch!==purchaseEpoch)return;
    purchase.style.clipPath='none';content.style.fontSize='16px';content.style.transform='none';purchase.dataset.stage='complete';purchase.classList.remove('expanding');purchase.querySelector('.leave-purchase').focus({preventScroll:true});
  }
  document.querySelector('.buy-device').addEventListener('click',buy);
  function leave(){purchaseEpoch++;clearTimeout(facingTimer);facingResolve?.(false);facingResolve=null;purchase.hidden=true;purchase.getAnimations().forEach(a=>a.cancel());purchase.querySelector('.purchase-content').getAnimations().forEach(a=>a.cancel());purchase.classList.remove('expanding');purchase.style.clipPath='none';zoom?.cancel();zoom=null;entering=false;section.inert=false;buttons();document.body.classList.remove('purchasing');scrollTo({top:purchaseScroll,behavior:'instant'});document.querySelector('.hero-sticky').scrollTo({top:purchaseInnerScroll,behavior:'instant'});window.dispatchEvent(new Event('purchase-exit'));document.querySelector('.buy-device').focus({preventScroll:true});}
  document.querySelector('.leave-purchase').addEventListener('click',leave);addEventListener('keydown',e=>{if(e.key==='Escape'&&entering&&!dialog.open)leave();});
})();

