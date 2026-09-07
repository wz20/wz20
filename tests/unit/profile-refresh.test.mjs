import test from 'node:test';
import assert from 'node:assert/strict';
import { rank, projectTable, chart } from '../../scripts/refresh-profile.mjs';

const repo=(name,stars,extra={})=>({name,owner:{login:'wz20'},stargazers_count:stars,created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-01T00:00:00Z',...extra});
test('ranking discovers new repositories and filters excluded sources',()=>{
  const result=rank([repo('old',2),repo('new',7),repo('fork',99,{fork:true}),repo('private',99,{private:true}),repo('archive',99,{archived:true}),repo('wz20',99),repo('other',99,{owner:{login:'other'}})]);
  assert.deepEqual(result.map(r=>r.name),['new','old']);
});
test('creation date wins over stars and updates; equal dates use repository name',()=>{
  assert.deepEqual(rank([repo('b',99,{updated_at:'2026-09-08T00:00:00Z'}),repo('a',1),repo('recent',0,{created_at:'2026-09-07T00:00:00Z'})]).map(r=>r.name),['recent','a','b']);
});
test('repository descriptions cannot inject markup into generated README',()=>{
  const html=projectTable([repo('safe',1,{description:'<img src=x onerror="alert(1)">'})],'today');
  assert.doesNotMatch(html,/<img/);
  assert.match(html,/&lt;img/);
  assert.equal((html.match(/<td /g)||[]).length,1);
});
test('activity SVG retains zero days and actual contribution counts',()=>{
  for(const dark of [false,true]) {
    const svg=chart([repo('a',2)],{totalContributions:5,weeks:[{contributionDays:[{date:'2026-09-06',contributionCount:0},{date:'2026-09-07',contributionCount:5}]}]},'today',dark);
    assert.match(svg,/2026-09-06: 0 contributions/);
    assert.match(svg,/2026-09-07: 5 contributions/);
    assert.doesNotMatch(svg,/<script|foreignObject|href=/);
  }
});
