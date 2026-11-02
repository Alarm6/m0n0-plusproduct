(() => {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let lastPulse=-Infinity,lastTick=-1,lastReveal=null,lastRevealBand=-1;
  function available(){return typeof navigator.vibrate==='function'&&navigator.maxTouchPoints>0&&!document.hidden&&!reduced.matches&&(!navigator.userActivation||navigator.userActivation.hasBeenActive);}
  function pulse(pattern,gap=65){
    const now=performance.now();if(!available()||now-lastPulse<gap)return false;
    try{const ok=navigator.vibrate(pattern);if(ok)lastPulse=now;return ok;}catch{return false;}
  }
  function stop(){if(typeof navigator.vibrate==='function')try{navigator.vibrate(0);}catch{}}
  window.productHaptics={
    pulse,
    reset(){lastTick=-1;lastReveal=null;lastRevealBand=-1;stop();},
    tick(index){if(index===lastTick)return;lastTick=index;pulse(index>=12?12:6,35);},
    reveal(p){
      if(lastReveal===null){lastReveal=p;lastRevealBand=Math.floor(p*28);return;}
      const moving=Math.abs(p-lastReveal)>.0005,band=Math.floor(p*28);lastReveal=p;
      if(!moving||band===lastRevealBand)return;lastRevealBand=band;
      // Brief pulses become denser/longer as the surface stretches; never a continuous buzz.
      if(p>.03&&p<.96)pulse(3+Math.round(p*9),125-p*40);
      else if(p>=.98)pulse([8,45,5],160);
    },
    colorStart(){pulse([5,65,4]);},colorEnd(){pulse(10);},
    modelStart(){pulse([7,50,5]);},modelEnd(){pulse([10,45,4]);}
  };
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  reduced.addEventListener('change',()=>{if(reduced.matches)stop();});
  addEventListener('pagehide',stop);
})();
