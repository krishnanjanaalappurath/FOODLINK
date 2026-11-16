// Firebase data layer (Auth + Firestore, Spark plan). Reads are synchronous from a live cache fed by onSnapshot;
// writes are async. Same function names as Phase 1, so App.jsx changes are small.
import {initializeApp} from 'firebase/app';
import {getAuth,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,deleteUser} from 'firebase/auth';
import {getFirestore,collection,doc,getDoc,getDocs,setDoc,addDoc,updateDoc,deleteDoc,onSnapshot,query,where,runTransaction,writeBatch,serverTimestamp} from 'firebase/firestore';
const e=import.meta.env;
const cfg={apiKey:e.VITE_FIREBASE_API_KEY,authDomain:e.VITE_FIREBASE_AUTH_DOMAIN,projectId:e.VITE_FIREBASE_PROJECT_ID,appId:e.VITE_FIREBASE_APP_ID};
export const configured=!!(cfg.apiKey&&cfg.projectId&&cfg.appId);
export const DEMO=false,CONSENT_VERSION='2026-11-v1';
let auth,fs;if(configured){const app=initializeApp(cfg);auth=getAuth(app);fs=getFirestore(app)}
const C={users:[],listings:[],reservations:[],consents:[],reports:[],docs:[]};
let me=null,isReady=false,ls={pub:[],own:[]},subs=[],fns=new Set(),gen=0,registering=false,started=false;
const ms=v=>v?.toMillis?v.toMillis():(v||Date.now());
const emit=()=>{C.listings=[...new Map([...ls.pub,...ls.own].map(x=>[x.id,x])).values()];fns.forEach(f=>f())};
const rows=(s,fix=x=>x)=>s.docs.map(d=>fix({...d.data(),id:d.id}));
const watch=(q,cb)=>subs.push(onSnapshot(q,s=>{cb(s);emit()},err=>console.error('Firestore:',err.code,err.message)));
const stop=()=>{subs.forEach(u=>u());subs=[];ls={pub:[],own:[]};Object.assign(C,{users:[],reservations:[],consents:[],reports:[],docs:[]})};
const fixRes=x=>({...x,at:ms(x.at),total:x.qty*x.price});
async function start(user){
 const g=++gen;stop();const col=n=>collection(fs,n);
 if(!user){me=null;isReady=true;watch(query(col('listings'),where('status','==','active')),s=>ls.pub=rows(s));emit();return}
 const adm=(await getDoc(doc(fs,'admins',user.uid))).exists();
 const prof=adm?null:await getDoc(doc(fs,'users',user.uid));if(g!==gen)return;
 if(adm){me={id:user.uid,role:'admin',name:user.email,email:user.email,status:'active'};
  watch(col('users'),s=>C.users=rows(s));watch(col('listings'),s=>ls.pub=rows(s));watch(col('reservations'),s=>C.reservations=rows(s,fixRes));
  watch(col('consents'),s=>C.consents=rows(s));watch(col('reports'),s=>C.reports=rows(s));watch(col('businessDocs'),s=>C.docs=rows(s));isReady=true;emit();return}
 if(!prof.exists()){me=null;isReady=true;emit();return}
 const role=prof.data().role,biz=['restaurant','bakery','produce'].includes(role);
 watch(doc(fs,'users',user.uid),s=>{me=s.exists()?{...s.data(),id:s.id}:null;C.users=me?[me]:[]});
 watch(query(col('listings'),where('status','==','active')),s=>ls.pub=rows(s));
 watch(query(col('consents'),where('userId','==',user.uid)),s=>C.consents=rows(s));
 if(biz){watch(query(col('listings'),where('bizId','==',user.uid)),s=>ls.own=rows(s));watch(query(col('reservations'),where('bizId','==',user.uid)),s=>C.reservations=rows(s,fixRes))}
 else watch(query(col('reservations'),where('userId','==',user.uid)),s=>C.reservations=rows(s,fixRes));
 me={...prof.data(),id:user.uid};C.users=[me];isReady=true;emit()}
