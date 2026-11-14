import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { addDoc, collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { auth, db, firebaseConfigured, requestOtp } from "./firebase";
import "./style.css";

const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
function App(){
 const [user,setUser]=useState(null),[profile,setProfile]=useState(null),[role,setRole]=useState("customer");
 const [phone,setPhone]=useState("+91"),[confirm,setConfirm]=useState(null),[otp,setOtp]=useState("");
 const [items,setItems]=useState([]),[mine,setMine]=useState([]),[pos,setPos]=useState(null),[radius,setRadius]=useState(10);
 const [msg,setMsg]=useState(""),[tab,setTab]=useState("discover"),[mapReady,setMapReady]=useState(false);
 const [form,setForm]=useState({business:"",kind:"Hotel / Restaurant",name:"",category:"Meals",quantity:1,persons:1,prepared:"",expiry:"",deadline:"",quality:"Freshly prepared",offer:"free",price:0,location:"",lat:"",lng:"",contact:"",allergens:"",storage:""});
 const [requestQty,setRequestQty]=useState({});
 const [verificationOpen,setVerificationOpen]=useState(false);
 const [declarationAccepted,setDeclarationAccepted]=useState(false);
 const [verificationLocation,setVerificationLocation]=useState(null);
 const [verificationType,setVerificationType]=useState("");
 const [verificationData,setVerificationData]=useState({
  organisation:"",responsibleName:"",contact:"",address:"",
  fssai:"",foodSource:"",eventDate:"",eventVenue:"",
  preparationDetails:"",storageDetails:"",declarationName:"",
 });
 useEffect(()=>{if(!auth)return;return onAuthStateChanged(auth,async u=>{setUser(u);if(u){const s=await getDoc(doc(db,"users",u.uid));if(s.exists()){setProfile(s.data());setRole(s.data().role||"customer")}}});},[]);
 useEffect(()=>{if(!db)return;return onSnapshot(query(collection(db,"foodListings"),where("status","==","available")),s=>setItems(s.docs.map(d=>({id:d.id,...d.data()}))));},[]);
 useEffect(()=>{if(!user||!db)return;return onSnapshot(collection(db,"users",user.uid,"requests"),s=>setMine(s.docs.map(d=>({id:d.id,...d.data()}))));},[user]);
 useEffect(()=>{if(!mapsKey)return;const s=document.createElement("script");s.src=`https://maps.googleapis.com/maps/api/js?key=${mapsKey}`;s.async=true;s.onload=()=>setMapReady(true);document.head.appendChild(s);return()=>{document.head.removeChild(s)}},[]);
 const update=(k,v)=>setForm(p=>({...p,[k]:v}));
 async function verifyOtp(){
  try{
    const result=await confirm.confirm(otp);
    const u=result.user;
    const userRef=doc(db,"users",u.uid);
    const existing=await getDoc(userRef);
    const savedProfile=existing.exists()?existing.data():{
      role:"customer",
      verificationStatus:"phone_verified"
    };
    await setDoc(userRef,{
      phone:u.phoneNumber,
      ...(!existing.exists()?savedProfile:{}),
      updatedAt:serverTimestamp()
    },{merge:true});
    setProfile({...savedProfile,phone:u.phoneNumber});
    setRole(savedProfile.role||"customer");
    setMsg("Phone verified successfully.");
  }catch(e){
    setMsg(e.message);
  }
 }
 async function login(){try{const c=await requestOtp(phone,"recaptcha");setConfirm(c);setMsg("OTP sent. Enter the code received on your phone.");}catch(e){setMsg(e.message)}}
 async function chooseRole(r){
  if(!user)return;
  setRole(r);

  if(r==="customer"){
    setVerificationOpen(false);
    setMsg("Customer role selected.");
    return;
  }

  if(r==="provider" || r==="event"){
    setVerificationType(r);
    setVerificationOpen(true);
    setMsg("Complete the provider verification form.");
    return;
  }

  if(r==="ngo"){
    setMsg("NGO verification will be configured separately.");
  }
 }
 function updateVerification(k,v){
  setVerificationData(p=>({...p,[k]:v}));
 }

 function captureVerificationGps(){
   if(!navigator.geolocation){
     setMsg("GPS is not supported by this browser.");
     return;
   }
   navigator.geolocation.getCurrentPosition(
     p=>{
       setVerificationLocation({
         lat:p.coords.latitude,
         lng:p.coords.longitude
       });
       setMsg("Business / event GPS coordinates captured.");
     },
     e=>setMsg("Location unavailable: "+e.message),
     {enableHighAccuracy:true,timeout:15000}
   );
 }

 async function submitVerification(e){
  e.preventDefault();
  if(!user){
    setMsg("Please sign in first.");
    return;
  }
  if(!declarationAccepted){
    setMsg("Please accept the food safety declaration.");
    return;
  }
  if(!verificationData.declarationName.trim()){
    setMsg("Enter the responsible person's name and signed document link.");
    return;
  }
  try{
    await addDoc(collection(db,"verificationRequests"),{
      uid:user.uid,
      role:verificationType,
      details:verificationData,
      location:verificationLocation,
      declarationAccepted:true,
      declarationAcceptedAt:serverTimestamp(),
      status:"pending",
      createdAt:serverTimestamp()
    });
    setVerificationOpen(false);
    setDeclarationAccepted(false);
    setMsg("Verification request submitted. Admin review is pending.");
  }catch(e){
    setMsg("Could not submit verification request: "+e.message);
  }
 }

 function gps(){if(!navigator.geolocation){setMsg("GPS is not supported by this browser.");return}navigator.geolocation.getCurrentPosition(p=>{setPos({lat:p.coords.latitude,lng:p.coords.longitude});setMsg("Current location detected.")},e=>setMsg("Location unavailable: "+e.message),{enableHighAccuracy:true,timeout:15000})}
 const distance=(a,b)=>{const R=6371,rad=x=>x*Math.PI/180,d1=(b.lat-a.lat),d2=(b.lng-a.lng),h=Math.sin(rad(d1)/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(rad(d2)/2)**2;return 2*R*Math.asin(Math.sqrt(h))};
 const nearby=useMemo(()=>items.filter(f=>f.expiry?.toDate?f.expiry.toDate().getTime()>Date.now():new Date(f.expiry).getTime()>Date.now()).map(f=>({...f,distance:pos&&f.lat&&f.lng?distance(pos,{lat:f.lat,lng:f.lng}):null})).filter(f=>!pos||f.distance===null||f.distance<=radius).sort((a,b)=>(a.distance??9999)-(b.distance??9999)),[items,pos,radius]);
 async function publish(e){e.preventDefault();if(!user){setMsg("Please sign in first.");return}if(!["provider","event"].includes(role)||profile?.verificationStatus!=="approved"){setMsg("Only admin-approved food providers/event organisers can publish listings.");return}
 if(new Date(form.expiry)<=new Date()||new Date(form.deadline)<=new Date()||new Date(form.expiry)<new Date(form.deadline)){setMsg("Check expiry and collection deadline. Both must be in the future.");return}
 try{await addDoc(collection(db,"foodListings"),{...form,quantity:Number(form.quantity),persons:Number(form.persons),price:Number(form.price),lat:Number(form.lat),lng:Number(form.lng),providerUid:user.uid,status:"available",createdAt:serverTimestamp()});setMsg("Food listing published.");setTab("discover")}catch(e){setMsg(e.message)}}
 async function reserve(f){if(!user){setMsg("Sign in to request collection.");return}if(role==="provider"||role==="event"){setMsg("Switch to Customer or NGO to request food.");return}const n=Number(requestQty[f.id]||1);if(!Number.isInteger(n)||n<1||n>f.quantity){setMsg("Enter a valid quantity.");return}try{await addDoc(collection(db,"users",user.uid,"requests"),{listingId:f.id,providerUid:f.providerUid,foodName:f.name,quantity:n,status:"requested",createdAt:serverTimestamp()});setMsg("Collection request sent. Provider confirmation is pending.")}catch(e){setMsg(e.message)}}
 function mapLink(f){if(!f.lat||!f.lng)return "#";return `https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lng}&travelmode=driving`}
 return <div className="app"><header><div><h1>🥗 FOODLINK</h1><p>Rescue food. Share hope.</p></div><span className="tag">Community food recovery</span></header>
 {!firebaseConfigured&&<div className="notice warn">Firebase is not configured yet. Add your project credentials to <code>web/.env</code> to enable real OTP and database access.</div>}
 {!user?<section className="card"><h2>Sign in with mobile OTP</h2><p>Use your phone number to create a verified account.</p><label>Mobile number</label><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+919876543210"/>{!confirm?<><div id="recaptcha" className="captcha"></div><button onClick={login}>Send OTP</button></>:<><label>OTP code</label><input value={otp} onChange={e=>setOtp(e.target.value)} placeholder="6-digit code"/><button onClick={verifyOtp}>Verify OTP</button></>}</section>:<section className="card flexrow"><div><b>{user.phoneNumber}</b><p className="sub">{profile?.verificationStatus||"Phone verified"}</p></div><button className="light" onClick={()=>signOut(auth)}>Sign out</button></section>}
 {user&&<section className="card"><h3>Choose your account role</h3><div className="roles">{["customer","provider","event","ngo"].map(r=><button className={role===r?"selected":""} onClick={()=>chooseRole(r)} key={r}>{({customer:"Customer",provider:"Hotel / Bakery",event:"Event organiser",ngo:"NGO"})[r]}</button>)}</div><p className="sub">Provider and NGO roles require administrator verification. Current status: <b>{profile?.verificationStatus||"Phone verified"}</b></p></section>}
 {user&&verificationOpen&&<section className="card">
 <h2>{verificationType==="event"?"Event organiser verification":"Food provider verification"}</h2>
 <p className="sub">Complete these details for administrator review.</p>
 <form onSubmit={submitVerification} className="formgrid">
  <label>{verificationType==="event"?"Organisation name":"Business name"}
   <input required value={verificationData.organisation} onChange={e=>updateVerification("organisation",e.target.value)}/>
  </label>
  <label>Owner / responsible person's full name
   <input required value={verificationData.responsibleName} onChange={e=>updateVerification("responsibleName",e.target.value)}/>
  </label>
  <label>Contact number
   <input required type="tel" value={verificationData.contact} onChange={e=>updateVerification("contact",e.target.value)}/>
  </label>
  {verificationType==="provider"?
   <label>Business address
    <textarea required value={verificationData.address} onChange={e=>updateVerification("address",e.target.value)}/>
   </label>:
   <>
    <label>Event date
     <input required type="date" value={verificationData.eventDate} onChange={e=>updateVerification("eventDate",e.target.value)}/>
    </label>
    <label>Event venue and address
     <textarea required value={verificationData.eventVenue} onChange={e=>updateVerification("eventVenue",e.target.value)}/>
    </label>
   </>
  }
  <button type="button" className="light" onClick={captureVerificationGps}>
   Use GPS to capture business / event location
  </button>
  {verificationLocation&&<p className="sub">GPS coordinates captured successfully.</p>}
  <label>Applicable FSSAI registration / licence details
   <input value={verificationData.fssai} onChange={e=>updateVerification("fssai",e.target.value)} placeholder="Enter number, or explain if not applicable"/>
  </label>
  <label>Where is the food prepared? Mention the kitchen, business or caterer.
   <textarea required value={verificationData.foodSource} onChange={e=>updateVerification("foodSource",e.target.value)}/>
  </label>
  <label>Food preparation and handling details
   <textarea required value={verificationData.preparationDetails} onChange={e=>updateVerification("preparationDetails",e.target.value)}/>
  </label>
  <label>Food storage arrangements
   <textarea required value={verificationData.storageDetails} onChange={e=>updateVerification("storageDetails",e.target.value)}/>
  </label>
  <div>
   <h3>Food Safety Declaration</h3>
   <p>I declare that the food supplied through FOODLINK will be handled, prepared and stored hygienically. I will provide accurate information about its preparation time, safe consumption deadline, storage conditions and allergens. I accept responsibility for complying with applicable food safety requirements and cooperating with safety-related complaints.</p>
   <p className="sub">This declaration does not replace any legally required FSSAI registration or licence.</p>
  </div>
  <label>Full name of person accepting this declaration
   <input required value={verificationData.declarationName} onChange={e=>updateVerification("declarationName",e.target.value)}/>
  </label>
  
  <label>
   <input type="checkbox" checked={declarationAccepted} onChange={e=>setDeclarationAccepted(e.target.checked)}/>
   I confirm that the information is accurate and accept this declaration.
  </label>
  <button type="submit">Submit for verification</button>
  <button type="button" className="light" onClick={()=>setVerificationOpen(false)}>Cancel</button>
 </form>
</section>}
 <nav>{[["discover","Nearby food"],["publish","Add food"],["map","Map"],["requests","Requests"]].map(([id,label])=><button className={tab===id?"selected":""} onClick={()=>setTab(id)} key={id}>{label}</button>)}</nav>
 {tab==="discover"&&<section><div className="flexrow"><h2>Food near you</h2><button className="light" onClick={gps}>◎ Use my GPS</button></div><div className="filters"><label>Search radius<select value={radius} onChange={e=>setRadius(Number(e.target.value))}>{[2,5,10,20,50].map(x=><option value={x}>{x} km</option>)}</select></label><span className="sub">{pos?"GPS location active":"Enable GPS for distance sorting"}</span></div>{nearby.map(f=><article className="card" key={f.id}><div className="flexrow"><h3>{f.name}</h3><span className="tag">{f.offer==="free"?"Free donation":`₹${f.price}`}</span></div><p>{f.business} · {f.category}</p><p>🍱 {f.quantity} portions · 👥 {f.persons} people</p><p>Prepared: {String(f.prepared||"").replace("T"," ")} · Safe until: {String(f.expiry||"").replace("T"," ")}</p><p>Collect by: {String(f.deadline||"").replace("T"," ")}</p><p>📍 {f.location} {f.distance!==null?`· ${f.distance.toFixed(1)} km away`:""}</p><p className="sub">Storage: {f.storage||"Not specified"} · Allergens: {f.allergens||"Not specified"}</p><div className="flexrow"><input type="number" min="1" max={f.quantity} value={requestQty[f.id]||1} onChange={e=>setRequestQty(p=>({...p,[f.id]:e.target.value}))}/><button onClick={()=>reserve(f)}>Request collection</button><a className="button light" href={mapLink(f)} target="_blank" rel="noreferrer">Directions</a></div></article>)}{!nearby.length&&<div className="card">No active listings in this search area yet.</div>}</section>}
 {tab==="publish"&&<section className="card"><h2>Register surplus food</h2><p className="sub">Available only to approved providers and event organisers.</p><form onSubmit={publish} className="formgrid">{Object.entries({business:"Business / event name",name:"Food name",quantity:"Quantity (portions)",persons:"People served",prepared:"Preparation time",expiry:"Safe consumption deadline",deadline:"Collection deadline",location:"Full address",lat:"Location latitude",lng:"Location longitude",contact:"Contact number",storage:"Storage / handling details",allergens:"Allergens"}).map(([k,label])=><label>{label}<input required type={["quantity","persons"].includes(k)?"number":["prepared","expiry","deadline"].includes(k)?"datetime-local":"text"} value={form[k]} onChange={e=>update(k,e.target.value)}/></label>)}<label>Provider type<select value={form.kind} onChange={e=>update("kind",e.target.value)}><option>Hotel / Restaurant</option><option>Bakery</option><option>Event organiser</option><option>Catering service</option></select></label><label>Category<select value={form.category} onChange={e=>update("category",e.target.value)}><option>Meals</option><option>Bakery</option><option>Snacks</option><option>Event surplus</option></select></label><label>Offer type<select value={form.offer} onChange={e=>update("offer",e.target.value)}><option value="free">Free donation</option><option value="paid">Discounted sale</option></select></label><label>Price per portion<input type="number" min="0" value={form.price} onChange={e=>update("price",e.target.value)}/></label><label>Food condition<select value={form.quality} onChange={e=>update("quality",e.target.value)}><option>Freshly prepared</option><option>Properly stored</option><option>Packaged / Sealed</option></select></label><button type="button" className="light" onClick={()=>{if(!navigator.geolocation)return setMsg("GPS unavailable");navigator.geolocation.getCurrentPosition(p=>{update("lat",p.coords.latitude);update("lng",p.coords.longitude);setMsg("Coordinates filled from GPS.")},e=>setMsg(e.message),{enableHighAccuracy:true})}}>Fill coordinates from GPS</button><button type="submit">Publish food listing</button></form></section>}
 {tab==="map"&&<section className="card"><h2>Nearby food map</h2><p className="sub">Map view uses your current GPS and listing coordinates.</p><button onClick={gps}>Get my location</button>{mapReady&&pos?<div id="gmap" className="map"></div>:<div className="mapplaceholder">Configure Maps API key and enable GPS to display the interactive map.</div>}{mapsKey&&mapReady&&pos&&<MapView pos={pos} items={nearby}/>}</section>}
 {tab==="requests"&&<section className="card"><h2>My collection requests</h2>{mine.map(x=><p className="request">{x.foodName} · {x.quantity} portions · {x.status}</p>)}{!mine.length&&<p className="sub">No collection requests yet.</p>}</section>}
 {msg&&<div className="notice" role="status">{msg}</div>}
 <footer>FOODLINK · Student project starter · Verify food quality and safe handling before collection.</footer></div>
}
function MapView({pos,items}){useEffect(()=>{const el=document.getElementById("gmap");if(!el||!window.google)return;const map=new google.maps.Map(el,{center:pos,zoom:13});new google.maps.Marker({position:pos,map,title:"Your location",label:"You"});items.forEach(f=>{if(f.lat&&f.lng)new google.maps.Marker({position:{lat:Number(f.lat),lng:Number(f.lng)},map,title:f.name})})},[pos,items]);return null}
createRoot(document.getElementById("root")).render(<App/>);
