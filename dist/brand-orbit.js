(() => {
  const orbit=document.querySelector('.brand-orbit');
  if(!orbit)return;
  const buttons=[...orbit.querySelectorAll('.orbit-brand')],section=document.querySelector('.hero-scroll');
  const reduced=matchMedia('(prefers-reduced-motion:reduce)'),gradient=[...document.querySelectorAll('#champagne-plum stop')];
  const palettes={apple:['#572b43','#8e4e66','#d9b0a4','#813e5c','#462338'],dyson:['#6b390d','#c28730','#f7df9c','#d5a34a','#684014'],sony:['#161c80','#374ee0','#b5c4ff','#596dff','#1b237e'],samsung:['#095a4e','#1eaa8d','#b0f3d4','#48c5a6','#07584d']};
  const requested=new URLSearchParams(location.search).get('brand'),initial=Math.max(0,buttons.findIndex(b=>b.dataset.brand===requested));
  let step=initial,turn=initial,timer=0,raf=0,running=false,moving=false,locked=false,drag=null,suppressClick=false,manualUntil=requested?performance.now()+30000:0;
  function pose(index,turn){const a=(index-turn)*Math.PI/2;const depth=(Math.cos(a)+1)/2;return {transform:`translate(-50%,-50%) translate3d(${-Math.sin(a)*36}vw,${Math.cos(a)*23}svh,0) scale(${.8+depth*.2})`,filter:`blur(${Math.pow(1-depth,4)*4}px)`,opacity:.72+depth*.28};}
  function select(){const current=buttons[((step%4)+4)%4].dataset.brand;section.dataset.brand=current;buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.brand===current)));palettes[current].forEach((c,i)=>gradient[i].setAttribute('stop-color',c));section.style.setProperty('--brand-glow',palettes[current][1]);window.dispatchEvent(new CustomEvent('brand-change',{detail:{brand:current}}));}
  function render(){buttons.forEach((b,i)=>Object.assign(b.style,pose(i,turn)));}
  function snap(){turn=step;render();select();}
  function schedule(){clearTimeout(timer);if(running&&!locked&&!drag&&!document.hidden&&!reduced.matches)timer=setTimeout(()=>rotate(step-1),Math.max(3200,manualUntil-performance.now()));}
  function rotate(next){cancelAnimationFrame(raf);clearTimeout(timer);moving=true;const from=turn,start=performance.now();step=next;select();
    function tick(now){const p=reduced.matches?1:Math.min(1,(now-start)/900),ease=1-Math.pow(1-p,4);turn=from+(next-from)*ease;render();if(p<1){raf=requestAnimationFrame(tick);}else{raf=0;moving=false;snap();schedule();}}
    raf=requestAnimationFrame(tick);
  }
  function choose(i){manualUntil=performance.now()+30000;const base=Math.round(turn);let delta=(i-base%4+4)%4;if(delta>2)delta-=4;rotate(base+delta);}
  buttons.forEach((b,i)=>b.addEventListener('click',()=>{if(locked||drag)return;choose(i);}));
  // Header navigation remains available after the orbit is locked by scrolling.
  const panel=document.querySelector('#brands-panel');
  if(panel){
    const labels={apple:'Apple',samsung:'Samsung',sony:'Sony',dyson:'Dyson'};
    const items=[...panel.querySelectorAll('.brands > div')];
    ['samsung','sony','dyson','apple'].forEach((brand,index)=>{
      const item=items[index];if(!item)return;
      const button=document.createElement('button');button.type='button';button.className=item.className+' menu-brand';button.setAttribute('aria-label',labels[brand]);
      button.style.cssText='border:0;padding:12px;background:transparent;color:inherit;min-height:48px';
      button.append(...item.childNodes);item.replaceWith(button);
      button.addEventListener('click',()=>{choose(buttons.findIndex(b=>b.dataset.brand===brand));document.querySelector('.menu')?.click();});
    });
  }
  orbit.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopPropagation();suppressClick=false;}},true);
  orbit.addEventListener('dragstart',e=>e.preventDefault());
  orbit.addEventListener('pointerdown',e=>{if(locked||!running||e.button!==0)return;manualUntil=performance.now()+30000;clearTimeout(timer);cancelAnimationFrame(raf);raf=0;moving=false;suppressClick=false;drag={id:e.pointerId,x:e.clientX,y:e.clientY,from:turn,moved:false};});
  orbit.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved){if(Math.abs(dx)<5)return;if(e.pointerType==='touch'&&Math.abs(dy)>Math.abs(dx))return;drag.moved=true;orbit.setPointerCapture(e.pointerId);orbit.classList.add('dragging');}e.preventDefault();turn=drag.from+dx/Math.max(110,innerWidth*.23);render();});
  function endDrag(e){if(!drag||e.pointerId!==drag.id)return;const moved=drag.moved;drag=null;orbit.classList.remove('dragging');if(orbit.hasPointerCapture(e.pointerId))orbit.releasePointerCapture(e.pointerId);if(moved){suppressClick=true;rotate(Math.round(turn));}else if(Math.abs(turn-step)>.001){rotate(Math.round(turn));}else schedule();}
  orbit.addEventListener('pointerup',endDrag);orbit.addEventListener('pointercancel',endDrag);orbit.addEventListener('lostpointercapture',e=>{if(drag)endDrag(e);});
  addEventListener('scroll',()=>{const next=scrollY>section.offsetTop+6;if(next===locked)return;locked=next;orbit.style.pointerEvents=locked?'none':'';if(locked)clearTimeout(timer);else schedule();},{passive:true});
  addEventListener('intro-complete',()=>{running=true;schedule();});
  addEventListener('intro-start',()=>{running=false;clearTimeout(timer);cancelAnimationFrame(raf);drag=null;moving=false;orbit.classList.remove('dragging');snap();});
  document.addEventListener('visibilitychange',schedule);reduced.addEventListener('change',schedule);
  running=document.body.dataset.phase==='ready';snap();schedule();
})();

