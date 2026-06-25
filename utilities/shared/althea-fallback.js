// Althea Fallback v2: offline nearest-match Q&A (token overlap)
(function(){
  function norm(s){
    return (s||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  }
  function tokens(s){
    const t=norm(s).split(' ').filter(Boolean);
    // drop tiny stopwords
    return t.filter(w=>w.length>2 && !['the','and','for','with','that','this','from','into','your','you','are','how','what','why','can','does','did','will','when'].includes(w));
  }
  function score(qt, ct){
    const qs=new Set(qt);
    let hit=0;
    for(const w of ct) if(qs.has(w)) hit++;
    // small length normalization
    return hit / Math.sqrt((qt.length||1)*(ct.length||1));
  }

  window.AltheaFallback = {
    bestMatch(question, dataset){
      const qt=tokens(question);
      let best=null;
      let bestScore=-1;
      for(const item of (dataset||[])){
        const ct=tokens(item.q||item.question||'');
        const sc=score(qt, ct);
        if(sc>bestScore){ bestScore=sc; best=item; }
      }
      return {best, bestScore};
    }
  };
})();
