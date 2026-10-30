// Five-word windows preserve the original spelling, accents and punctuation.
export function captionWindow(text:string,cursor:number,size=5){
 const words=Array.from(text.matchAll(/\S+/gu));
 if(!words.length)return {text:'',start:0,end:0};
 let active=0;
 for(let index=0;index<words.length;index++){if(words[index].index!>cursor)break;active=index;}
 const first=Math.floor(active/size)*size,last=Math.min(words.length-1,first+size-1);
 const start=words[first].index!,end=words[last].index!+words[last][0].length;
 return {text:text.slice(start,end),start,end};
}
