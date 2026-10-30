export function captionWordAt(text:string,index:number):{start:number;length:number}|undefined {
  if(!Number.isFinite(index)||index<0||index>=text.length)return;
  for(const word of text.matchAll(/\S+/gu)){
    const start=word.index!;
    if(index>=start&&index<start+word[0].length)return {start,length:word[0].length};
  }
}
// Presentation uses the audio reaching the speakers, independently of mouth animation.
export function audibleElapsed(context:{currentTime:number;outputLatency?:number;baseLatency?:number;getOutputTimestamp?:()=>{contextTime?:number}},started:number):number {
  const timestamp=context.getOutputTimestamp?.().contextTime;
  const clock=typeof timestamp==='number'&&timestamp>0&&timestamp<=context.currentTime?timestamp:context.currentTime-Math.max(0,context.outputLatency??context.baseLatency??0);
  return Math.max(0,clock-started);
}
