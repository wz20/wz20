import { PROJECTS } from "./data.js";

const createElement = (tagName, className) => {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  return element;
};

export function renderProjects(projects, target) {
  const fragment = document.createDocumentFragment();
  for (const project of projects) {
    const article = createElement("article", `weui-panel project-card project-card--${project.accent}`);
    article.dataset.projectCard = project.id;
    const header = createElement("div", "weui-panel__hd");
    header.textContent = `${project.status} · ${project.category}`;
    const body = createElement("div", "weui-panel__bd");
    const media = createElement("div", "weui-media-box weui-media-box_text");
    const title = createElement("h3", "weui-media-box__title");
    title.textContent = project.title;
    const description = createElement("p", "weui-media-box__desc");
    description.textContent = project.description;
    const tags = createElement("ul", "weui-media-box__info");
    tags.ariaLabel = "技术标签";
    for (const tag of project.tags) {
      const item = document.createElement("li");
      item.textContent = tag;
      tags.append(item);
    }
    media.append(title, description, tags);
    body.append(media);
    const footer = createElement("div", "weui-panel__ft");
    const link = createElement("a", "weui-cell weui-cell_access");
    link.href = project.repo;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.ariaLabel = `查看 ${project.title} 的 GitHub 项目`;
    const linkText = createElement("span", "weui-cell__bd");
    linkText.textContent = "查看 GitHub 项目";
    link.append(linkText, createElement("span", "weui-cell__ft"));
    footer.append(link);
    article.append(header, body, footer);
    fragment.append(article);
  }
  target.replaceChildren(fragment);
}

const projectGrid = document.querySelector("#project-grid");
if (projectGrid) {
  renderProjects(PROJECTS, projectGrid);
  document.documentElement.dataset.enhanced = "true";
}