export function subscribe(f){fns.add(f);if(configured&&!started){started=true;onAuthStateChanged(auth,u=>{if(!registering)start(u)})}return()=>fns.delete(f)}
export const load=()=>C,session=()=>me,ready=()=>isReady;
export const listings=()=>C.listings.filter(l=>l.status==='active'&&l.qty>0&&l.deadline>Date.now());
export const hasConsent=id=>C.consents.some(c=>c.userId===id&&c.version===CONSENT_VERSION);
const need=(c,m)=>{if(!c)throw new Error(m)};
export const errText=x=>({'auth/invalid-credential':'Wrong email or password.','auth/email-already-in-use':'Email already registered.','auth/too-many-requests':'Too many attempts. Try again later.','auth/network-request-failed':'Network error.','permission-denied':'Not allowed by security rules.'}[x.code]||x.message);
export const readFile=(f,max)=>new Promise((ok,no)=>{if(f.size>max)return no(new Error(`File must be under ${Math.round(max/1000)} KB.`));const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>no(new Error('Could not read file.'));r.readAsDataURL(f)});
export const logout=()=>auth&&signOut(auth);

export async function register(f){const em=f.email.trim().toLowerCase(),biz=['restaurant','bakery','produce'].includes(f.role);
 need(['customer','restaurant','bakery','produce','ngo'].includes(f.role),'Choose a valid account type.'); // admin can never self-register
 need(/^\S+@\S+\.\S+$/.test(em),'Enter a valid email.');need(f.pw.length>=8,'Password needs 8+ characters.');need(f.name.trim(),'Name is required.');
 if(biz){for(const k of['contact','phone','address','type','licence'])need(f[k]?.trim(),`Business field missing: ${k}.`);need(f.file,'Attach a supporting document.')}
 const data=biz?await readFile(f.file,5e5):null;registering=true;let cred;
 try{cred=await createUserWithEmailAndPassword(auth,em,f.pw);const uid=cred.user.uid;
  const b=writeBatch(fs); // profile + business document commit together or not at all
  b.set(doc(fs,'users',uid),{role:f.role,name:f.name.trim(),email:em,phone:f.phone||'',status:biz?'pending':'active',feedback:'',createdAt:serverTimestamp(),
   ...(biz?{biz:{contact:f.contact,address:f.address,type:f.type,licence:f.licence,docs:f.file.name}}:{}),...(f.role==='ngo'?{org:{address:f.address||'',reg:f.licence||''}}:{})});
  if(biz)b.set(doc(fs,'businessDocs',uid),{name:f.file.name,data,at:serverTimestamp()});
  await b.commit();
 }catch(x){let clean=true;if(cred)await deleteUser(cred.user).catch(()=>{clean=false});
  throw clean?x:new Error(errText(x)+' The partly created sign-in could not be removed; wait a minute and try again, or use another email.')}
 finally{registering=false}
 await start(auth.currentUser)}
export async function login(email,pw,admin){const c=await signInWithEmailAndPassword(auth,email.trim().toLowerCase(),pw);
 const isAdm=(await getDoc(doc(fs,'admins',c.user.uid))).exists();let bad=null;
 if(!!admin!==isAdm)bad=admin?'Not an admin account.':'Admins must use the admin sign-in.';
 else if(!isAdm){const s=await getDoc(doc(fs,'users',c.user.uid));bad=!s.exists()?'No FOODLINK profile for this login.':s.data().status==='suspended'?'This account is suspended.':null}
 if(bad){await signOut(auth);throw new Error(bad)}}

export async function saveListing(u,f){const qty=+f.qty,orig=+f.orig,price=+f.price;
 need(['restaurant','bakery','produce'].includes(u.role)&&u.status==='approved','Only approved providers can publish.');
 need(f.name?.trim()&&f.desc?.trim(),'Name and description are required.');need(u.role==='produce'||f.allergens?.trim(),'Allergens are required for prepared food listings.');
 need(Number.isInteger(qty)&&qty>0&&orig>0&&price>=0&&price<=orig,'Check quantity and prices (discount must not exceed original).');need(f.deadline>Date.now(),'Pickup deadline must be in the future.');
 await addDoc(collection(fs,'listings'),{bizId:u.id,bizName:u.name,location:u.biz.address,status:'active',listed:Date.now(),name:f.name.trim(),desc:f.desc.trim(),category:f.category||'Other',qty,orig,price,listingType:u.role==='produce'?'produce':'prepared',qtyUnit:u.role==='produce'?'kg':'items',made:u.role==='produce'?0:(f.made||0),harvestDate:u.role==='produce'?(f.harvestDate||null):null,deadline:f.deadline,useBy:u.role==='produce'?null:(f.useBy||null),allergens:u.role==='produce'?'':(f.allergens||'').trim(),storage:f.storage||'',img:f.img||null,createdAt:serverTimestamp()})}
