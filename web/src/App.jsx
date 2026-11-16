import {useState,useEffect} from 'react';
import * as db from './db';
const DISC="FOODLINK is a platform that facilitates connections between food providers and recipients. Food preparation, handling, storage, quality, allergen information, hygiene, packaging and food safety remain the responsibility of the respective food provider. Users should review the available food information and make informed decisions before accepting or consuming food. FOODLINK does not independently certify the safety or quality of listed food.";
const fmt=t=>t?new Date(t).toLocaleString([],{dateStyle:'medium',timeStyle:'short'}):'n/a';
const CATS=['Bakery','Meals','Produce','Drinks','Other'];
const CONSENTS=["I understand FOODLINK is an intermediary platform and does not prepare, inspect, store or supply food.","I understand food and produce are provided by independent food providers.","I will review food descriptions, allergen information, storage instructions and collection deadlines.","I understand the food provider is responsible for preparation, handling and food safety.","I will follow the collection, storage and consumption instructions given.","I have read the Terms and Privacy Policy."];
const F=({l,children})=><label className="f"><span>{l}</span>{children}</label>;
const Disc=()=><p className="disc" role="note"><b>Food safety notice. </b>{DISC}</p>;

export default function App(){
 const [,t]=useState(0);const [view,setView]=useState('home');const [toast,setToast]=useState(null);
 useEffect(()=>db.subscribe(()=>t(n=>n+1)),[]);const u=db.session();
 const flash=(m,bad)=>{setToast({m,bad});setTimeout(()=>setToast(null),4000)};
 const act=async fn=>{try{await fn();t(n=>n+1);return true}catch(e){flash(db.errText(e),true);return false}};
 const P={u,act,flash};const out=()=>{db.logout();setView('home')};
 if(!db.configured)return <main><div className="card narrow"><h2>Firebase is not configured</h2><p>Copy .env.example to .env, fill in your Firebase web app values, then restart. See README.</p></div></main>;
 return <>
  <header><b className="brand" onClick={()=>!u&&setView('home')}>
  <img className="brand-mark" src={`${import.meta.env.BASE_URL}foodlink-logo.svg`} alt="" />
  FOODLINK
</b>
   <nav>{u?<><span className="badge">{u.role}</span><button className="ghost" onClick={out}>Sign out</button></>:<><button className="ghost" onClick={()=>setView('login')}>Log in</button><button onClick={()=>setView('register')}>Register</button></>}</nav></header>
  {toast&&<div className={'toast '+(toast.bad?'bad':'')} role="alert">{toast.m}</div>}
  <main>{!db.ready()?<p className="empty">Loading…</p>:!u?(view==='home'?<Home go={setView}/>:<Auth key={view} mode={view} act={act} go={setView}/>)
   :u.status==='suspended'&&['customer','ngo'].includes(u.role)?<div className="card narrow"><h2>Account suspended</h2><p>Contact FOODLINK support.</p></div>:u.role==='admin'?<Admin {...P}/>:u.role==='ngo'||u.role==='customer'?<Shop {...P}/>:<Biz {...P} u={db.load().users.find(x=>x.id===u.id)}/>}</main>
  <footer><Disc/><p>Contact: hello@foodlink.example · Terms · Privacy (replace with your real pages) · {!u&&<a href="#a" onClick={e=>{e.preventDefault();setView('admin')}}>Admin sign-in</a>}</p></footer></>;
}


