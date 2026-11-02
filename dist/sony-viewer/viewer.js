(() => {
const photo=document.querySelector('#product'),params=new URLSearchParams(location.search);
const notify=(type,extra={})=>parent.postMessage({source:'apple-native-viewer',family:'ps5',type,requestId:params.get('request'),...extra},location.origin);
function ready(){document.body.dataset.ready='true';notify('ready');}
if(photo.complete&&photo.naturalWidth)ready();else photo.addEventListener('load',ready,{once:true});
photo.addEventListener('error',()=>notify('error',{message:'Не удалось загрузить изображение PlayStation'}));
addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent)return;if(event.data?.type==='purchase-enter')notify('purchase-facing',{staticImage:true});});
})();