export async function setListing(u,id,p){const r=doc(fs,'listings',id);if(p==='delete')return deleteDoc(r);
 if('qty' in p)need(Number.isInteger(p.qty)&&p.qty>=0,'Quantity must be a whole number, 0 or more.');await updateDoc(r,p)}
export async function consent(u){if(hasConsent(u.id))return;await setDoc(doc(fs,'consents',`${u.id}_${CONSENT_VERSION}`),{userId:u.id,version:CONSENT_VERSION,at:serverTimestamp()})}
export async function reserve(u,id,qty){qty=+qty;
 need(['customer','ngo'].includes(u.role),'Only customers and NGOs can reserve.');need(hasConsent(u.id),'Consent required.');need(Number.isInteger(qty)&&qty>0,'Enter a whole quantity.');
 const lr=doc(fs,'listings',id),rr=doc(collection(fs,'reservations'));
 await runTransaction(fs,async tx=>{const s=await tx.get(lr);need(s.exists(),'Listing is no longer available.');const l=s.data();
  need(l.status==='active'&&l.deadline>Date.now(),'Listing is no longer available.');need(qty<=l.qty,`Only ${l.qty} left.`);
  tx.update(lr,{qty:l.qty-qty,lastRes:rr.id});
  tx.set(rr,{listingId:id,bizId:l.bizId,bizName:l.bizName,name:l.name,price:l.price,userId:u.id,userName:u.name,kind:u.role==='ngo'?'request':'reservation',qty,status:'pending',pickup:`${l.location} before ${new Date(l.deadline).toLocaleString()}`,at:serverTimestamp()})})}
export async function setRes(u,id,status){const rr=doc(fs,'reservations',id);
 await runTransaction(fs,async tx=>{const s=await tx.get(rr);need(s.exists(),'Not found.');const r=s.data();
  need((r.status==='pending'&&['confirmed','cancelled'].includes(status))||(r.status==='confirmed'&&['collected','cancelled'].includes(status)),`Cannot change from ${r.status} to ${status}.`);
  if(status==='cancelled'){const lr=doc(fs,'listings',r.listingId),ln=await tx.get(lr);if(ln.exists())tx.update(lr,{qty:ln.data().qty+r.qty,lastRes:id})} // restores stock once: status leaves pending/confirmed in the same transaction
  tx.update(rr,{status,updatedAt:serverTimestamp()})})}
export async function decide(u,id,status,feedback){need(u.role==='admin','Admins only.');if(status==='rejected')need(feedback?.trim(),'Give a reason for rejection.');
 const b=writeBatch(fs);b.update(doc(fs,'users',id),{status,feedback:feedback||''});
 if(['rejected','suspended'].includes(status)){(await getDocs(query(collection(fs,'listings'),where('bizId','==',id)))).forEach(d=>b.update(d.ref,{status:'paused'}))}
 await b.commit()}
export async function report(u,listingId,reason){need(reason?.trim(),'Describe the problem.');await addDoc(collection(fs,'reports'),{listingId,reporterId:u.id,reason:reason.trim().slice(0,500),status:'open',at:serverTimestamp()})}
export const resolveReport=(u,id)=>updateDoc(doc(fs,'reports',id),{status:'resolved'});

export async function saveProfile(u,f){
 const avatars=['🥑','🍊','🐻','🐼','🐸','🐱','🦋','🌻','🐰','🦊','🐨','🐧','🍓','🌈','⭐','🌿'];
 const name=(f.name||'').trim(),phone=(f.phone||'').trim();
 need(u?.id&&['customer','ngo'].includes(u.role),'Invalid profile.');
 need(name.length>0&&name.length<=100,'Enter a name (maximum 100 characters).');
 need(phone.length<=30,'Phone number is too long.');
 need(avatars.includes(f.avatar),'Choose a valid avatar.');
 await updateDoc(doc(fs,'users',u.id),{name,phone,avatar:f.avatar});
}