function Home({go}) {
  return (
    <div className="home-shell">
      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="home-eyebrow">A LITTLE GOOD GOES A LONG WAY</span>
          <h1>Good food.<br /><em>Less waste.</em><br />More good.</h1>
          <p className="home-intro">
            Bringing surplus food and the people who need it closer together.
            Discover good food, support local businesses and help reduce food waste.
          </p>
          <div className="home-actions">
            <button onClick={() => go('register')}>Get started <span>↗</span></button>
            <button className="home-secondary" onClick={() => go('login')}>Log in</button>
          </div>
          <p className="home-note">A small choice can make a meaningful difference.</p>
        </div>

        <div className="home-art">
          <div className="home-art-circle"></div>
          <span className="home-art-sun">✳</span>
          <span className="home-art-leaf leaf-one">❧</span>
          <span className="home-art-leaf leaf-two">❧</span>
          <div className="home-food-illustration">
            <span className="food-fruit">🍊</span>
            <span className="food-leaf">🥬</span>
            <span className="food-bread">🥖</span>
          </div>
          <span className="home-art-caption">Good food deserves<br />a second chance.</span>
        </div>
        <span className="home-side-note">GOOD FOOD · GOOD PURPOSE · GOOD COMMUNITY</span>
      </section>

      <section className="home-story">
        <div>
          <span className="home-eyebrow">THE IDEA BEHIND FOODLINK</span>
          <h2>Food is too good<br />to go to waste.</h2>
        </div>
        <p>
          Every day, perfectly good food can go unsold. FOODLINK helps connect
          food providers with customers and organisations, giving surplus food
          another opportunity to be enjoyed.
        </p>
      </section>

      <section className="home-steps">
        <div className="home-section-heading">
          <span className="home-eyebrow">A SIMPLE WAY TO MAKE A DIFFERENCE</span>
          <h2>Good things happen<br />when we connect.</h2>
        </div>
        <div className="home-step-grid">
          <article className="home-step">
            <span className="home-step-icon">⌕</span>
            <span className="home-step-number">01 / DISCOVER</span>
            <h3>Find good food</h3>
            <p>Explore available surplus food from participating local providers.</p>
          </article>
          <article className="home-step">
            <span className="home-step-icon">♡</span>
            <span className="home-step-number">02 / SHARE</span>
            <h3>Give food a chance</h3>
            <p>Providers can list suitable surplus food for others to discover.</p>
          </article>
          <article className="home-step">
            <span className="home-step-icon">✳</span>
            <span className="home-step-number">03 / MAKE AN IMPACT</span>
            <h3>Waste a little less</h3>
            <p>Every successful connection is a step towards a more thoughtful food community.</p>
          </article>
        </div>
      </section>

      <section className="home-bottom">
        <span className="home-eyebrow">BE PART OF SOMETHING GOOD</span>
        <h2>Let's make every<br />meal matter.</h2>
        <p>Join the FOODLINK community.</p>
        <button onClick={() => go('register')}>Create your account <span>↗</span></button>
      </section>
    </div>
  );
}
function Auth({mode,act,done,go}){
 const admin=mode==='admin',reg=mode==='register';
 const [f,setF]=useState({role:'customer',type:''});
 const s=k=>e=>setF({...f,[k]:e.target.value});
 const biz=f.role==='business';const vendor=biz||f.role==='produce';
 const [busy,setBusy]=useState(false);
 const submit=async e=>{
  e.preventDefault();setBusy(true);
  const data={...f,role:biz?(f.type==='Bakery'?'bakery':'restaurant'):f.role,type:f.role==='produce'?'Fruit & Vegetable Vendor':f.type};
  await act(()=>reg?db.register({pw:'',name:'',email:'',...data}):db.login(f.email||'',f.pw||'',admin));
  setBusy(false);
 };
 return <form className="card narrow" onSubmit={submit}>
  <h2>{admin?'Admin sign-in':reg?'Create account':'Log in'}</h2>
  {reg&&<>
   <F l="Account type">
    <select value={f.role} onChange={s('role')}>
     <option value="customer">Customer</option>
     <option value="business">Business</option><option value="produce">Fruit &amp; Vegetable Vendor</option>
     <option value="ngo">NGO</option>
    </select>
   </F>
   <F l={vendor?'Business name':f.role==='ngo'?'Organisation name':'Full name'}>
    <input required onChange={s('name')}/>
   </F>
   <F l="Phone"><input required={vendor} type="tel" onChange={s('phone')}/></F>
   {biz&&<>
    <F l="Business type">
     <select required value={f.type} onChange={s('type')}>
      <option value="">Choose business type</option>
      <option value="Café">Café</option>
      <option value="Restaurant">Restaurant</option>
      <option value="Bakery">Bakery</option>
      <option value="Other">Other</option>
     </select>
    </F>
   </>}
  </>}
  <F l="Email"><input required type="email" autoComplete="email" onChange={s('email')}/></F>
  <F l="Password (8+ characters)">
   <input required type="password" minLength={8} autoComplete={reg?'new-password':'current-password'} onChange={s('pw')}/>
  </F>
  {reg&&vendor&&<>
   <p className="hint">Your application stays Pending until an admin approves it.</p>
   <F l="Owner / contact person"><input required onChange={s('contact')}/></F>
   <F l="Business address and location"><input required onChange={s('address')}/></F>
   <F l="Registration / licence number"><input required onChange={s('licence')}/></F>
   <F l="Supporting document (PDF or image)">
    <input required type="file" accept=".pdf,image/*" onChange={e=>setF({...f,file:e.target.files[0]})}/>
   </F>
   <p className="hint">Max 500 KB. Only you and admins can read it.</p>
  </>}
  <button disabled={busy}>{admin?'Sign in':reg?'Register':'Log in'}</button>
  {!admin&&<p className="hint">{reg?'Have an account? ':'New here? '}<a href="#s" onClick={e=>{e.preventDefault();go(reg?'login':'register')}}>{reg?'Log in':'Register'}</a></p>}
 </form>;
}

