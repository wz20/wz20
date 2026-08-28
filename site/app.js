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
    const detailButton = createElement("button", "weui-btn weui-btn_mini weui-btn_default");
    detailButton.type = "button";
    detailButton.dataset.openProject = project.id;
    detailButton.textContent = `查看 ${project.title} 详情`;
    media.append(title, description, tags, detailButton);
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

const projectDialog = document.querySelector("#project-dialog");
const contactSheet = document.querySelector("#contact-sheet");
const feedbackToast = document.querySelector("#feedback-toast");
let projectTrigger = null;
let contactTrigger = null;
let toastTimer = 0;
let backgroundStates = new Map();

function focusableElements(container) {
  const selector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled]):not([type='hidden'])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[contenteditable='true']",
    "[tabindex]:not([tabindex='-1'])",
  ].join(",");
  return [...container.querySelectorAll(selector)].filter((element) => (
    !element.hidden
    && element.getAttribute("aria-hidden") !== "true"
    && element.getClientRects().length > 0
  ));
}

function activeOverlay() {
  if (projectDialog && !projectDialog.hidden) return projectDialog;
  if (contactSheet && !contactSheet.hidden) return contactSheet;
  return null;
}

function restoreBackground() {
  for (const [element, wasInert] of backgroundStates) element.inert = wasInert;
  backgroundStates = new Map();
}

function isolateOverlay(overlay) {
  restoreBackground();
  for (const element of document.body.children) {
    if (element === overlay || element === feedbackToast || element.tagName === "SCRIPT") continue;
    backgroundStates.set(element, element.inert);
    element.inert = true;
  }
}

function restoreFocus(trigger) {
  if (trigger?.isConnected && typeof trigger.focus === "function") trigger.focus({ preventScroll: true });
}

export function openProjectDialog(id, trigger) {
  const project = PROJECTS.find((item) => item.id === id);
  if (!project || !projectDialog) return;
  if (contactSheet && !contactSheet.hidden) closeContactSheet();
  projectTrigger = trigger;
  projectDialog.querySelector("#project-dialog-title").textContent = project.title;
  projectDialog.querySelector("#project-dialog-outcome").textContent = project.outcome;
  const link = projectDialog.querySelector("#project-dialog-link");
  link.href = project.repo;
  link.ariaLabel = `查看 ${project.title} 的 GitHub 项目`;
  projectDialog.hidden = false;
  projectDialog.classList.add("is-open");
  isolateOverlay(projectDialog);
  projectDialog.querySelector("[data-close-project]").focus({ preventScroll: true });
}

export function closeProjectDialog() {
  if (!projectDialog || projectDialog.hidden) return;
  const trigger = projectTrigger;
  projectDialog.classList.remove("is-open");
  projectDialog.hidden = true;
  projectTrigger = null;
  restoreBackground();
  restoreFocus(trigger);
}

export function openContactSheet(trigger) {
  if (!contactSheet) return;
  if (projectDialog && !projectDialog.hidden) closeProjectDialog();
  contactTrigger = trigger;
  contactSheet.hidden = false;
  contactSheet.classList.add("is-open");
  isolateOverlay(contactSheet);
  contactSheet.querySelector("[data-copy-douyin]").focus({ preventScroll: true });
}

export function closeContactSheet() {
  if (!contactSheet || contactSheet.hidden) return;
  const trigger = contactTrigger;
  contactSheet.classList.remove("is-open");
  contactSheet.hidden = true;
  contactTrigger = null;
  restoreBackground();
  restoreFocus(trigger);
}

export function showToast(message) {
  if (!feedbackToast) return;
  window.clearTimeout(toastTimer);
  feedbackToast.textContent = message;
  feedbackToast.hidden = false;
  toastTimer = window.setTimeout(() => {
    feedbackToast.hidden = true;
  }, 1800);
}

async function copyDouyin() {
  const focusedBeforeCopy = document.activeElement;
  let copied = false;
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
    await navigator.clipboard.writeText("花卷AI实验室");
    copied = true;
  } catch {
    const input = document.createElement("input");
    input.dataset.clipboardHelper = "true";
    input.value = "花卷AI实验室";
    input.readOnly = true;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    try {
      input.select();
      copied = document.execCommand?.("copy") === true;
    } catch {
      copied = false;
    } finally {
      input.remove();
      restoreFocus(focusedBeforeCopy);
    }
  }
  showToast(copied ? "已复制：花卷AI实验室" : "无法复制，请手动搜索：花卷AI实验室");
}

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const projectButton = event.target.closest("[data-open-project]");
  if (projectButton) openProjectDialog(projectButton.dataset.openProject, projectButton);
  if (event.target.closest("[data-close-project]")) closeProjectDialog();
  const contactButton = event.target.closest("[data-open-contact]");
  if (contactButton) openContactSheet(contactButton);
  if (event.target.closest("[data-close-contact]")) closeContactSheet();
  if (event.target.closest("[data-copy-douyin]")) copyDouyin();
});

document.addEventListener("keydown", (event) => {
  const overlay = activeOverlay();
  if (!overlay) return;
  if (event.key === "Escape") {
    event.preventDefault();
    overlay === projectDialog ? closeProjectDialog() : closeContactSheet();
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = focusableElements(overlay);
  if (focusable.length === 0) {
    event.preventDefault();
    overlay.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!overlay.contains(document.activeElement)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});
