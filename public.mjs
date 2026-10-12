import {getRecords,json,safeDriver,bodyOf,newId} from "./_store.mjs";
export default async (event)=>{
 const path=event.path||"";
 const method=event.httpMethod;
 const records=await getRecords();
 if(method==="GET"&&path.endsWith("/stats"))return json(200,{drivers:records.drivers.filter(d=>d.status==="approved").length,certificates:records.certificates.filter(c=>c.status==="valid").length,categories:new Set(records.drivers.filter(d=>d.status==="approved").map(d=>d.category)).size});
 if(method==="GET"&&path.endsWith("/drivers")){
  const q=String(event.queryStringParameters?.q||"").toLowerCase().slice(0,80),cat=String(event.queryStringParameters?.category||"");
  const drivers=records.drivers.filter(d=>d.status==="approved"&&(!cat||d.category===cat)&&(!q||`${d.fullName} ${d.driverId} ${d.nickname}`.toLowerCase().includes(q))).sort((a,b)=>(b.points||0)-(a.points||0)).map(safeDriver);
  return json(200,{drivers});
 }
 if(method==="GET"&&path.includes("/verify/")){
  const ref=decodeURIComponent(path.split("/verify/").pop()||"").toUpperCase();
  if(!/^[A-Z0-9-]{4,80}$/.test(ref))return json(400,{found:false,error:"Invalid reference format."});
  const d=records.drivers.find(x=>x.driverId===ref&&x.status==="approved");
  if(d)return json(200,{found:true,recordType:"driver",status:d.status,driver:safeDriver(d),demo:true,message:"Demo database record. Confirm details with the authorized issuer."});
  const c=records.certificates.find(x=>x.certificateId===ref);
  if(c)return json(200,{found:true,recordType:"certificate",status:c.status,certificate:{certificateId:c.certificateId,driverId:c.driverId,title:c.title,issueDate:c.issueDate,status:c.status},driverName:records.drivers.find(d=>d.driverId===c.driverId)?.fullName||null,demo:true,message:"Demo database record. Confirm details with the authorized issuer."});
  return json(404,{found:false,error:"No matching public record found.",message:"No match does not prove a real-world record is fraudulent."});
 }
 if(method==="POST"&&path.endsWith("/register")){
  const b=bodyOf(event);
  if(!b||typeof b.fullName!=="string"||b.fullName.trim().length<2||b.fullName.length>100||typeof b.email!=="string"||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)||b.email.length>254||typeof b.category!=="string"||!b.category||b.category.length>60||b.consent!==true)return json(400,{error:"Please complete required fields and consent."});
  const registrationRef=newId("ISRO-REG");
  records.registrations.unshift({id:Date.now(),registrationRef,fullName:b.fullName.trim(),email:b.email.toLowerCase(),nationality:String(b.nationality||"").slice(0,80),category:b.category,discipline:String(b.discipline||"").slice(0,100),team:String(b.team||"").slice(0,100),guardianConsent:b.guardianConsent===true,consent:true,status:"pending",createdAt:new Date().toISOString()});
  await records.s.setJSON("registrations",records.registrations);
  return json(201,{ok:true,registrationRef,message:"Registration received for review. This is not acceptance or a racing license."});
 }
 return json(404,{error:"API route not found."});
};