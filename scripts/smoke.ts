const base=process.env.RALLY_BASE_URL??'http://localhost:3000';
for(const path of ['/api/health','/api/state','/','/overlay']){const response=await fetch(base+path);if(!response.ok)throw new Error(`${path}: ${response.status}`);console.log(`${path}: ${response.status}`);}
const denied=await fetch(base+'/api/control',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({action:'start'})});
if(denied.status!==401)throw new Error(`Unauthenticated control expected 401, got ${denied.status}`);console.log('Unauthenticated controls: 401');
export {};
