import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import test from 'node:test';
import {projectTable} from '../../scripts/refresh-profile.mjs';
const root=new URL('../../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');

test('profile assets resolve locally and hero is a real PNG',async()=>{
  const readme=await read('README.md');
  const paths=[...readme.matchAll(/(?:src|srcset)="\.\/([^\"]+)"/g)].map(m=>m[1]);
  assert.ok(paths.length>=3);
  for(const path of paths) assert.ok((await stat(new URL(path,root))).size>0,path);
  const png=await readFile(new URL('assets/readme-editorial-hero.png',root));
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
});
test('README stays compatible with GitHub sanitization and includes useful image alt text',async()=>{
  const readme=await read('README.md');
  assert.doesNotMatch(readme,/<(?:script|iframe|style)\b|\son\w+=|style=/i);
  for(const img of readme.matchAll(/<img\b[^>]+>/g)) assert.match(img[0],/alt="[^\"]{5,}"/);
  for(const theme of ['dark','light']) assert.doesNotMatch(await read(`assets/profile-activity-${theme}.svg`),/<script|<foreignObject|href=|onload=/i);
});
test('refresh preserves the complete published design outside managed project content',async()=>{
  const readme=await read('README.md');
  const snapshot=JSON.parse(await read('assets/profile-snapshot.json'));
  const [before,after]=readme.split(/<!-- PROFILE:START -->[\s\S]*?<!-- PROFILE:END -->/);
  assert.ok(before&&after);
  const refreshed=readme.replace(/<!-- PROFILE:START -->[\s\S]*?<!-- PROFILE:END -->/,projectTable(snapshot.data.repos,snapshot.updated));
  assert.equal(refreshed,readme);
  assert.match(before,/readme-editorial-hero\.png/);
  assert.match(after,/profile-activity-light\.svg/);
});
test('latest project links retain creation order and each project has one explicit action',async()=>{
  const readme=await read('README.md');
  const snapshot=JSON.parse(await read('assets/profile-snapshot.json'));
  const block=readme.match(/<!-- PROFILE:START -->[\s\S]*?<!-- PROFILE:END -->/)[0];
  const links=[...block.matchAll(/href="(https:\/\/github.com\/wz20\/[^\"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(links,snapshot.data.repos.slice(0,4).map(r=>`https://github.com/wz20/${encodeURIComponent(r.name)}`));
});
test('project visuals disclose conceptual and historical images and preserve real destinations',async()=>{
  const readme=await read('README.md');
  assert.match(readme,/概念封面/);
  assert.match(readme,/历史案例演示/);
  assert.match(readme,/https:\/\/www.douyin.com\/search\//);
  assert.match(readme,/https:\/\/wz20.github.io\/wz20\//);
  assert.match(readme,/personal-homepage-skill/);
});
