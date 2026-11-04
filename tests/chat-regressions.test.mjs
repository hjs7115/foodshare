import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeMessages,mergeMessageList,applyReadReceipt,createClientMessageId} from './runtime.mjs';
import {webcrypto} from 'node:crypto';
const message=(id,content='네')=>({messageId:id,senderId:10,mine:true,content,systemMessage:false,unreadCount:2,createdAt:'2026-11-04T12:00:00'});
test('distinct server IDs preserve identical rapid messages',()=>{
 const result=mergeMessages([message(1)],message(2),10);assert.deepEqual(result.map(m=>m.messageId),[1,2]);
});
test('replayed confirmed ID updates state without duplicating a message',()=>{
 const result=mergeMessages([message(1)],{...message(1),unreadCount:0},10);assert.equal(result.length,1);assert.equal(result[0].unreadCount,0);
});
test('group read receipt is idempotent per reader',()=>{
 const one=applyReadReceipt(message(1),20),again=applyReadReceipt(one,20),two=applyReadReceipt(again,30);
 assert.equal(one.unreadCount,1);assert.equal(again.unreadCount,1);assert.equal(two.unreadCount,0);
});
test('history page overlap merges by actual IDs',()=>{
 assert.deepEqual(mergeMessageList([message(1),message(2),message(2),message(3)],10).map(m=>m.messageId),[1,2,3]);
});
test('HTTP LAN environment without randomUUID can still create valid unique chat retry IDs',()=>{
 const cryptoApi={getRandomValues: array=>webcrypto.getRandomValues(array)};
 const ids=Array.from({length:1000},()=>createClientMessageId(cryptoApi));
 assert.equal(new Set(ids).size,1000);
 for(const id of ids) assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
test('secure browser environment uses native chat retry ID generation',()=>{
 assert.equal(createClientMessageId({randomUUID:()=> 'native-id'}),'native-id');
});
