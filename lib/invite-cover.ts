// Decode and redraw on the device: strips photo metadata and never uploads the original file.
export async function prepareInviteCover(file:File){
 if(!/^image\/(jpeg|png|webp|avif|heic|heif)$/.test(file.type))throw Error('Choose a JPEG, PNG, WebP or HEIC photo.');
 if(file.size>20000000)throw Error('Choose an image smaller than 20 MB.');
 let bitmap:ImageBitmap;try{bitmap=await createImageBitmap(file)}catch{throw Error('This browser couldn’t open that image. Try a JPEG or PNG.');}
 try{
  const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=500;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('This browser couldn’t prepare the image.');
  ctx.fillStyle='#fffaf3';ctx.fillRect(0,0,1000,500);
  const ratio=Math.max(1000/bitmap.width,500/bitmap.height),w=bitmap.width*ratio,h=bitmap.height*ratio;
  ctx.drawImage(bitmap,(1000-w)/2,(500-h)/2,w,h);
  for(const q of [.86,.72,.56,.4,.25]){const data=canvas.toDataURL('image/jpeg',q);if(data.length*.75<=96000)return data;}
  throw Error('That image has too much detail. Try another one.');
 }finally{bitmap.close();}
}
