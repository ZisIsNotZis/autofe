import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const files=JSON.parse(fs.readFileSync('.scratch/62-all-sites/integration/remainder/checkpoint-hashes.json')).files;
const pages=['sspai-com/post-114716','taobao-com/home','mi-com/product-detail-mi15','apple-com/home','apple-com/ipad-air','airbnb-com/room-28871','bilibili-com/home'];
for(const k of pages){const p='m1/curated/'+k+'.json';assert.equal(crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),files[p]);console.log('PASS protected checkpoint model unchanged '+k);}
console.log('Protected design source-model boundary PASS 7/7; source-equivalent resource repairs precede this checkpoint. Rendered regression is separate.');
