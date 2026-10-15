import {build} from 'esbuild';
import {test} from 'node:test';
import assert from 'node:assert/strict';
await build({stdin:{contents:`export * from './src/app/firebase'; export * from './src/app/auth/deviceSession'; export * from './src/app/auth/session';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',outfile:'tests/device-runtime.mjs',define:{'import.meta.env':JSON.stringify({VITE_FIREBASE_VAPID_KEY:'test-vapid',VITE_FIREBASE_API_KEY:'test-browser-key'})},plugins:[{name:'mock-push',setup(b){
 b.onResolve({filter:/^(firebase\/app|firebase\/messaging)$/},a=>({path:a.path,namespace:'mock'}));
 b.onResolve({filter:/\/api\/config$/},a=>({path:'api',namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path==='firebase/app'?`export const initializeApp=()=>({});`:a.path==='firebase/messaging'?`export const getMessaging=()=>({}); export const isSupported=async()=>{globalThis.calls.push('support');return true}; export const getToken=async()=>{if(globalThis.tokenGate)await globalThis.tokenGate;return 'push-test'};export const deleteToken=async()=>{globalThis.calls.push('delete-provider')};export const onMessage=()=>()=>{};`:`export const API_ENDPOINTS={registerFcmToken:'register',removeFcmToken:'remove',logout:'logout'};export const apiRequest=async(url,options)=>{globalThis.calls.push(url);if(url==='remove' && globalThis.failRemove)throw Error('offline');if(url==='remove')globalThis.authDuringRemove=localStorage.getItem('authToken');return {};};`,loader:'js'}));
}}]});
const m=await import('./device-runtime.mjs');
function storage(){const d=new Map;return {getItem:k=>d.get(k)??null,setItem:(k,v)=>d.set(k,String(v)),removeItem:k=>d.delete(k)}}
function setup(){
 globalThis.calls=[];globalThis.failRemove=false;globalThis.tokenGate=null;
 globalThis.localStorage=storage();globalThis.sessionStorage=storage();
 globalThis.window=new EventTarget;globalThis.CustomEvent=class extends Event{constructor(t){super(t)}};
 globalThis.Notification={permission:'default',requestPermission:()=>{calls.push('permission');return Promise.resolve('granted')}};window.Notification=Notification;
 const subscription={unsubscribe:async()=>{calls.push('unsubscribe');return true}};
 const registration={pushManager:{getSubscription:async()=>subscription}};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{serviceWorker:{register:async()=>registration,getRegistration:async()=>registration}}});
 globalThis.fetch=async(url,options)=>{calls.push('logout');assert.equal(JSON.parse(options.body).refreshToken,'refresh-test');return {ok:true}};
 m.finishMessagingReset();m.saveAuthSession('access-test',{id:1},true,'refresh-test');
}
test('notification permission is requested in the click stack before async support lookup',async()=>{setup();const p=m.registerFirebaseMessaging({requestPermission:true});assert.deepEqual(calls,['permission']);assert.equal(await p,true);assert.equal(localStorage.getItem('pushToken'),'push-test');});
test('device reset detaches push before clearing auth and revokes only its refresh token',async()=>{setup();localStorage.setItem('pushToken','push-test');assert.equal(await m.resetDeviceSession(),true);assert.equal(globalThis.authDuringRemove,'access-test');assert.deepEqual(calls,['remove','support','delete-provider','unsubscribe','logout']);assert.equal(m.getAuthToken(),null);assert.equal(localStorage.getItem('pushToken'),null);});
test('server failure still removes browser push subscription and local login',async()=>{setup();failRemove=true;localStorage.setItem('pushToken','push-test');assert.equal(await m.resetDeviceSession(),false);assert.ok(calls.includes('unsubscribe'));assert.equal(m.getAuthToken(),null);});
test('in-flight push registration cannot restore a subscription after reset',async()=>{setup();let release;tokenGate=new Promise(r=>release=r);const pending=m.registerFirebaseMessaging({requestPermission:true});await new Promise(r=>setImmediate(r));await m.resetDeviceSession();release();assert.equal(await pending,false);assert.equal(localStorage.getItem('pushToken'),null);assert.ok(!calls.includes('register'));m.saveAuthSession('access-test',{id:1},true,'refresh-test');assert.equal(await m.registerFirebaseMessaging({requestPermission:true}),true);});

test('granted permission reconnects after logout and login without requesting consent again',async()=>{setup();Notification.permission='granted';localStorage.setItem('pushToken','push-test');await m.resetDeviceSession();m.saveAuthSession('access-test',{id:1},true,'refresh-test');calls.length=0;assert.equal(await m.registerFirebaseMessaging(),true);assert.ok(!calls.includes('permission'));assert.ok(calls.includes('register'));assert.equal(localStorage.getItem('pushToken'),'push-test');});
