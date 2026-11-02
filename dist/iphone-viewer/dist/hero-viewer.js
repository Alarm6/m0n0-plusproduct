const params=new URLSearchParams(location.search),family=params.get('scene')||'air';
const allowed=['air','iphone17','pro17','pro18'];
document.documentElement.style.background='transparent';document.body.style.background='transparent';
const debug=document.querySelector('#diagnostics');debug.hidden=!params.has('debug');
const notify=(type,extra={})=>parent.postMessage({source:'apple-native-viewer',type,family,requestId:params.get('request'),...extra},location.origin);
window.addEventListener('error',e=>{debug.textContent+='\n'+e.message;notify('error',{message:e.message})});
window.addEventListener('unhandledrejection',e=>{debug.textContent+='\n'+e.reason?.stack;notify('error',{message:String(e.reason)})});
(async()=>{
 if(!allowed.includes(family))throw Error('Unknown Apple scene');
 const script=document.createElement('script');script.src=family==='pro17'?'native/pro17/lotus.js':'native/shared-lotus.js';
 await new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=reject;document.head.append(script)});
 const lotus=Lotus.instance(),ua=navigator.userAgent,version=ua.match(/Version\/(\d+)\.(\d+)/)||[];
 lotus.settings.initialize({FeatureDetect:{touchAvailable:()=>navigator.maxTouchPoints>0},UserAgent:{browser:{safari:/Safari/.test(ua)&&!/Chrome/.test(ua),firefox:/Firefox/.test(ua),version:{major:+version[1],minor:+version[2]}},os:{ios:/iPhone|iPad/.test(ua)}}});
 lotus.settings.gltfTextureTasks=true;
 await lotus.initialize({paths:{assets:new URL(`native/${family}`,location.href).href}});
 let setupMasks;
 if(family==='air'){const {initLockScreenChunk}=await import('./native/air/lockscreen.js');lotus.chunks.entries.set('LockScreenChunk',initLockScreenChunk());setupMasks=(await import('./native/air/masks.js')).setupMasks}
 if(family==='pro18'){const {DetailChunk}=await import('./native/pro18/detail.js');lotus.chunks.entries.set('DetailChunk',DetailChunk)}
 class AppleScene extends Lotus.CustomScene{
  create(){
   super.create();
   if(setupMasks&&this.renderer.stencil)setupMasks(this,['8ddfd565-7596-33b9-946b-f91f1b31ba40'],['843a15be-c37b-3393-b26a-1688bad77a2b'],[],0);
   if(true){
    let device=this.components.list.find(c=>c.type==='file')?.element;
    if(!device)throw Error('Apple device geometry is missing');
    while(device.parent&&device.parent!==this)device=device.parent;
    this.deviceScale=new Lotus.THREE.Group();this.deviceScale.name='DeviceDimensions';this.add(this.deviceScale);this.deviceScale.attach(device);
    this.setDeviceSize(params.get('size'));
   }
  }
  setDeviceSize(size){
   if(!this.deviceScale)return;
   const max=size==='max',scale=[max?78/71.9:1,max?163.4/150:1,1];
   this.deviceScale.scale.set(...scale);this.deviceScale.updateMatrixWorld(true);
   document.body.dataset.deviceSize=max?'max':'pro';document.body.dataset.deviceScale=scale.join(',');
   notify('size',{size:max?'max':'pro',scale});lotus.tryRequestAnimationFrame();
  }
 }
 const scene=await lotus.createScene({component:AppleScene,element:document.querySelector('#viewer'),url:`native/${family}/hero-scene.lsd`});
 let heroProgress=0,spinActive=false;
 function heroPose(p){
   heroProgress=p;
   if(!scene.deviceScale)return;
   if(!spinActive)orbitState=null;
   scene.deviceScale.rotation.x=(1-p)*1.33;
   scene.deviceScale.rotation.z=(1-p)*-.10;
   if(!spinActive)scene.deviceScale.rotation.y=Math.PI+.18+(1-p)*-.25;
   scene.deviceScale.updateMatrixWorld(true);lotus.tryRequestAnimationFrame();
 }
 let purchaseActive=false,purchaseFrom=null,purchaseRun=0;
 let checkoutRecords=[];
 function nudge(){
   if(spinActive||!scene.deviceScale||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
   const id=++nudgeId,T=Lotus.THREE,device=scene.deviceScale,base=device.quaternion.clone(),began=performance.now();
   const axis=new T.Vector3(0,1,0).applyQuaternion(device.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(scene.camera.getWorldQuaternion(new T.Quaternion())));
   function frame(now){if(id!==nudgeId||spinActive)return;const p=Math.min(1,(now-began)/1100),angle=Math.sin(p*Math.PI*3)*Math.sin(p*Math.PI)*.045;device.quaternion.copy(new T.Quaternion().setFromAxisAngle(axis,angle)).multiply(base);device.updateMatrixWorld(true);lotus.tryRequestAnimationFrame();if(p<1)requestAnimationFrame(frame);else device.quaternion.copy(base);}
   requestAnimationFrame(frame);
 }
 function projectCheckout(root,cam,T){
 const bounds={left:1,top:1,right:0,bottom:0};let count=0;root.updateMatrixWorld(true);cam.updateMatrixWorld(true);
 root.traverse(mesh=>{if(!mesh.isMesh||!mesh.geometry?.attributes?.position)return;const g=mesh.geometry,materials=Array.isArray(mesh.material)?mesh.material:[mesh.material],groups=g.groups.length?g.groups:[{start:0,count:g.index?g.index.count:g.attributes.position.count,materialIndex:0}],v=new T.Vector3();
 for(const group of groups){if(!materials[group.materialIndex]?.userData?.checkout)continue;for(let i=group.start;i<group.start+group.count;i++){const index=g.index?g.index.getX(i):i;v.fromBufferAttribute(g.attributes.position,index).applyMatrix4(mesh.matrixWorld).project(cam);const x=(v.x+1)/2,y=(1-v.y)/2;if(!Number.isFinite(x+y))continue;bounds.left=Math.min(bounds.left,x);bounds.right=Math.max(bounds.right,x);bounds.top=Math.min(bounds.top,y);bounds.bottom=Math.max(bounds.bottom,y);count++;}}});
 return count&&bounds.right>bounds.left&&bounds.bottom>bounds.top?bounds:null;
}
 function applyCheckoutScreen(order){
   const T=Lotus.THREE,canvas=document.createElement('canvas');canvas.width=1080;canvas.height=2340;
   const c=canvas.getContext('2d');c.fillStyle='#f7f4f6';c.fillRect(0,0,1080,2340);
   c.fillStyle='#726473';c.font='30px SF,Arial,sans-serif';c.textAlign='left';c.fillText('← К выбору',70,145);c.textAlign='right';c.fillStyle='#211921';c.font='45px SF,Arial,sans-serif';c.fillText('+product',1010,145);
   c.textAlign='center';c.fillStyle='#9a7a8e';c.font='32px SF,Arial,sans-serif';c.fillText('Ваш выбор',540,815);
   c.fillStyle='#211921';c.font='72px SF,Arial,sans-serif';c.fillText(order.name||'iPhone',540,955,960);
   c.fillStyle='#847685';c.font='35px SF,Arial,sans-serif';c.fillText(order.summary||'',540,1065,950);
   c.fillStyle='#211921';c.font='68px SF,Arial,sans-serif';c.fillText(order.price||'',540,1255);
   c.fillStyle='#241b24';c.beginPath();c.roundRect(220,1350,640,130,65);c.fill();c.fillStyle='#fff';c.font='34px SF,Arial,sans-serif';c.fillText('Добавить в корзину',540,1433);
   c.fillStyle='#a497a6';c.font='23px SF,Arial,sans-serif';c.fillText('Демонстрация · оплата не подключена',540,1575,970);
   scene.deviceScale.traverse(mesh=>{if(!mesh.isMesh)return;const original=mesh.material,materials=Array.isArray(original)?original:[original];let changed=false;const replacements=[];
     const next=materials.map(old=>{if(!old?.emissiveMap)return old;changed=true;const texture=new T.CanvasTexture(canvas),source=old.emissiveMap;
       texture.flipY=source.flipY;texture.channel=source.channel??0;texture.colorSpace=T.SRGBColorSpace;texture.offset.copy(source.offset);texture.repeat.copy(source.repeat);texture.center.copy(source.center);texture.rotation=source.rotation;
       const material=new T.MeshBasicMaterial({map:texture,toneMapped:false,side:old.side});material.userData.checkout=true;replacements.push({material,texture});return material;
     });if(changed){checkoutRecords.push(()=>{mesh.material=original;replacements.forEach(x=>{x.material.dispose();x.texture.dispose();});});mesh.material=Array.isArray(original)?next:next[0];}
   });document.body.dataset.checkoutScreen=String(checkoutRecords.length);
 }
 function purchaseEnter(order={}){
   if(purchaseActive)return;
   if(spinActive){setTimeout(()=>purchaseEnter(order),80);return;}
   if(!scene.deviceScale)return;
   nudgeId++;
   const run=++purchaseRun;purchaseActive=true;spinActive=true;orbitState=null;
   const T=Lotus.THREE,device=scene.deviceScale,cam=scene.camera;
   purchaseFrom=device.quaternion.clone();
   const basis=device.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(cam.getWorldQuaternion(new T.Quaternion()));
   // Determine the actual display normal; scene cameras have different base orientations.
   let screenNormal=null;
   device.updateMatrixWorld(true);
   device.traverse(mesh=>{
     if(screenNormal||!mesh.isMesh||!mesh.geometry?.attributes?.normal)return;
     const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material],g=mesh.geometry,n=g.attributes.normal;
     const groups=g.groups.length?g.groups:[{start:0,count:g.index?g.index.count:n.count,materialIndex:0}];
     for(const group of groups){if(!materials[group.materialIndex]?.emissiveMap)continue;
       const normal=new T.Vector3(),sample=new T.Vector3(),end=Math.min(group.start+group.count,group.start+3072);
       for(let i=group.start;i<end;i+=3){const index=g.index?g.index.getX(i):i;sample.fromBufferAttribute(n,index);normal.add(sample);}
       if(normal.lengthSq()<.001)continue;
       const relative=device.getWorldQuaternion(new T.Quaternion()).invert().multiply(mesh.getWorldQuaternion(new T.Quaternion()));
       screenNormal=normal.normalize().applyQuaternion(relative);break;
     }
   });
   if(!screenNormal)screenNormal=new T.Vector3(0,0,-1);
   // Align both the display normal and its upright axis, avoiding an upside-down half turn.
   const up=new T.Vector3(0,1,0).addScaledVector(screenNormal,-screenNormal.y).normalize();
   const right=new T.Vector3().crossVectors(up,screenNormal).normalize();
   up.crossVectors(screenNormal,right).normalize();
   const correction=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,screenNormal)).invert();
   const target=basis.clone().multiply(correction);
   applyCheckoutScreen(order);
   document.body.dataset.purchaseFacing='false';
   const began=performance.now(),duration=matchMedia('(prefers-reduced-motion:reduce)').matches?0:1450;
   function frame(now){if(run!==purchaseRun)return;const p=duration?Math.min(1,(now-began)/duration):1,e=p*p*p*(p*(p*6-15)+10);device.quaternion.copy(purchaseFrom).slerp(target,e);device.updateMatrixWorld(true);lotus.tryRequestAnimationFrame();if(p<1)requestAnimationFrame(frame);else{document.body.dataset.purchaseFacing='true';notify('purchase-facing',{screen:projectCheckout(device,cam,T)});}}
   requestAnimationFrame(frame);
 }
 function purchaseExit(){purchaseRun++;checkoutRecords.forEach(restore=>restore());checkoutRecords=[];if(purchaseFrom)scene.deviceScale.quaternion.copy(purchaseFrom);purchaseActive=false;spinActive=false;orbitState=null;scene.deviceScale.updateMatrixWorld(true);lotus.tryRequestAnimationFrame();}
 function capturePoster(){
   heroPose(1);let captured=false;const renderer=scene.renderer,compose=renderer.compose.bind(renderer);
   renderer.compose=function(...args){const result=compose(...args);if(!captured){captured=true;const img=document.createElement('img');img.id='poster-output';img.alt='Превью из 3D-сцены';img.src=renderer.domElement.toDataURL('image/webp',.94);img.style.cssText='position:fixed;inset:0;width:100%;height:100%;object-fit:contain;background:transparent;z-index:20';document.body.append(img);}return result;};
   lotus.tryRequestAnimationFrame();
 }
 function holdDisplay(){
   const held=[];
   scene.deviceScale.traverse(mesh=>{
     if(!mesh.isMesh)return;
     const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
     const screens=materials.filter(m=>m&&m.emissiveMap).map(material=>({material,old:material.emissiveMap,next:material.emissiveMap}));
     if(!screens.length)return;
     const previous=mesh.onBeforeRender;
     mesh.onBeforeRender=function(...args){
       previous.apply(this,args);
       for(const s of screens){if(s.material.emissiveMap!==s.old)s.next=s.material.emissiveMap;s.material.emissiveMap=s.old;}
     };
     held.push(()=>{mesh.onBeforeRender=previous;for(const s of screens)s.material.emissiveMap=s.next;});
   });
   notify('display-hold',{count:held.length});
   return ()=>held.forEach(release=>release());
 }
 function spinFinish(color){
   if(spinActive||!scene.deviceScale)return;
   spinActive=true;const began=performance.now(),startOrientation=scene.deviceScale.quaternion.clone(),releaseDisplay=holdDisplay();let applied=false;
   const T=Lotus.THREE,cam=scene.camera&&typeof scene.camera.getWorldQuaternion==='function'?scene.camera:camera();
   const basis=scene.deviceScale.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(cam.getWorldQuaternion(new T.Quaternion()));
   const spinAxis=new T.Vector3(0,1,0).applyQuaternion(basis);
   function step(now){const p=Math.min(1,(now-began)/1450),e=1-Math.pow(1-p,3);
     scene.deviceScale.quaternion.copy(new T.Quaternion().setFromAxisAngle(spinAxis,Math.PI*2*e)).multiply(startOrientation);
     // The back is occluded while the display faces the viewer.
     if(e>=.48&&!applied){setFinish(color);applied=true;}
     scene.deviceScale.updateMatrixWorld(true);lotus.tryRequestAnimationFrame();
     if(p<1)requestAnimationFrame(step);else{
       // Restore the new wallpaper only once the display faces away again.
       scene.deviceScale.quaternion.copy(startOrientation);
       if(!applied)setFinish(color);releaseDisplay();
       // Settle gently into the original presentation pose after the revolution.
       const settleFrom=scene.deviceScale.quaternion.clone();
       const settleTo=new T.Quaternion().setFromEuler(new T.Euler((1-heroProgress)*1.33,Math.PI+.18+(1-heroProgress)*-.25,(1-heroProgress)*-.10));
       const settleStart=performance.now();
       function settle(now){
         const p=Math.min(1,(now-settleStart)/1150),e=p*p*p*(p*(p*6-15)+10);
         scene.deviceScale.quaternion.copy(settleFrom).slerp(settleTo,e);
         scene.deviceScale.updateMatrixWorld(true);lotus.tryRequestAnimationFrame();
         if(p<1)requestAnimationFrame(settle);else{spinActive=false;orbitState=null;notify('spin-complete');}
       }requestAnimationFrame(settle);
     }
   }requestAnimationFrame(step);
 }
 const camera=()=>scene.getComponentsByName('camera_360')[0]?.element;
 const setFinish=color=>{if(color&&scene.states.list.some(s=>s.category==='global'&&s.id===color)){scene.states.set('global',color);scene.renderer.toneMappingExposure=color==='Silver'?.95:1;notify('finish-appearance',{brightness:1});lotus.tryRequestAnimationFrame()}};
 const initialFovScale=.96;
 function reset(){const cam=camera();if(cam){const angle=family==='air'?'frontLeft':family==='pro18'?'back':'backLeft';scene.states.set('angles','');scene.states.set('angles',angle);scene.camera._fovScale=initialFovScale;lotus.tryRequestAnimationFrame()}}
 Lotus.MobX.autorun(()=>notify('progress',{progress:scene.loader.progress}));
 Lotus.MobX.when(()=>scene.rendered,()=>{setFinish(params.get('color'));reset();scene.renderer.background=[0,0,0,0];scene.renderer.setClearColor(0,0);heroPose(0);scene.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();notify('context-lost')});if(params.has('capture'))capturePoster();notify('render-budget',{dpr:scene.renderer.getPixelRatio(),samples:params.get('rtSamples')});notify('ready')});

 // Wheel and vertical touch gestures belong to the parent page, never camera zoom.
 window.addEventListener('wheel',event=>{
   event.preventDefault();event.stopImmediatePropagation();
   const unit=event.deltaMode===1?16:event.deltaMode===2?innerHeight:1;
   notify('page-scroll',{deltaY:event.deltaY*unit});
 },{passive:false,capture:true});
 let touchGesture=null,orbitState=null,nudgeId=0;
 function beginUserOrbit(){
   nudgeId++;
   if(spinActive||!scene.deviceScale)return;
   if(!orbitState){const T=Lotus.THREE,cam=scene.camera&&typeof scene.camera.getWorldQuaternion==='function'?scene.camera:camera();const basis=scene.deviceScale.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(cam.getWorldQuaternion(new T.Quaternion()));orbitState={base:scene.deviceScale.quaternion.clone(),basis,yaw:0,pitch:0};}
 }
 function moveUserOrbit(dx,dy){
   if(spinActive||!orbitState)return;
   const T=Lotus.THREE,o=orbitState;
   o.yaw+=dx*.008;o.pitch=Math.max(-1.45,Math.min(1.45,o.pitch+dy*.008));
   const pitch=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),o.pitch),yaw=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),o.yaw);
   scene.deviceScale.quaternion.copy(o.basis).multiply(pitch).multiply(yaw).multiply(o.basis.clone().invert()).multiply(o.base);
   scene.deviceScale.updateMatrixWorld(true);lotus.tryRequestAnimationFrame();notify('device-rotate',{yaw:scene.deviceScale.rotation.y,pitch:scene.deviceScale.rotation.x});
 }
 window.addEventListener('pointerdown',event=>{
   if(event.button!==0||spinActive)return;
   const overDevice=event.clientX>innerWidth*.28&&event.clientX<innerWidth*.72&&event.clientY>innerHeight*.06&&event.clientY<innerHeight*.94;
   touchGesture={id:event.pointerId,x:event.clientX,y:event.clientY,mode:overDevice&&heroProgress>.98?'orbit':'scroll'};
   if(touchGesture.mode==='orbit'&&!orbitState){
     const T=Lotus.THREE;
     const cam=scene.camera&&typeof scene.camera.getWorldQuaternion==='function'?scene.camera:camera();
     const cameraWorld=cam.getWorldQuaternion(new T.Quaternion());
     const parentInverse=scene.deviceScale.parent.getWorldQuaternion(new T.Quaternion()).invert();
     orbitState={base:scene.deviceScale.quaternion.clone(),basis:parentInverse.multiply(cameraWorld),yaw:0,pitch:0};
   }
   event.preventDefault();event.stopImmediatePropagation();
   event.target.setPointerCapture?.(event.pointerId);
 },{capture:true,passive:false});
 window.addEventListener('pointermove',event=>{
   if(!touchGesture||event.pointerId!==touchGesture.id)return;
   const dx=event.clientX-touchGesture.x,dy=event.clientY-touchGesture.y;
   event.preventDefault();event.stopImmediatePropagation();
   if(touchGesture.mode==='scroll'){
     notify('page-scroll',{deltaY:-dy});
     touchGesture.x=event.clientX;touchGesture.y=event.clientY;
   }else if(scene.deviceScale){
     // Camera-relative turntable: screen-horizontal yaw and screen-vertical pitch.
     // Rebuild from a stable base rather than accumulating unwanted roll.
     const T=Lotus.THREE,o=orbitState;
     o.yaw+=dx*.008;o.pitch=Math.max(-1.45,Math.min(1.45,o.pitch+dy*.008));
     const pitch=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),o.pitch);
     const yaw=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),o.yaw);
     scene.deviceScale.quaternion.copy(o.basis).multiply(pitch).multiply(yaw).multiply(o.basis.clone().invert()).multiply(o.base);
     scene.deviceScale.updateMatrixWorld(true);lotus.tryRequestAnimationFrame();
     notify('device-rotate',{yaw:scene.deviceScale.rotation.y,pitch:scene.deviceScale.rotation.x});
     touchGesture.x=event.clientX;touchGesture.y=event.clientY;
   }
 },{passive:false,capture:true});
 const endTouch=event=>{if(touchGesture){event.stopImmediatePropagation();touchGesture=null;}};
 window.addEventListener('pointerup',endTouch,{capture:true});window.addEventListener('pointercancel',endTouch,{capture:true});
 for(const type of ['touchstart','touchmove','touchend'])window.addEventListener(type,event=>{event.preventDefault();event.stopImmediatePropagation();},{capture:true,passive:false});
 window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent)return;if(e.data?.type==='nudge')nudge();if(e.data?.type==='purchase-enter')purchaseEnter(e.data.order);if(e.data?.type==='purchase-exit')purchaseExit();if(e.data?.type==='orbit-begin')beginUserOrbit();if(e.data?.type==='orbit-drag')moveUserOrbit(Number(e.data.dx)||0,Number(e.data.dy)||0);if(e.data?.type==='hero-pose')heroPose(Math.max(0,Math.min(1,Number(e.data.progress)||0)));if(e.data?.type==='spin-finish')spinFinish(e.data.color);if(e.data?.type==='finish')setFinish(e.data.color);if(e.data?.type==='size')scene.setDeviceSize(e.data.size);if(e.data?.type==='reset')reset()});
 lotus.tryRequestAnimationFrame();
 if(params.has('debug'))setInterval(()=>{debug.textContent=JSON.stringify({created:scene.created,compiled:scene.compiled,rendered:scene.rendered,progress:scene.loader.progress,loading:scene.components.listLoading.map(c=>({name:c.name,type:c.type,ready:c.ready,fileReady:c.fileReady,chunksReady:c.chunksReady,scriptsReady:c.scriptsReady,file:c.data.file,chunkPending:Object.entries(c.data.materials||{}).flatMap(([m,v])=>Object.keys(v.chunks).filter(k=>!c.chunks?.[m]?.[k]).map(k=>m+':'+k)),script:c.scripts&&[...c.scripts].map(([k,v])=>[k,v.ready])})),tasks:lotus.tasks.list.length,camera:scene.camera.name,position:scene.camera.position.toArray(),weights:scene.interpolation?.interpolations,scripts:[...scene.scripts].filter(s=>s.script==='EnvironmentInterpolation').map(s=>({name:s.name,ready:s.ready,textures:s.textures.size,weights:s.variantWeights?.interpolations}))},null,1)},1000);
})();
