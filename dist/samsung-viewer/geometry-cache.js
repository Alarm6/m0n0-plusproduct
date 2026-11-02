// Cache only exact decoded geometry, never a second copy of the device textures.
export function cacheDracoGeometry(loader,budget=8*1024*1024){
  const decode=loader.decodeGeometry.bind(loader),entries=new Map(),inflight=new WeakMap();let bytes=0,hits=0;
  const size=g=>{const arrays=new Set();if(g.index)arrays.add(g.index.array);for(const a of Object.values(g.attributes))arrays.add(a.isInterleavedBufferAttribute?a.data.array:a.array);return [...arrays].reduce((n,a)=>n+a.byteLength,0);};
  loader.decodeGeometry=function(buffer,config){
    if(!globalThis.crypto?.subtle||!buffer.byteLength)return decode(buffer,config);
    const task=JSON.stringify(config);let tasks=inflight.get(buffer);if(!tasks){tasks=new Map();inflight.set(buffer,tasks);}if(tasks.has(task))return tasks.get(task);
    const result=(async()=>{
      const hash=await crypto.subtle.digest('SHA-256',buffer),key=Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('')+task;
      let entry=entries.get(key);
      if(entry){entries.delete(key);entries.set(key,entry);hits++;}
      else{
        entry={promise:decode(buffer,config),size:0};entries.set(key,entry);
        try{const geometry=await entry.promise;entry.size=size(geometry);bytes+=entry.size;
          for(const [oldKey,old]of entries){if(bytes<=budget)break;if(!old.size)continue;entries.delete(oldKey);bytes-=old.size;}
        }catch(error){entries.delete(key);throw error;}
      }
      const geometry=await entry.promise;
      if(typeof document!=='undefined'){document.body.dataset.geometryCacheHits=String(hits);document.body.dataset.geometryCacheBytes=String(bytes);}
      // A clone isolates disposal and mesh-specific UV/attribute edits in GLTFLoader.
      return geometry.clone();
    })();tasks.set(task,result);return result;
  };
  return ()=>({bytes,hits});
}