function Card({l,children}){const produce=l.listingType==='produce';return <article className="card">{l.img&&<img src={l.img} alt={l.name}/>}<h3>{l.name}</h3><p className="muted">{l.bizName} · {l.location}</p><p>{l.desc}</p>
 <p><s>{l.orig.toFixed(2)}</s> <b className="price">{l.price.toFixed(2)}</b> · {l.qty} {produce?'kg':'left'}</p>
 <p className="small">{produce?`Harvested ${fmt(l.harvestDate)}`:`Made ${fmt(l.made)}`} · Collect by {fmt(l.deadline)}{l.useBy?` · Use by ${fmt(l.useBy)}`:''}</p>
 <p className="small">{!produce&&<><b>Allergens:</b> {l.allergens}. </>}<b>Storage:</b> {l.storage||'Not stated; ask the provider'}.</p><p className="small safe">Food safety is the provider's responsibility. Check details before collecting.</p>{children}</article>}

function Shop({u,act,flash}){
 const [tab,setTab]=useState('browse'),[q,setQ]=useState(''),[cat,setCat]=useState(''),[max,setMax]=useState(''),[ask,setAsk]=useState(null);const ngo=u.role==='ngo';
 const ls=db.listings().filter(l=>(l.name+l.bizName+l.location).toLowerCase().includes(q.toLowerCase())&&(!cat||l.category===cat)&&(!max||l.price<=+max));
 const mine=db.load().reservations.filter(r=>r.userId===u.id).reverse();
 const go=async(l,n)=>{if(!db.hasConsent(u.id))return setAsk({l,n});if(await act(()=>db.reserve(u,l.id,n)))flash(ngo?'Request sent.':'Reserved. Pickup details are under Orders.')};
 return <><div className="tabs"><button className={tab==='browse'?'on':''} onClick={()=>setTab('browse')}>Browse food</button><button className={tab==='orders'?'on':''} onClick={()=>setTab('orders')}>{ngo?'My requests':'My orders'}</button><button className={tab==='me'?'on':''} onClick={()=>setTab('me')}>Profile</button></div>
 {tab==='browse'&&<><div className="filters"><input aria-label="Search by name or location" placeholder="Search name or location" value={q} onChange={e=>setQ(e.target.value)}/><select aria-label="Category" value={cat} onChange={e=>setCat(e.target.value)}><option value="">All types</option>{CATS.map(c=><option key={c}>{c}</option>)}</select><input aria-label="Max price" type="number" min="0" placeholder="Max price" value={max} onChange={e=>setMax(e.target.value)}/></div>
  {ls.length?<div className="grid">{ls.map(l=><Item key={l.id} l={l} ngo={ngo} go={go} rep={async()=>{const r=prompt('Describe the problem with this listing');if(r&&await act(()=>db.report(u,l.id,r)))flash('Report sent to admins.')}}/>)}</div>:<p className="empty">Nothing matches. Try clearing filters or check back soon.</p>}</>}
 {tab==='orders'&&(mine.length?mine.map(r=><div className="card row" key={r.id}><div><b>{r.name}</b> × {r.qty} · {r.total.toFixed(2)}<p className="small">{r.bizName} · {fmt(r.at)}<br/>Pickup: {r.pickup}</p></div><div><span className={'st '+r.status}>{r.status}</span>{['pending','confirmed'].includes(r.status)&&<button className="ghost" onClick={()=>act(()=>db.setRes(u,r.id,'cancelled'))}>Cancel</button>}</div></div>):<p className="empty">No {ngo?'requests':'orders'} yet. Browse food to get started.</p>)}
 {tab==='me'&&<Profile u={u} act={act} flash={flash}/ >}
 {ask&&<Consent onNo={()=>setAsk(null)} onYes={async()=>{if(await act(async()=>{await db.consent(u);await db.reserve(u,ask.l.id,ask.n)}))flash('Consent saved and food reserved.');setAsk(null)}}/>}</>}
function Profile({u,act,flash}){
 const avatars=['🥑','🍊','🐻','🐼','🐸','🐱','🦋','🌻','🐰','🦊','🐨','🐧','🍓','🌈','⭐','🌿'];
 const [editing,setEditing]=useState(false);
 const [f,setF]=useState({name:u.name||'',phone:u.phone||'',avatar:u.avatar||'🥑'});
 const [busy,setBusy]=useState(false);
 const change=k=>e=>setF({...f,[k]:e.target.value});
 const save=async e=>{
  e.preventDefault();setBusy(true);
  const ok=await act(()=>db.saveProfile(u,f));
  setBusy(false);
  if(ok){setEditing(false);flash('Profile updated successfully.');}
 };
 return <div className="card narrow profile-card">
  <div className="profile-top">
   <div className="profile-avatar">{f.avatar}</div>
   <h2>{u.name}</h2>
   <p className="hint">{u.role==='ngo'?'NGO account':'Customer account'}</p>
  </div>
  {!editing?<div className="profile-details">
   <p><span>Email</span><b>{u.email}</b></p>
   <p><span>Phone</span><b>{u.phone||'Not added'}</b></p>
   <p><span>Account type</span><b>{u.role==='ngo'?'NGO':'Customer'}</b></p>
   <p><span>Consent on file</span><b>{db.hasConsent(u.id)?'Yes':'Not yet'}</b></p>
   <button onClick={()=>setEditing(true)}>Edit profile</button>
  </div>:<form onSubmit={save}>
   <h3>Edit your profile</h3>
   <label className="f">Choose your avatar
    <div className="avatar-grid">
     {avatars.map(a=><button type="button" key={a} className={'avatar-choice '+(f.avatar===a?'selected':'')} onClick={()=>setF({...f,avatar:a})}>{a}</button>)}
    </div>
   </label>
   <F l="Full name"><input required maxLength="100" value={f.name} onChange={change('name')}/></F>
   <F l="Phone number"><input type="tel" maxLength="30" value={f.phone} onChange={change('phone')}/></F>
   <F l="Email address"><input value={u.email} disabled/></F>
   <button disabled={busy}>{busy?'Saving...':'Save changes'}</button>
   <button type="button" className="ghost" onClick={()=>setEditing(false)}>Cancel</button>
  </form>}
 </div>;
}

function Item({l,ngo,go,rep}){const [n,setN]=useState(1);return <Card l={l}><div className="row"><input aria-label="Quantity" type="number" min="1" max={l.qty} value={n} onChange={e=>setN(e.target.value)} style={{width:70}}/><button onClick={()=>go(l,n)}>{ngo?'Request':'Reserve'}</button><button className="ghost" onClick={rep}>Report</button></div></Card>}
function Consent({onYes,onNo}){const [c,setC]=useState(CONSENTS.map(()=>false));return <div className="modal" role="dialog" aria-modal="true" aria-label="Consent"><div className="card"><h2>Before your first reservation</h2><Disc/>
 {CONSENTS.map((x,i)=><label className="chk" key={i}><input type="checkbox" checked={c[i]} onChange={()=>setC(c.map((v,j)=>j===i?!v:v))}/> {x}</label>)}
 <p className="hint">Read the full <a href="#t">Terms</a> and <a href="#p">Privacy Policy</a> (add your real pages). Your consent is stored with your account, a timestamp and the policy version.</p>
 <button disabled={!c.every(Boolean)} onClick={onYes}>I agree and continue</button> <button className="ghost" onClick={onNo}>Cancel</button></div></div>}

function Biz({u,act,flash}){
 const [tab,setTab]=useState('l'),[f,setF]=useState({category:'Meals'});const s=k=>e=>setF({...f,[k]:e.target.value});
 if(u.status!=='approved')return <div className="card narrow"><h2>Application {u.status}</h2><p>{u.status==='pending'?'An admin is reviewing your application. You can publish food once it is approved.':u.status==='rejected'?'Your application was rejected.':'Your account is suspended.'}</p>{u.feedback&&<p><b>Admin feedback:</b> {u.feedback}</p>}</div>;
 const d=db.load(),ls=d.listings.filter(l=>l.bizId===u.id),rs=d.reservations.filter(r=>r.bizId===u.id).reverse();
 const pub=async e=>{e.preventDefault();const T=k=>f[k]?new Date(f[k]).getTime():0;if(await act(()=>db.saveListing(u,{...f,category:u.role==='produce'?'Produce':f.category,made:T('made'),harvestDate:T('harvestDate'),deadline:T('deadline'),useBy:T('useBy')||null})))flash('Listing published.')};
 const img=e=>{const x=e.target.files[0];if(!x)return;if(x.size>2e5){flash('Image must be under 200 KB in demo mode.',true);return}const r=new FileReader();r.onload=()=>setF(prev=>({...prev,img:r.result}));r.onerror=()=>flash('Could not read this image. Please try another.',true);r.readAsDataURL(x)};
 return <><div className="tabs"><button className={tab==='l'?'on':''} onClick={()=>setTab('l')}>Listings</button><button className={tab==='r'?'on':''} onClick={()=>setTab('r')}>Reservations ({rs.filter(r=>r.status==='pending').length} new)</button></div>
 {tab==='l'&&<><form className="card narrow" onSubmit={pub}><h3>New surplus listing</h3><F l="Food name"><input required onChange={s('name')}/></F><F l="Description"><textarea required onChange={s('desc')}/></F>{u.role==='produce'?<F l="Category"><input value="Produce" readOnly/></F>:<F l="Category"><select value={f.category} onChange={s('category')}>{CATS.map(c=><option key={c}>{c}</option>)}</select></F>}
  <F l={u.role==='produce'?'Quantity (whole kg)':'Quantity'}><input required type="number" min="1" step="1" onChange={s('qty')}/></F><F l="Original price (₹)"><input required type="number" min="0" step="0.01" onChange={s('orig')}/></F><F l="Discounted price (₹)"><input required type="number" min="0" step="0.01" onChange={s('price')}/></F>
  {u.role==='produce'?<F l="Harvest date"><input required type="date" onChange={s('harvestDate')}/></F>:<><F l="Prepared at"><input required type="datetime-local" onChange={s('made')}/></F><F l="Use-by (optional)"><input type="datetime-local" onChange={s('useBy')}/></F><F l="Allergens (required)"><input required placeholder="e.g. Gluten, milk, or None" onChange={s('allergens')}/></F></>}
  <F l="Pickup deadline"><input required type="datetime-local" onChange={s('deadline')}/></F><F l="Storage instructions"><input onChange={s('storage')}/></F><F l="Photo (under 200 KB)"><input type="file" accept="image/*" onChange={img}/></F>{f.img&&<img src={f.img} alt="Selected food preview" style={{width:'100%',maxHeight:220,objectFit:'cover',borderRadius:12,marginBottom:16}}/>}<button>Publish listing</button></form>
  {ls.length?ls.map(l=><div className="card row" key={l.id}><div><b>{l.name}</b> · {l.qty} {u.role==='produce'?'kg':'left'} · {l.status}<p className="small">Deadline {fmt(l.deadline)}</p></div><div><button className="ghost" onClick={()=>{const q=+prompt('New available quantity',l.qty);if(q>=0)act(()=>db.setListing(u,l.id,{qty:q}))}}>Edit qty</button><button className="ghost" onClick={()=>act(()=>db.setListing(u,l.id,{status:l.status==='active'?'paused':'active'}))}>{l.status==='active'?'Pause':'Resume'}</button><button className="ghost" onClick={()=>act(()=>db.setListing(u,l.id,'delete'))}>Delete</button></div></div>):<p className="empty">No listings yet. Publish your first surplus item above.</p>}</>}
 {tab==='r'&&(rs.length?rs.map(r=><div className="card row" key={r.id}><div><b>{r.name}</b> × {r.qty} for {r.userName} ({r.kind})<p className="small">{fmt(r.at)}</p></div><div><span className={'st '+r.status}>{r.status}</span>{r.status==='pending'&&<button onClick={()=>act(()=>db.setRes(u,r.id,'confirmed'))}>Confirm</button>}{r.status==='confirmed'&&<button onClick={()=>act(()=>db.setRes(u,r.id,'collected'))}>Mark collected</button>}{['pending','confirmed'].includes(r.status)&&<button className="ghost" onClick={()=>act(()=>db.setRes(u,r.id,'cancelled'))}>Cancel</button>}</div></div>):<p className="empty">No reservations yet.</p>)}</>}

function Admin({u,act}){
 const d=db.load(),[why,setWhy]=useState({});const biz=d.users.filter(x=>['restaurant','bakery','produce'].includes(x.role)),pend=biz.filter(x=>x.status==='pending');
 const stat=[['Users',d.users.length],['Pending applications',pend.length],['Active listings',d.listings.filter(l=>l.status==='active').length],['Reservations / requests',d.reservations.length]];
 return <><div className="grid">{stat.map(([a,b])=><div className="card" key={a}><h3>{b}</h3><p>{a}</p></div>)}</div>
 <h2>Applications awaiting review ({pend.length})</h2>{pend.length?pend.map(x=><div className="card" key={x.id}><b>{x.name}</b> ({x.role}) · {x.email} · {x.phone}<p className="small">Contact: {x.biz.contact} · {x.biz.address} · Type: {x.biz.type} · Licence: {x.biz.licence} · Document: {x.biz.docs} {d.docs.find(z=>z.id===x.id)?<a download={x.biz.docs} href={d.docs.find(z=>z.id===x.id).data}>Download</a>:null}</p>
  <input aria-label="Rejection reason" placeholder="Reason (required to reject)" value={why[x.id]||''} onChange={e=>setWhy({...why,[x.id]:e.target.value})}/><button onClick={()=>act(()=>db.decide(u,x.id,'approved',''))}>Approve</button><button className="ghost" onClick={()=>act(()=>db.decide(u,x.id,'rejected',why[x.id]))}>Reject</button></div>):<p className="empty">No pending applications.</p>}
 <h2>Users</h2>{d.users.filter(x=>x.role!=='admin').map(x=><div className="card row" key={x.id}><div>{x.name} · {x.role} · {x.email}</div><div><span className={'st '+x.status}>{x.status}</span>{x.status==='suspended'?<button className="ghost" onClick={()=>act(()=>db.decide(u,x.id,x.role==='customer'||x.role==='ngo'?'active':'approved',''))}>Reactivate</button>:<button className="ghost" onClick={()=>act(()=>db.decide(u,x.id,'suspended','Suspended by admin'))}>Suspend</button>}</div></div>)}
 <h2>Listings</h2>{d.listings.map(l=><div className="card row" key={l.id}><div>{l.name} · {l.bizName} · {l.qty} left</div><button className="ghost" onClick={()=>act(()=>db.setListing(u,l.id,'delete'))}>Remove</button></div>)}
 <h2>Reservations and NGO requests</h2>{d.reservations.length?d.reservations.map(r=><div className="card" key={r.id}>{r.kind}: {r.name} × {r.qty} · {r.userName} → {r.bizName} · <span className={'st '+r.status}>{r.status}</span></div>):<p className="empty">None yet.</p>}
 <h2>Reports ({d.reports.filter(r=>r.status==='open').length} open)</h2>{d.reports.length?d.reports.map(r=><div className="card row" key={r.id}><div>Listing {r.listingId}: {r.reason}<p className="small">{r.status}</p></div>{r.status==='open'&&<button className="ghost" onClick={()=>act(()=>db.resolveReport(u,r.id))}>Mark resolved</button>}</div>):<p className="empty">No reports.</p>}</>}
