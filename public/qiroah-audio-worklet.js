class QiroahPcmProcessor extends AudioWorkletProcessor {
  constructor(){super();this.step=sampleRate/16000;this.cursor=0;this.pending=[];}
  process(inputs){
    const source=inputs[0]?.[0];if(!source)return true;
    // AudioContext may run at 44.1/48 kHz. Resample the waveform instead of
    // relabeling it as 16 kHz; keep phase across render quanta.
    while(this.cursor<source.length){
      const at=Math.floor(this.cursor),fraction=this.cursor-at;
      const sample=(source[at]||0)*(1-fraction)+(source[Math.min(at+1,source.length-1)]||0)*fraction;
      this.pending.push(Math.max(-32768,Math.min(32767,Math.round(sample*32767))));
      this.cursor+=this.step;
      if(this.pending.length>=2048){
        const pcm=Int16Array.from(this.pending.splice(0,2048));
        this.port.postMessage(pcm.buffer,[pcm.buffer]);
      }
    }
    this.cursor-=source.length;
    return true;
  }
}
registerProcessor('qiroah-pcm',QiroahPcmProcessor);
