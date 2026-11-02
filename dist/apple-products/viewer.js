(() => {
  const params=new URLSearchParams(location.search),family=params.get('scene');
  const notify=(type,extra={})=>parent.postMessage({source:'apple-native-viewer',family,type,requestId:params.get('request'),...extra},location.origin);
  const photo=document.querySelector('#product');
  photo.addEventListener('load',()=>{document.body.dataset.ready='true';notify('ready');},{once:true});
  photo.addEventListener('error',()=>notify('error',{message:'Не удалось загрузить фото товара'}));
  fetch('products.json?v=1').then(r=>{if(!r.ok)throw Error('photo catalogue');return r.json();}).then(products=>{
    const product=products[family];if(!product)throw Error('Unknown product');
    const portrait=document.createElement('source');portrait.media='(max-aspect-ratio:94/100)';portrait.srcset=family+'-portrait.webp';document.querySelector('#photo').prepend(portrait);
    photo.alt=product.name;photo.src=product.src;
  }).catch(error=>notify('error',{message:String(error)}));
  addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent)return;if(event.data?.type==='purchase-enter'&&photo.complete&&photo.naturalWidth)notify('purchase-facing',{staticImage:true});});
})();
