# GitHub Profile 自动更新

`Refresh GitHub profile` 工作流每小时第 23 分钟检查数据，也可手动执行。
GitHub 调度及图片缓存可能延迟；README 显示数据更新时间，并非逐次访问实时查询。

数据来自 GitHub REST 仓库列表（完整分页）和 GraphQL 贡献日历。
榜单范围：wz20 的公开、非 Fork、非归档仓库，排除主页仓库 wz20。
按 created_at（仓库创建时间）降序、仓库名升序，取最新四项。Star 或旧项目的更新不影响此顺序；下方 GitHub 热门仓库区独立展示。
统计卡的仓库数和 Star 总数采用同一过滤范围；贡献日历采用 GitHub 返回的近一年数据。

工作流使用自带 GITHUB_TOKEN，无需个人令牌或第三方统计图服务。
只改写 README 中 PROFILE 标记之间的榜单以及 assets/profile-* 数据和 SVG。
GitHub API 请求或校验失败时不提交，继续展示上一次有效数据；Actions 会记录失败。
数据相同时不修改文件或时间戳，避免无效提交。
已发布的 Pages 实验室仍保留原精选作品；此工作流负责 github.com/wz20 个人主页。

本地执行：`node scripts/refresh-profile.mjs`，需要已登录的 GitHub CLI。
测试：`npm run test:unit`。

个人简介正文和职业描述可以自行编辑或删除，测试不锁定这些文案。
2026-09-12 修复：旧测试强制要求已删除的自我介绍，导致定时更新持续失败并发送邮件。
现在保留章节顺序、榜单排序、链接和生成图片验证，取消个人简介的逐字匹配。

注意 GitHub 可能暂停长期无活动公开仓库的定时任务；需要时在 Actions 中重新启用工作流。
