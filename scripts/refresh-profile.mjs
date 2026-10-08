import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const escape = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function rank(repos) {
  return repos.filter(r => !r.private && !r.fork && !r.archived && r.name !== 'wz20' && r.owner?.login === 'wz20')
    .sort((a,b) => b.created_at.localeCompare(a.created_at) || a.name.localeCompare(b.name, 'en'));
}
// Human-written summaries describe scope; GitHub remains the source for ordering and stats.
const projectSummaries = new Map([
  ['how-it-moves', { title: 'How It Moves · 让原理动起来', description: '把技术机制组织成动画与插画的制作 Skill，支持 HTML、无声 MP4 与 SVG；具体能力和案例边界见仓库说明。' }],
  ['huajuan-knowledge-cottage', { title: '花卷 · 知识小屋', description: '把本地 Obsidian 知识库搬进可翻转的 3D 小星球，串起笔记浏览、待办与休闲互动。提供 macOS Apple Silicon 安装包。' }],
  ['desktop-pet-delivery', { title: 'Desktop Pet Delivery · 桌宠制作', description: '把角色素材接入独立桌宠的 Codex Skill 与 Electron 模板，提供互动配置和打包流程；各平台成品需分别验收。' }],
  ['huajuan-harness-cli', { title: 'Huajuan Harness · Agent 工作区', description: '为本地目录配置知识入库、记忆维护与审阅流程，让 Agent 按工作区规则整理知识，并保留可检查的变更记录。' }],
]);
const themes = ['#ffe15a','#5cf4ff','#ff7ac8','#d7ccff'];
const cardCopy = new Map([
  ['how-it-moves', {title:'让原理动起来', category:'MOTION / 技术动画', short:'把技术机制做成动画与插画。支持 HTML、无声 MP4 与 SVG。'}],
  ['huajuan-knowledge-cottage', {title:'花卷 · 知识小屋', category:'SPACE / 知识管理', short:'一颗可翻转的 3D 小星球，连接 Obsidian 笔记、待办与休闲。'}],
  ['desktop-pet-delivery', {title:'把角色带到桌面', category:'PLAY / 桌宠制作', short:'桌宠制作 Skill 与 Electron 模板。互动配置、素材导入与分平台打包。'}],
  ['huajuan-harness-cli', {title:'让 Agent 理解工作区', category:'AGENT / 知识工具', short:'把本地目录变成有规则的知识工作区，串起入库、记忆与审阅。'}],
]);
// Layout in em-like units handles CJK and long new repository names without clipping.
export function wrapText(value, units, limit=3) {
  const chars=Array.from(String(value ?? '').replace(/\s+/g,' ').trim());
  const lines=[]; let line='',used=0;
  for(const c of chars) {
    const width=/[^\x00-\xff]/.test(c)?1:0.57;
    if(used+width>units && line) {lines.push(line);line='';used=0;}
    line+=c;used+=width;
  }
  if(line) lines.push(line);
  if(lines.length>limit) return [...lines.slice(0,limit-1),lines[limit-1].slice(0,-1)+'…'];
  return lines;
}
export function projectCard(r, index, mobile=false) {
  const copy=cardCopy.get(r.name) || {title:r.name,category:'NEW / 开源项目',short:r.description || '查看仓库了解代码、文档与使用方法。'};
  const accent=themes[index%themes.length];
  const width=mobile?680:1200, height=mobile?430:304;
  const tx=mobile?40:278, titleY=mobile?132:108, titleSize=mobile?43:46;
  const title=wrapText(copy.title,mobile?13.5:18,2);
  const descY=mobile?248:196;
  const description=wrapText(copy.short,mobile?20:31,mobile?3:2);
  const textLines=(lines,x,y,size,fill,lineHeight,weight='400')=>lines.map((line,i)=>`<text x="${x}" y="${y+i*lineHeight}" font-size="${size}" font-weight="${weight}" fill="${fill}">${escape(line)}</text>`).join('');
  const identifier=String(index+1).padStart(2,'0');
  const tile=mobile
    ? `<rect x="24" y="24" width="632" height="56" rx="20" fill="${accent}"/><text x="42" y="62" font-size="26" font-weight="700" fill="#15110a">${identifier} / ${escape(copy.category)}</text>`
    : `<rect x="16" y="16" width="226" height="272" rx="28" fill="${accent}"/><text x="42" y="65" font-size="20" font-weight="700" fill="#15110a">OPEN SOURCE</text><text x="36" y="209" font-size="132" font-weight="800" letter-spacing="-9" fill="#15110a">${identifier}</text><path d="M47 252h143m-18-15 18 15-18 15" fill="none" stroke="#15110a" stroke-width="3"/>`;
  const category=mobile?'':`<text x="${tx}" y="51" font-size="21" font-weight="600" letter-spacing="2" fill="${accent}">${escape(copy.category)}</text>`;
  const titleMarkup=textLines(title,tx,titleY,titleSize,'#fff9ef',mobile?48:48,'700');
  const repoY=mobile?203:146;
  const repoLabel=title.length===1?`<text x="${tx}" y="${repoY}" font-size="${mobile?22:23}" fill="#a9a69d">${escape(wrapText(r.name,mobile?42:60,1)[0] || '')}</text>`:'';
  const stats=`${r.language || '多语言'}   /   ★ ${r.stargazers_count}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">${escape(copy.title)}</title><desc id="desc">${escape(r.name)}。${escape(copy.short)}。${escape(stats)}</desc><rect width="${width}" height="${height}" rx="32" fill="#15110a"/><rect x="1" y="1" width="${width-2}" height="${height-2}" rx="31" fill="none" stroke="#36332c"/><g font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">${tile}${category}${titleMarkup}${repoLabel}${textLines(description,tx,descY,mobile?28:27,'#d1cec6',mobile?37:38)}<text x="${tx}" y="${mobile?391:275}" font-size="${mobile?22:21}" fill="${accent}">${escape(stats)}</text><circle cx="${mobile?615:1139}" cy="${mobile?378:258}" r="${mobile?27:23}" fill="${accent}"/><path d="M${mobile?605:1130} ${mobile?388:267}l19-19m-19 0h19v19" fill="none" stroke="#15110a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g></svg>\n`;
}
export function projectTable(repos, updated) {
  const cards=repos.slice(0,4).map((r,i)=>{
    const summary=projectSummaries.get(r.name);
    const alt=`${i+1}. ${summary?.title || r.name}：${summary?.description || r.description || '查看项目代码与文档'}`;
    return `<a href="https://github.com/wz20/${encodeURIComponent(r.name)}"><picture><source media="(max-width: 600px)" srcset="./assets/profile-project-${i+1}-mobile.svg"><img src="./assets/profile-project-${i+1}.svg" width="100%" alt="${escape(alt)}"></picture></a>`;
  });
  return `<!-- PROFILE:START -->\n${cards.join('\n\n')}\n\n<details><summary>项目目录与更新说明</summary>\n\n${repos.slice(0,4).map(r=>`- **${escape(projectSummaries.get(r.name)?.title || r.name)}**：${escape(projectSummaries.get(r.name)?.description || r.description || '查看仓库说明。')}`).join('\n')}\n\n最新四个公开原创、非归档项目，按创建时间排序；每小时检查。数据更新时间：${escape(updated)}。\n</details>\n<!-- PROFILE:END -->`;
}
export function chart(repos, calendar, updated, dark) {
  const bg='#15110a', fg='#fff9ef', muted='#bcb7aa';
  const shades=['#302d23','#675e2b','#aa963c','#dac34e','#ffe15a'];
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
  for(const [i,r] of repos.slice(0,4).entries()) {
    await writeFile(`assets/profile-project-${i+1}.svg`,projectCard(r,i));
    await writeFile(`assets/profile-project-${i+1}-mobile.svg`,projectCard(r,i,true));
  }
  for(const theme of ['dark','light']) await writeFile(`assets/profile-activity-${theme}.svg`,chart(repos,calendar,updated,theme==='dark'));
  await writeFile('assets/profile-snapshot.json',JSON.stringify({updated,data},null,2)+'\n');
  console.log(`Updated ${repos.length} repositories; top: ${repos.slice(0,4).map(r=>r.name).join(', ')}`);
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) await refresh();
