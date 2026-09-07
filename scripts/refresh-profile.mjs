import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const escape = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function rank(repos) {
  return repos.filter(r => !r.private && !r.fork && !r.archived && r.name !== 'wz20' && r.owner?.login === 'wz20')
    .sort((a,b) => b.created_at.localeCompare(a.created_at) || a.name.localeCompare(b.name, 'en'));
}
export function projectTable(repos, updated) {
  const cards = repos.slice(0,4).map(r => `<td width="50%" valign="top"><h3>${escape(r.name)}</h3><p>★ ${r.stargazers_count} · ${escape(r.language || '多语言')}</p><p>${escape(r.description || '查看仓库了解项目代码与文档。')}</p><a href="https://github.com/wz20/${encodeURIComponent(r.name)}">查看项目 →</a></td>`);
  return `<!-- PROFILE:START -->\n<p>最新公开项目 · 按创建时间从新到旧 · 每小时检查更新<br>数据更新时间：${escape(updated)}</p>\n<table>\n${[0,2].filter(i=>cards[i]).map(i=>'<tr>'+cards.slice(i,i+2).join('\n')+'</tr>').join('\n')}\n</table>\n<!-- PROFILE:END -->`;
}
export function chart(repos, calendar, updated, dark) {
  const bg=dark?'#071011':'#f3f0e8', fg=dark?'#f3f0e8':'#15292a', muted=dark?'#a7bcbd':'#52696a';
  const shades=dark?['#213536','#146b68','#199b95','#24d8d2','#a0fff4']:['#dce3df','#b2d9cd','#62b99f','#208971','#08664f'];
  const days=calendar.weeks.flatMap((w,x)=>w.contributionDays.map(d=>{
    const y=new Date(d.date+'T00:00:00Z').getUTCDay();
    const n=d.contributionCount, level=n===0?0:n<3?1:n<6?2:n<10?3:4;
    return `<rect x="${28+x*16}" y="${151+y*16}" width="12" height="12" rx="3" fill="${shades[level]}"><title>${escape(d.date)}: ${n} contributions</title></rect>`;
  })).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="920" height="320" viewBox="0 0 920 320" role="img" aria-labelledby="title desc"><title id="title">wz20 GitHub 项目与贡献活动</title><desc id="desc">${escape(updated)} 更新。${repos.length} 个公开原创非归档项目，合计 ${repos.reduce((n,r)=>n+r.stargazers_count,0)} Stars；近一年 ${calendar.totalContributions} 次贡献。</desc><rect width="920" height="320" rx="20" fill="${bg}"/><g font-family="sans-serif" fill="${fg}"><text x="28" y="40" font-size="20" font-weight="bold">GITHUB / 花卷的开源足迹</text><text x="28" y="84" font-size="25">${repos.length} 项目　 /　 ${repos.reduce((n,r)=>n+r.stargazers_count,0)} Stars　 /　 ${calendar.totalContributions} 次年度贡献</text><text x="28" y="120" font-size="13" fill="${muted}">公开原创、非归档仓库 · 贡献日历来自 GitHub</text>${days}<text x="28" y="292" font-size="12" fill="${muted}">数据更新 ${escape(updated)} · 每小时检查 · 抓取失败时保留上次有效数据</text></g></svg>\n`;
}

const api = args => JSON.parse(execFileSync('gh',['api',...args],{encoding:'utf8',timeout:60000,maxBuffer:8*1024*1024}));
export async function refresh() {
  const pages=api(['--paginate','--slurp','users/wz20/repos?type=owner&per_page=100']);
  const repos=rank(pages.flat());
  const response=api(['graphql','-f','query=query { user(login:"wz20") { contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } } } } }']);
  const calendar=response.data?.user?.contributionsCollection?.contributionCalendar;
  if(response.errors || repos.length<4 || !calendar?.weeks?.length || !Number.isInteger(calendar.totalContributions)) throw new Error('Incomplete GitHub response; preserving published data');
  for(const r of repos) if(!Number.isInteger(r.stargazers_count)||r.stargazers_count<0) throw new Error('Invalid star count');
  for(const w of calendar.weeks) for(const d of w.contributionDays) if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||!Number.isInteger(d.contributionCount)||d.contributionCount<0) throw new Error('Invalid calendar');
  const data={repos:repos.map(({name,description,language,stargazers_count,created_at,updated_at})=>({name,description,language,stargazers_count,created_at,updated_at})),calendar};
  const serialized=JSON.stringify(data);
  let old;
  try { old=JSON.parse(await readFile('assets/profile-snapshot.json','utf8')); } catch(e) { if(e.code!=='ENOENT') throw e; }
  const unchanged=old && JSON.stringify(old.data)===serialized;
  const updated=unchanged ? old.updated : new Date().toISOString().slice(0,16).replace('T',' ')+' UTC';
  let readme=await readFile('README.md','utf8');
  if(!readme.includes('<!-- PROFILE:START -->') || !readme.includes('<!-- PROFILE:END -->')) throw new Error('Missing managed README markers');
  readme=readme.replace(/<!-- PROFILE:START -->[\s\S]*?<!-- PROFILE:END -->/,projectTable(repos,updated));
  // All API requests and validation finish before any generated artifact is changed.
  await mkdir('assets',{recursive:true});
  await writeFile('README.md',readme);
  for(const theme of ['dark','light']) await writeFile(`assets/profile-activity-${theme}.svg`,chart(repos,calendar,updated,theme==='dark'));
  await writeFile('assets/profile-snapshot.json',JSON.stringify({updated,data},null,2)+'\n');
  console.log(`Updated ${repos.length} repositories; top: ${repos.slice(0,4).map(r=>r.name).join(', ')}`);
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) await refresh();
