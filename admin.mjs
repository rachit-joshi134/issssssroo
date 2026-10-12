import jwt from "jsonwebtoken";
import {getRecords,json,safeDriver,bodyOf,authorized,audit,checkAdmin,newId} from "./_store.mjs";
export default async (event)=>{
 const path=event.path||"",method=event.httpMethod;
 if(method==="POST"&&path.endsWith("/login")){
  const b=bodyOf(event);if(!b||typeof b.email!=="string"||typeof b.password!=="string")return json(400,{error:"Email and password required."});
  if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32)return json(500,{error:"JWT_SECRET must be configured with 32+ characters."});
  if(!await checkAdmin(b.email,b.password))return json(401,{error:"Incorrect admin credentials or admin environment variables not configured."});
  const token=jwt.sign({email:b.email.toLowerCase()},process.env.JWT_SECRET,{algorithm:"HS256",expiresIn:"8h",issuer:"nextlayer-isro"});
  return json(200,{token,admin:{email:b.email.toLowerCase()}});
 }
 const user=authorized(event);if(!user)return json(401,{error:"Sign in required or session expired."});
 const r=await getRecords();
 if(method==="GET"&&path.endsWith("/dashboard"))return json(200,{drivers:counts(r.drivers,"status"),certificates:counts(r.certificates,"status"),registrations:counts(r.registrations,"status"),recent:r.audit.slice(0,20)});
 if(method==="GET"&&path.endsWith("/drivers"))return json(200,{drivers:r.drivers.map(safeDriver)});
 if(method==="POST"&&path.endsWith("/drivers")){
  const b=bodyOf(event);if(!b||!/^ISRO-[A-Z0-9-]{4,50}$/i.test(String(b.driverId||""))||typeof b.fullName!=="string"||b.fullName.trim().length<2||b.fullName.length>100||typeof b.category!=="string"||!b.category)return json(400,{error:"Driver ID, name and category are required."});
  if(r.drivers.some(d=>d.driverId===b.driverId.toUpperCase()))return json(409,{error:"Driver ID already exists."});
  const d={driverId:b.driverId.toUpperCase(),fullName:b.fullName.trim(),nickname:String(b.nickname||"").slice(0,80),nationality:String(b.nationality||"").slice(0,80),category:b.category.slice(0,60),discipline:String(b.discipline||"").slice(0,100),team:String(b.team||"").slice(0,100),status:["pending","approved","rejected","suspended"].includes(b.status)?b.status:"pending",publicBio:String(b.publicBio||"").slice(0,1000),points:Math.max(0,Math.min(1000000,Number(b.points)||0)),star:!!b.star,createdAt:new Date().toISOString()};
  r.drivers.unshift(d);await r.s.setJSON("drivers",r.drivers);await audit(r,user.email,"create","driver",d.driverId);return json(201,{driver:safeDriver(d)});
 }
 const driverMatch=path.match(/\/drivers\/([^/]+)$/);
 if(driverMatch){
  const id=decodeURIComponent(driverMatch[1]).toUpperCase(),index=r.drivers.findIndex(d=>d.driverId===id);if(index<0)return json(404,{error:"Driver not found."});
  if(method==="PATCH"){
   const b=bodyOf(event)||{},d=r.drivers[index];
   for(const k of ["fullName","nickname","nationality","category","discipline","team","publicBio"])if(typeof b[k]==="string")d[k]=b[k].slice(0,k==="publicBio"?1000:160);
   if(["pending","approved","rejected","suspended"].includes(b.status))d.status=b.status;
   if(Number.isInteger(b.points)&&b.points>=0&&b.points<=1000000)d.points=b.points;
   if(typeof b.star==="boolean")d.star=b.star;
   r.drivers[index]=d;await r.s.setJSON("drivers",r.drivers);await audit(r,user.email,"update","driver",id);return json(200,{driver:safeDriver(d)});
  }
  if(method==="DELETE"){r.drivers.splice(index,1);await r.s.setJSON("drivers",r.drivers);await audit(r,user.email,"delete","driver",id);return json(200,{ok:true});}
 }
 if(method==="GET"&&path.endsWith("/certificates"))return json(200,{certificates:r.certificates});
 if(method==="POST"&&path.endsWith("/certificates")){
  const b=bodyOf(event);if(!b||!/^ISRO-[A-Z0-9-]{4,60}$/i.test(String(b.certificateId||""))||typeof b.title!=="string"||b.title.trim().length<2)return json(400,{error:"Certificate ID and title required."});
  const id=b.certificateId.toUpperCase();if(r.certificates.some(c=>c.certificateId===id))return json(409,{error:"Certificate reference already exists."});
  if(b.driverId&&!r.drivers.some(d=>d.driverId===b.driverId.toUpperCase()))return json(400,{error:"Linked driver not found."});
  const c={certificateId:id,driverId:b.driverId?b.driverId.toUpperCase():"",title:b.title.trim().slice(0,160),issueDate:String(b.issueDate||"").slice(0,30),status:["pending","valid","revoked","expired"].includes(b.status)?b.status:"pending",notes:String(b.notes||"").slice(0,1000)};
  r.certificates.unshift(c);await r.s.setJSON("certificates",r.certificates);await audit(r,user.email,"create","certificate",id);return json(201,{certificate:c});
 }
 const certMatch=path.match(/\/certificates\/([^/]+)$/);
 if(certMatch){
  const id=decodeURIComponent(certMatch[1]).toUpperCase(),index=r.certificates.findIndex(x=>x.certificateId===id);if(index<0)return json(404,{error:"Certificate not found."});
  if(method==="PATCH"){
   const c=r.certificates[index],b=bodyOf(event)||{};if(typeof b.title==="string"&&b.title.trim())c.title=b.title.trim().slice(0,160);if(typeof b.issueDate==="string")c.issueDate=b.issueDate.slice(0,30);if(typeof b.notes==="string")c.notes=b.notes.slice(0,1000);if(["pending","valid","revoked","expired"].includes(b.status))c.status=b.status;
   await r.s.setJSON("certificates",r.certificates);await audit(r,user.email,"update","certificate",id);return json(200,{certificate:c});
  }
  if(method==="DELETE"){r.certificates.splice(index,1);await r.s.setJSON("certificates",r.certificates);await audit(r,user.email,"delete","certificate",id);return json(200,{ok:true});}
 }
 if(method==="GET"&&path.endsWith("/registrations"))return json(200,{registrations:r.registrations});
 const regMatch=path.match(/\/registrations\/([^/]+)$/);
 if(regMatch&&method==="PATCH"){
  const reg=r.registrations.find(x=>String(x.id)===regMatch[1]);if(!reg)return json(404,{error:"Registration not found."});
  const status=bodyOf(event)?.status;if(!["pending","approved","rejected"].includes(status))return json(400,{error:"Invalid status."});
  reg.status=status;await r.s.setJSON("registrations",r.registrations);await audit(r,user.email,"update","registration",reg.registrationRef);return json(200,{ok:true});
 }
 if(method==="GET"&&path.endsWith("/audit"))return json(200,{entries:r.audit.slice(0,200)});
 return json(404,{error:"Admin API route not found."});
};
function counts(items,key){const out={};for(const x of items)out[x[key]]=(out[x[key]]||0)+1;return out;}
