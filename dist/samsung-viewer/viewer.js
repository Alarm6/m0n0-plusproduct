import * as T from 'three';
import {GLTFLoader} from './vendor/loaders/GLTFLoader.js';
import {DRACOLoader} from './vendor/loaders/DRACOLoader.js';
import {RGBELoader} from './vendor/loaders/RGBELoader.js';
import {cacheDracoGeometry} from './geometry-cache.js';
const params=new URLSearchParams(location.search),family=params.get('scene')||'s26';
const notify=(type,extra={})=>parent.postMessage({source:'apple-native-viewer',type,family,requestId:params.get('request'),...extra},location.origin);
const renderW=params.has('capture')?(params.get('format')==='mobile'?312:640):innerWidth,renderH=params.has('capture')?(params.get('format')==='mobile'?354:640):innerHeight;
const renderer=new T.WebGLRenderer({alpha:true,antialias:false,preserveDrawingBuffer:params.has('capture')});renderer.setPixelRatio(Math.min(Number(params.get('dpr'))||devicePixelRatio,2));renderer.setSize(renderW,renderH);renderer.setClearColor(0,0);renderer.toneMapping=T.ACESFilmicToneMapping;document.body.append(renderer.domElement);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(30,renderW/renderH,.01,100);camera.position.z=6;
const pivot=new T.Group();scene.add(pivot);const draco=new DRACOLoader().setDecoderPath('./vendor/draco/'),loader=new GLTFLoader().setDRACOLoader(draco),pmrem=new T.PMREMGenerator(renderer),hdrCache=new Map(),texCache=new Map();
if(matchMedia('(pointer:coarse)').matches)draco.setWorkerLimit(2);
cacheDracoGeometry(draco);draco.preload();
let product,object,mixer,action,fold=0,currentGLB='',currentColor='',pose=1,busy=false,animation=0,restored=[],screens=[];
const base=new T.Quaternion().setFromEuler(new T.Euler(.04,Math.PI+.22,0));
const draw=()=>{renderer.render(scene,camera);document.body.dataset.ready=object?'true':'false';};
function animate(duration,fn){const id=++animation,start=performance.now();return new Promise(resolve=>{function tick(now){if(id!==animation){resolve(false);return;}const p=Math.min(1,(now-start)/duration),e=p*p*(3-2*p);fn(e,p);draw();if(p<1)requestAnimationFrame(tick);else resolve(true);}requestAnimationFrame(tick);});}
async function env(key){const file=product.hdr[key];if(!hdrCache.has(file))hdrCache.set(file,new RGBELoader().loadAsync('hdr/'+file).then(t=>{const rt=pmrem.fromEquirectangular(t);t.dispose();return rt.texture;}));return hdrCache.get(file);}
async function texture(file,old){if(!texCache.has(file))texCache.set(file,new T.TextureLoader().loadAsync('models/'+product.id+'/'+file));const t=(await texCache.get(file)).clone();t.flipY=old?.flipY??false;t.colorSpace=T.LinearSRGBColorSpace;t.needsUpdate=true;return t;}
function allMaterials(root=object){const materials=new Set();root.traverse(n=>{if(n.isMesh)(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>materials.add(m));});return [...materials];}
function foldPose(value){fold=value;if(action){action.reset().play();mixer.setTime(value*action.getClip().duration);}for(const m of allMaterials()){if(/Display_ActiveArea/i.test(m.name)){const front=/Front/i.test(m.name);if(action)m.emissiveIntensity=front?(value<.9?1:0):(value>.1?1:0);}}object.updateMatrixWorld(true);}
function disposeModel(root){const textures=new Set();root?.traverse(n=>{if(!n.isMesh)return;n.geometry.dispose();for(const m of Array.isArray(n.material)?n.material:[n.material]){for(const [key,value]of Object.entries(m))if(value?.isTexture&&key!=='envMap')textures.add(value);m.dispose();}});textures.forEach(t=>t.dispose());}
async function finish(key){
 const c=product.data.color.find(x=>x.key===key)||product.data.color[0],replace=c.glb!==currentGLB;
 const preloadedEnvironment=Promise.allSettled([...new Set([c.envtype,...(c.envCustom||[]).map(e=>e.type)])].map(env));
 const customTextures=[...new Set((c.custumMaterial||[]).flatMap(m=>Object.entries(m.options).filter(([key,value])=>(key==='map'||key.endsWith('Map'))&&value).map(([,value])=>Array.isArray(value)?value[0]:value)))];
 const preloadedTextures=Promise.allSettled(customTextures.map(file=>{if(!texCache.has(file))texCache.set(file,new T.TextureLoader().loadAsync('models/'+product.id+'/'+file));return texCache.get(file);}));
 let next=object,nextMixer=mixer,nextAction=action;
 if(replace){const gltf=await loader.loadAsync('models/'+product.id+'/'+c.glb,()=>notify('progress'));next=gltf.scene;nextMixer=new T.AnimationMixer(next);const clip=gltf.animations.find(x=>x.name==='status_toggle');nextAction=family.startsWith('fold')&&clip?nextMixer.clipAction(clip):null;if(nextAction){nextAction.setLoop(T.LoopOnce,1);nextAction.clampWhenFinished=true;nextAction.reset().play();nextMixer.setTime(fold*clip.duration);}next.updateMatrixWorld(true);const box=new T.Box3().setFromObject(next),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),scale=2.45/size.y;next.scale.multiplyScalar(scale);next.position.addScaledVector(center,-scale);}
 try{
 await Promise.all([preloadedEnvironment,preloadedTextures]);
 const environment=await env(c.envtype),mats=allMaterials(next),updates=[];
 await Promise.all((c.envCustom||[]).map(async e=>{const map=await env(e.type);updates.push(()=>mats.filter(m=>e.target.includes(m.name)).forEach(m=>{m.envMap=map;m.needsUpdate=true;}));}));
 for(const entry of c.custumMaterial||[]){for(const m of mats.filter(m=>entry.target.includes(m.name))){for(const [key,value]of Object.entries(entry.options)){if((key==='map'||key.endsWith('Map'))&&value){const nextMap=await texture(Array.isArray(value)?value[0]:value,m[key]);updates.push(()=>{m[key]?.dispose();m[key]=nextMap;});}else updates.push(()=>{if(key==='color'||key==='emissive')m[key]?.set(value);else if(key==='renderOrder')next.traverse(n=>{if(n.material===m)n.renderOrder=value;});else m[key]=value;});}updates.push(()=>m.needsUpdate=true);}}
 updates.forEach(fn=>fn());scene.environment=environment;renderer.toneMappingExposure=c.toneMappingExposure||1;
 if(replace){const previous=object;object=next;mixer=nextMixer;action=nextAction;pivot.add(next);if(previous){pivot.remove(previous);disposeModel(previous);}currentGLB=c.glb;}
 currentColor=c.key;foldPose(fold);document.body.dataset.color=currentColor;
 if(renderer.compileAsync)await renderer.compileAsync(scene,camera);
 draw();
 }catch(error){if(replace)disposeModel(next);throw error;}
}

