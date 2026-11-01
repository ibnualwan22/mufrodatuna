import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
const loader=new GLTFLoader();
const gltf=await loader.loadAsync('references/original.glb');
const root=gltf.scene;
const textures=await Promise.all(['references/desain-baju.jpg','references/batik.png'].map(p=>new THREE.TextureLoader().loadAsync(p)));
for(const t of textures){t.colorSpace=THREE.SRGBColorSpace;t.flipY=false;t.anisotropy=8;}
const [shirt,batik]=textures;batik.wrapS=batik.wrapT=THREE.RepeatWrapping;
const fabric=new THREE.MeshStandardMaterial({name:'Batik pengguna',map:batik,roughness:.93,metalness:0});
const print=new THREE.MeshStandardMaterial({name:'Desain baju pengguna',map:shirt,roughness:.92,metalness:0});
const black=new THREE.MeshStandardMaterial({name:'Kain hitam',color:0x000000,roughness:.92,metalness:0});
const removed=[];
root.traverse(o=>{if(/^(skirt_diagonal_|skirt_flower_|flower_cross_|scarf_stripe_|scarf_flower_|scarf_cross|yellow_label_|arabic_text_)/.test(o.name))removed.push(o);});
removed.forEach(o=>o.removeFromParent());
function mapUV(o,kind){
 const indexed=o.geometry.clone();indexed.computeVertexNormals();const g=indexed.toNonIndexed();indexed.dispose();
 const p=g.attributes.position,uv=[];
 for(let i=0;i<p.count;i+=3){
  const coords=[];
  for(let j=0;j<3;j++){
   const x=p.getX(i+j),y=p.getY(i+j),z=p.getZ(i+j);
   if(kind==='shirt')coords.push([x/1.5+.42,(2.97-z)/1.5]);
   else if(kind==='cap'){
    // Cylindrical longitude, measured from the back; seam correction below.
    coords.push([(Math.atan2(x,-(y-.015))+Math.PI)/(2*Math.PI), (4.84-z)/1.35]);
   }else if(kind==='skirt')coords.push([(Math.atan2(x,-y/.78)+Math.PI)/(2*Math.PI),(2.05-z)/1.15]);
   else coords.push([(Math.atan2(x,-(y-.43)/.49)+Math.PI)/(2*Math.PI),(4.44-z)/1.35]);
  }
  if(kind!=='shirt'){
   const us=coords.map(v=>v[0]);if(Math.max(...us)-Math.min(...us)>.5)coords.forEach(v=>{if(v[0]<.5)v[0]+=1;});
   coords.forEach(v=>v[0]*=kind==='skirt'?3.5:kind==='cap'?4:3.5);
  }
  coords.forEach(v=>uv.push(...v));
 }
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.clearGroups();
 if(kind==='shirt'){
  for(let i=0;i<p.count;i+=3){const front=(p.getY(i)+p.getY(i+1)+p.getY(i+2))/3<-.05;g.addGroup(i,3,front?0:1);}
  o.material=[print,black];
 }else o.material=fabric;
 o.geometry=g;
}
root.traverse(o=>{
 if(!o.isMesh)return;
 if(o.name==='black_tunic_body')mapUV(o,'shirt');
 else if(o.name==='patterned_wrap_skirt_base')mapUV(o,'skirt');
 else if(o.name==='headscarf_cap')mapUV(o,'cap');
 else if(o.name==='headscarf_back_drape')mapUV(o,'back');
 else {
  o.geometry.computeVertexNormals();
  if(/sleeve|_leg$/.test(o.name))o.material=black;
  else{ o.material=o.material.clone();o.material.metalness=0;o.material.roughness=/eye_black|eye_glint|beak|foot|toe/.test(o.name)?.36:.8; }
 }
});
// Source uses Z up / -Y front. Export a standard glTF Y-up, +Z-front asset.
root.rotation.x=-Math.PI/2;root.updateMatrixWorld(true);
root.userData={title:'Maskot dengan desain baju dan batik pengguna',rigged:false,source:'maskot_3d_360.glb',notes:'Original supplied geometry preserved except previous decorative motifs and labels replaced by supplied image textures. No skeletal rig or animation in source.'};
const buffer=await new GLTFExporter().parseAsync(root,{binary:true,onlyVisible:true});
const response=await fetch('/save-model',{method:'POST',headers:{'Content-Type':'model/gltf-binary'},body:buffer});
if(!response.ok)throw new Error('Failed to save GLB');
window.buildResult={bytes:buffer.byteLength,removedDecorations:removed.length};
document.body.textContent=JSON.stringify(window.buildResult);
