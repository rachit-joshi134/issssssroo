import { getStore } from "@netlify/blobs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";

const store = () => getStore({ name: "nextlayer-isro-records", consistency: "strong" });
const DEMO_DRIVERS = [
 {driverId:"ISRO-UGT-2026-017",fullName:"Rachit Joshi",nickname:"FEARLESS BEAST",nationality:"India",category:"Under 19",discipline:"Go-Karting / Formula Trainee",team:"Independent",status:"approved",publicBio:"Demo profile. Public details require authorized confirmation.",points:268,star:true},
 {driverId:"ISRO-UGT-2026-004",fullName:"Elena Castillo",nickname:"",nationality:"",category:"Under 19",discipline:"Go-Karting",team:"",status:"approved",publicBio:"Public profile details pending confirmation.",points:0,star:true},
 {driverId:"ISRO-UGT-2026-021",fullName:"Gargi Sharma",nickname:"",nationality:"India",category:"Under 19",discipline:"Go-Karting",team:"",status:"approved",publicBio:"Public profile details pending confirmation.",points:0,star:true},
 {driverId:"ISRO-UGT-2026-022",fullName:"Rahul Nair",nickname:"",nationality:"India",category:"Under 19",discipline:"Go-Karting",team:"",status:"approved",publicBio:"Public profile details pending confirmation.",points:0,star:true}
];
const DEMO_CERTS=[{certificateId:"ISRO-RCR-2026-017",driverId:"ISRO-UGT-2026-017",title:"Racing Character Record",issueDate:"2026-03-01",status:"valid",notes:"Illustrative demo record."}];
export async function getRecords(){
 const s=store();
 let drivers=await s.get("drivers",{type:"json"}), certificates=await s.get("certificates",{type:"json"}), registrations=await s.get("registrations",{type:"json"}), audit=await s.get("audit",{type:"json"});
 if(!Array.isArray(drivers)){drivers=DEMO_DRIVERS;await s.setJSON("drivers",drivers);}
 if(!Array.isArray(certificates)){certificates=DEMO_CERTS;await s.setJSON("certificates",certificates);}
 if(!Array.isArray(registrations)){registrations=[];await s.setJSON("registrations",registrations);}
 if(!Array.isArray(audit)){audit=[];await s.setJSON("audit",audit);}
 return {s,drivers,certificates,registrations,audit};
}
export const json=(statusCode,body)=>({statusCode,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"},body:JSON.stringify(body)});
export const bodyOf=event=>{try{return JSON.parse(event.body||"{}")}catch{return null}};
export const safeDriver=d=>({driverId:d.driverId,fullName:d.fullName,nickname:d.nickname||"",nationality:d.nationality||"",category:d.category,discipline:d.discipline||"",team:d.team||"",status:d.status,publicBio:d.publicBio||"",points:Number(d.points)||0,star:!!d.star});
export function authorized(event){
 const header=event.headers?.authorization||event.headers?.Authorization||"";
 const token=header.startsWith("Bearer ")?header.slice(7):"";
 try{return jwt.verify(token,process.env.JWT_SECRET,{algorithms:["HS256"],issuer:"nextlayer-isro"})}catch{return null}
}
export async function audit(records,email,action,type,ref){
 records.audit.unshift({email,action,type,ref,at:new Date().toISOString()});
 records.audit=records.audit.slice(0,500);
 await records.s.setJSON("audit",records.audit);
}
export async function checkAdmin(email,password){
 const expected=String(process.env.ADMIN_EMAIL||"").toLowerCase();
 const hash=String(process.env.ADMIN_PASSWORD_HASH||"");
 if(!expected||!hash||email.toLowerCase()!==expected)return false;
 return bcrypt.compare(password,hash);
}
export function newId(prefix){return `${prefix}-${new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;}