function heroPose(p){pose=p;pivot.quaternion.copy(base).multiply(new T.Quaternion().setFromEuler(new T.Euler((1-p)*.6,(1-p)*-.25,0)));draw();}
async function spin(color){if(busy)return;busy=true;notify('busy',{busy:true});const from=pivot.quaternion.clone();try{await animate(520,e=>pivot.quaternion.copy(from).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI*e)));await finish(color);await animate(700,e=>pivot.quaternion.copy(from).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI+Math.PI*e)));const start=pivot.quaternion.clone();await animate(900,e=>pivot.quaternion.slerpQuaternions(start,base,e));}catch(error){notify('finish-error',{message:String(error),color:currentColor});}finally{busy=false;notify('busy',{busy:false});notify('spin-complete');}}
function projectCheckout(root,cam,T){
 const bounds={left:1,top:1,right:0,bottom:0};let count=0;root.updateMatrixWorld(true);cam.updateMatrixWorld(true);
 root.traverse(mesh=>{if(!mesh.isMesh||!mesh.geometry?.attributes?.position)return;const g=mesh.geometry,materials=Array.isArray(mesh.material)?mesh.material:[mesh.material],groups=g.groups.length?g.groups:[{start:0,count:g.index?g.index.count:g.attributes.position.count,materialIndex:0}],v=new T.Vector3();
 for(const group of groups){if(!materials[group.materialIndex]?.userData?.checkout)continue;for(let i=group.start;i<group.start+group.count;i++){const index=g.index?g.index.getX(i):i;v.fromBufferAttribute(g.attributes.position,index).applyMatrix4(mesh.matrixWorld).project(cam);const x=(v.x+1)/2,y=(1-v.y)/2;if(!Number.isFinite(x+y))continue;bounds.left=Math.min(bounds.left,x);bounds.right=Math.max(bounds.right,x);bounds.top=Math.min(bounds.top,y);bounds.bottom=Math.max(bounds.bottom,y);count++;}}});
 return count&&bounds.right>bounds.left&&bounds.bottom>bounds.top?bounds:null;
}
function checkout(order){
   const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=2340;
   const c=canvas.getContext('2d');c.fillStyle='#f7f4f6';c.fillRect(0,0,1080,2340);
   c.fillStyle='#726473';c.font='30px SF,Arial,sans-serif';c.textAlign='left';c.fillText('← К выбору',70,145);c.textAlign='right';c.fillStyle='#211921';c.font='45px SF,Arial,sans-serif';c.fillText('+product',1010,145);
   c.textAlign='center';c.fillStyle='#9a7a8e';c.font='32px SF,Arial,sans-serif';c.fillText('Ваш выбор',540,815);
   c.fillStyle='#211921';c.font='72px SF,Arial,sans-serif';c.fillText(order.name||'iPhone',540,955,960);
   c.fillStyle='#847685';c.font='35px SF,Arial,sans-serif';c.fillText(order.summary||'',540,1065,950);
   c.fillStyle='#211921';c.font='68px SF,Arial,sans-serif';c.fillText(order.price||'',540,1255);
   c.fillStyle='#241b24';c.beginPath();c.roundRect(220,1350,640,130,65);c.fill();c.fillStyle='#fff';c.font='34px SF,Arial,sans-serif';c.fillText('Добавить в корзину',540,1433);
   c.fillStyle='#a497a6';c.font='23px SF,Arial,sans-serif';c.fillText('Демонстрация · оплата не подключена',540,1575,970);
const map=new T.CanvasTexture(canvas);let facingMesh;
object.traverse(n=>{if(!n.isMesh)return;const list=Array.isArray(n.material)?n.material:[n.material];const next=list.map(m=>{if(!/Display_Activearea/i.test(m.name)||family.startsWith('fold')&&!/Front/i.test(m.name))return m;const texture=map.clone(),old=m.emissiveMap||m.map;texture.flipY=old?.flipY??false;texture.channel=old?.channel??0;texture.colorSpace=T.SRGBColorSpace;if(old){texture.offset.copy(old.offset);texture.repeat.copy(old.repeat);texture.center.copy(old.center);texture.rotation=old.rotation;}texture.needsUpdate=true;const material=new T.MeshBasicMaterial({map:texture,toneMapped:false,side:m.side});material.userData.checkout=true;facingMesh=n;return material;});if(next.some((m,i)=>m!==list[i]))restored.push({mesh:n,material:n.material,replacements:next.filter((m,i)=>m!==list[i])});n.material=Array.isArray(n.material)?next:next[0];});return facingMesh;}
let purchaseRun=0;
function restoreCheckout(){restored.forEach(x=>{x.mesh.material=x.material;x.replacements.forEach(m=>{m.map?.dispose();m.dispose();});});restored=[];document.body.dataset.checkoutScreen='0';}
async function purchase(order){
 if(busy)return;busy=true;animation++;const run=++purchaseRun;
 try{
  await document.fonts?.load('32px SF').catch(()=>[]);if(run!==purchaseRun)return;
  if(action&&fold>.01){const start=fold;if(!await animate(700,e=>foldPose(start*(1-e))))return;notify('fold-complete',{open:false});}
  const mesh=checkout(order);if(!mesh)throw Error('Экран устройства не найден');
  document.body.dataset.checkoutScreen=String(restored.length);
  if(renderer.compileAsync)await renderer.compileAsync(scene,camera);if(run!==purchaseRun)return;
  object.updateMatrixWorld(true);
  const attr=mesh.geometry.attributes.normal,normal=new T.Vector3(attr.getX(0),attr.getY(0),attr.getZ(0)).transformDirection(mesh.matrixWorld).applyQuaternion(pivot.quaternion.clone().invert());
  const up=new T.Vector3(0,1,0).addScaledVector(normal,-normal.y).normalize(),right=new T.Vector3().crossVectors(up,normal).normalize();up.crossVectors(normal,right).normalize();
  const target=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,normal)).invert(),from=pivot.quaternion.clone();
  if(!await animate(1450,e=>pivot.quaternion.slerpQuaternions(from,target,e))||run!==purchaseRun)return;
  const screen=projectCheckout(pivot,camera,T);if(!screen)throw Error('Не удалось определить положение экрана');
  document.body.dataset.purchaseFacing='true';notify('purchase-facing',{screen});
 }catch(error){if(run!==purchaseRun)return;restoreCheckout();busy=false;notify('purchase-error',{message:String(error)});}
}
addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent||!object)return;const d=e.data;if(d.type==='hero-pose'&&!busy)heroPose(d.progress);if(d.type==='spin-finish')spin(d.color);if(d.type==='finish'&&!busy){busy=true;notify('busy',{busy:true});finish(d.color).catch(error=>notify('finish-error',{message:String(error),color:currentColor})).finally(()=>{busy=false;notify('busy',{busy:false});notify('spin-complete');});}if(d.type==='orbit-begin'&&!busy){animation++;}if(d.type==='orbit-drag'&&!busy){const q=new T.Quaternion().setFromEuler(new T.Euler(d.dy*.008,d.dx*.008,0));pivot.quaternion.premultiply(q);draw();}if(d.type==='nudge'&&!busy){const from=pivot.quaternion.clone();animate(1100,(e,p)=>{pivot.quaternion.copy(from).premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.sin(p*Math.PI*4)*.04*Math.sin(p*Math.PI)));});}if(d.type==='fold'&&action&&!busy){busy=true;notify('busy',{busy:true});const start=fold,end=fold<.5?1:0;animate(1200,e=>foldPose(start+(end-start)*e)).then(()=>{busy=false;notify('busy',{busy:false});notify('fold-complete',{open:end===1});});}if(d.type==='purchase-enter')purchase(d.order);if(d.type==='purchase-exit'){purchaseRun++;animation++;document.body.dataset.purchaseFacing='false';restoreCheckout();busy=false;heroPose(1);}});
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();notify('context-lost');});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);draw();});
try{const data=await fetch('products.json?v=2').then(r=>r.json());product=data[family];if(!product)throw Error('Unknown Samsung model');await finish(params.get('color'));heroPose(1);notify('ready');if(params.has('capture')){draw();const image=document.createElement('img');image.id='poster-output';image.src=renderer.domElement.toDataURL('image/webp',.94);document.body.append(image);}}
catch(error){document.querySelector('#status').textContent='Не удалось загрузить 3D';notify('error',{message:String(error)});console.error(error);}


