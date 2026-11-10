import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const chat = readFileSync(new URL('../src/app/components/chat/ChatScreen.tsx', import.meta.url), 'utf8');
const picker = readFileSync(new URL('../src/app/components/chat/ChatMapPicker.tsx', import.meta.url), 'utf8');

test('switching attachment sheet to chat map keeps one browser history entry', () => {
  assert.match(chat, /useNestedBack\(showAttachmentMenu \|\| showChatMapModal/);
  assert.doesNotMatch(chat, /useNestedBack\(showChatMapModal\s*,/);
  assert.match(chat, /setShowAttachmentMenu\(false\);[\s\S]*?setShowChatMapModal\(true\)/);
});

test('chat map stays open until the location message is actually sent', () => {
  assert.match(chat, /return sendChatContent\(/);
  assert.match(picker, /const ok = await onSelectAddress\(/);
  assert.match(picker, /if \(ok && mounted\.current\) onClose\(\)/);
  assert.match(picker, /이 위치 보내기/);
});

test('map has permanently mounted SDK host and explicit mobile search controls', () => {
  assert.match(picker, /createPortal\(/);
  assert.match(picker, /ref=\{host\}/);
  assert.match(picker, /loadKakaoMaps\(\)/);
  assert.match(picker, /categorySearch\(/);
  assert.match(picker, /keywordSearch\(/);
  assert.match(picker, /coord2Address\(/);
  for (const category of ['카페', '음식점', '편의점', '주차장']) assert.ok(picker.includes(category));
});
