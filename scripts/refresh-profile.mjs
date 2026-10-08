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
const projectMedia = new Map([
  ['how-it-moves', { src: 'https://raw.githubusercontent.com/wz20/how-it-moves/main/docs/media/agent-loop.gif', alt: 'How It Moves：Agent 流程历史演示', caption: '技术动画 · 历史案例演示' }],
  ['huajuan-knowledge-cottage', { src: 'https://raw.githubusercontent.com/wz20/huajuan-knowledge-cottage/main/docs/demo.gif', alt: '花卷知识小屋：实际应用演示', caption: '知识管理 · 实际应用演示' }],
  ['desktop-pet-delivery', { src: 'https://raw.githubusercontent.com/wz20/desktop-pet-delivery/main/docs/images/desktop-pet-delivery.png', alt: '桌宠制作 Skill 的概念封面，非运行截图', caption: '桌宠制作 · 概念封面' }],
  ['huajuan-harness-cli', { src: 'https://raw.githubusercontent.com/wz20/huajuan-harness-cli/main/docs/images/cli-real-start.png', alt: '花卷 Harness：真实 CLI 启动画面', caption: 'Agent 工具 · 实际运行画面' }],
]);
export function projectTable(repos, updated) {
  const cards = repos.slice(0,4).map((r, i) => {
    const media = projectMedia.get(r.name);
    const url = `https://github.com/wz20/${encodeURIComponent(r.name)}`;
    const visual = media ? `<p><img src="${escape(media.src)}" width="100%" alt="${escape(media.alt)}"><br><sub>${escape(media.caption)}</sub></p>` : '';
    return `<h3>${String(i+1).padStart(2,'0')} / ${escape(projectSummaries.get(r.name)?.title || r.name)}</h3>\n${visual}\n<p>${escape(projectSummaries.get(r.name)?.description || r.description || '查看仓库了解项目代码与文档。')}</p>\n<p><a href="${url}"><b>探索项目 ↗</b></a>　<sub>${escape(r.language || '多语言')} · ★ ${r.stargazers_count}</sub></p>`;
  });
  return `<!-- PROFILE:START -->\n${cards.join('\n<br>\n')}\n<details><summary>关于这些项目与自动更新</summary><p>最新公开原创、非归档项目，按创建时间排序；每小时检查。数据更新时间：${escape(updated)}。演示、概念封面与功能验证边界以各仓库说明为准。</p></details>\n<!-- PROFILE:END -->`;
}
export function chart(repos, calendar, updated, dark) {
  const bg=dark?'#232620':'#f4eee2', fg=dark?'#f4eee2':'#292a25', muted=dark?'#b7bdac':'#656b59';
  const shades=dark?['#353c30','#586847','#819268','#b0bc8f','#e4dfbd']:['#e2e4d5','#c4ccad','#99aa7e','#73875c','#4b633d'];
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
