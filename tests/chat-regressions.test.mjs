import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeMessages,mergeMessageList,applyReadReceipt} from './runtime.mjs';
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
