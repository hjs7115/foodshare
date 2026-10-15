import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
class Storage { data=new Map();getItem(k){return this.data.get(k)??null;}setItem(k,v){this.data.set(k,String(v));}removeItem(k){this.data.delete(k);}clear(){this.data.clear();} }
globalThis.localStorage=new Storage();globalThis.sessionStorage=new Storage();globalThis.window=new EventTarget();
const { saveAuthSession,getAuthToken,getRefreshToken,clearAuthSession,authenticatedFetch,classifyExpiry }=await import('./runtime.mjs');
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
beforeEach(()=>{clearAuthSession(false);localStorage.clear();sessionStorage.clear();});
test('persistent login rotates tokens and retries with replacement header',async()=>{
 saveAuthSession('old',{},true,'refresh-old');let calls=0;
 globalThis.fetch=async(url,options)=>{calls++;if(url.endsWith('/refresh'))return json({data:{accessToken:'new',refreshToken:'refresh-new'}});return options.headers.get('Authorization')==='Bearer new'?json({ok:true}):json({},401);};
 assert.equal((await authenticatedFetch('/private',{},'')).status,200);assert.equal(calls,3);assert.equal(getRefreshToken(),'refresh-new');assert.equal(localStorage.getItem('authToken'),'new');
});
test('parallel expired requests share one refresh',async()=>{
 saveAuthSession('old',{},false,'r');let refreshes=0;
 globalThis.fetch=async(url,options)=>{if(url.endsWith('/refresh')){refreshes++;await new Promise(r=>setTimeout(r,15));return json({accessToken:'new',refreshToken:'r2'});}return options.headers.get('Authorization')==='Bearer new'?json({}):json({},401);};
 const responses=await Promise.all(Array.from({length:8},()=>authenticatedFetch('/private',{},'')));
 assert.ok(responses.every(r=>r.ok));assert.equal(refreshes,1);assert.equal(localStorage.getItem('refreshToken'),null);assert.equal(sessionStorage.getItem('refreshToken'),'r2');
});
test('invalid refresh clears session without retry loop',async()=>{
 saveAuthSession('old',{},true,'r');let calls=0;globalThis.fetch=async()=>{calls++;return json({},401);};
 assert.equal((await authenticatedFetch('/private',{},'')).status,401);assert.equal(calls,2);assert.equal(getAuthToken(),null);
});
test('temporary refresh failure keeps login credentials',async()=>{
 saveAuthSession('old',{},true,'r');globalThis.fetch=async(url)=>json({},url.endsWith('/refresh')?503:401);
 await assert.rejects(authenticatedFetch('/private',{},''));assert.equal(getRefreshToken(),'r');
});
test('logout during refresh cannot restore credentials',async()=>{
 saveAuthSession('old',{},true,'r');let resolveRefresh;let started;
 const ready=new Promise(r=>started=r);
 globalThis.fetch=async(url)=>{if(url.endsWith('/refresh')){started();return new Promise(r=>resolveRefresh=r);}return json({},401);};
 const request=authenticatedFetch('/private',{},'');await ready;clearAuthSession();resolveRefresh(json({accessToken:'new',refreshToken:'r2'}));await request;
 assert.equal(getAuthToken(),null);assert.equal(getRefreshToken(),null);
});
test('expired access token is renewed before optional-auth request',async()=>{
 const token='e30.'+Buffer.from(JSON.stringify({exp:1})).toString('base64url')+'.x';saveAuthSession(token,{},false,'r');let urls=[];
 globalThis.fetch=async(url)=>{urls.push(url);return url.endsWith('/refresh')?json({accessToken:'new',refreshToken:'r2'}):json({});};
 await authenticatedFetch('/posts',{},'');assert.deepEqual(urls,['/api/auth/refresh','/posts']);
});
test('expiry separates old records and preserves today/+3 boundary',()=>{
 const today=new Date(2026,9,14);const items=[{expiryDate:'2026-10-01'},{expiryDate:'2026-10-13'},{expiryDate:'2026-10-18'},{expiryDate:'2026-10-17'},{expiryDate:'2026-10-14'}];
 const result=classifyExpiry(items,today);assert.equal(result.expired.length,2);assert.deepEqual(result.upcoming.map(x=>x.expiryDate),['2026-10-14','2026-10-17']);assert.equal(items[0].expiryDate,'2026-10-01');
});
test('changing accounts during refresh does not replay old action as new account',async()=>{
 saveAuthSession('old',{userId:1},true,'r');let resolveRefresh;let started;let protectedCalls=0;const ready=new Promise(r=>started=r);
 globalThis.fetch=async(url)=>{if(url.endsWith('/refresh')){started();return new Promise(r=>resolveRefresh=r);}protectedCalls++;return json({},401);};
 const request=authenticatedFetch('/private',{method:'POST'},'');await ready;saveAuthSession('other',{userId:2},true,'other-r');resolveRefresh(json({accessToken:'new',refreshToken:'r2'}));
 await assert.rejects(request);assert.equal(getAuthToken(),'other');assert.equal(protectedCalls,1);
});
