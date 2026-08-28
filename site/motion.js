const OVERLAY_TRANSITION_EVENT = "huajuan:overlay-transition";

export function initMotion({
  gsap = globalThis.gsap,
  ScrollTrigger = globalThis.ScrollTrigger,
  MotionPathPlugin = globalThis.MotionPathPlugin,
  overlayEventTarget = null,
} = {}) {
  const root = document.documentElement;
  let destroyed = false;
  root.dataset.motionLifecycle = "active";

  if (!gsap || !ScrollTrigger || !MotionPathPlugin) {
    root.dataset.motion = "unavailable";
    return {
      destroy() {
        if (destroyed) return;
        destroyed = true;
        root.dataset.motionLifecycle = "destroyed";
      },
    };
  }

  gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

  const media = gsap.matchMedia();
  const ownedAnimations = new Set();
  const ownedTriggers = new Set();
  const visibilityPaused = new Set();
  const visibilityResumeGuards = new Map();
  const visibilitySynchronizers = new Set();

  function ownAnimation(animation) {
    if (animation) ownedAnimations.add(animation);
    return animation;
  }

  function forgetAnimation(animation) {
    if (!animation) return;
    visibilityPaused.delete(animation);
    visibilityResumeGuards.delete(animation);
    ownedAnimations.delete(animation);
  }

  function ownTrigger(triggerOrTriggers) {
    const triggers = Array.isArray(triggerOrTriggers) ? triggerOrTriggers : [triggerOrTriggers];
    for (const trigger of triggers) {
      if (trigger) ownedTriggers.add(trigger);
    }
    return triggerOrTriggers;
  }

  function resetFlowState() {
    const flow = document.querySelector("#flow");
    const stages = [...document.querySelectorAll(".flow-stage")];
    const progress = document.querySelector(".weui-progress");
    const progressBar = document.querySelector(".weui-progress__inner-bar");
    const flowLink = document.querySelector('[data-section-link][href="#flow"]');
    stages.forEach((stage, index) => stage.classList.toggle("is-active", index === 0));
    if (flow) flow.dataset.activeStage = stages[0]?.dataset.flowStage ?? "idea";
    if (progress) progress.setAttribute("aria-valuenow", "1");
    if (progressBar) gsap.set(progressBar, { scaleX: 0.25, transformOrigin: "left center" });
    if (flowLink) {
      flowLink.classList.remove("weui-bar__item_on");
      flowLink.removeAttribute("aria-current");
    }
  }

  media.add(
    {
      reduceMotion: "(prefers-reduced-motion: reduce)",
      motionAllowed: "(prefers-reduced-motion: no-preference)",
      desktop: "(min-width: 900px)",
      finePointer: "(hover: hover) and (pointer: fine)",
    },
    ({ conditions }) => {
      const branchAnimations = new Set();
      const branchTriggers = new Set();
      const branchCleanups = [];
      let branchDestroyed = false;

      function branchAnimation(animation) {
        if (!animation) return animation;
        branchAnimations.add(animation);
        return ownAnimation(animation);
      }

      function branchTrigger(triggerOrTriggers) {
        const triggers = Array.isArray(triggerOrTriggers) ? triggerOrTriggers : [triggerOrTriggers];
        for (const trigger of triggers) {
          if (trigger) branchTriggers.add(trigger);
        }
        return ownTrigger(triggerOrTriggers);
      }

      function clearFinalMotionStyles() {
        gsap.set(".lab-hero__grid, #hero-title > *, .lab-hero__actions > *, .project-card, .project-card__content", {
          clearProps: "transform,opacity,visibility",
        });
        gsap.set(".cat-line", { clearProps: "strokeDasharray,strokeDashoffset,opacity,visibility" });
        gsap.set("#cat-orbiter", { clearProps: "transform,opacity,visibility" });
      }

      if (conditions.reduceMotion) {
        root.dataset.motion = "reduced";
        clearFinalMotionStyles();
        resetFlowState();
        document.querySelectorAll("#project-dialog, #contact-sheet").forEach((overlay) => {
          gsap.set(overlay, { clearProps: "transform,opacity,visibility" });
        });
        return () => {
          clearFinalMotionStyles();
          resetFlowState();
        };
      }

      root.dataset.motion = "ready";

      const introTargets = ".lab-hero__mark, .cat-line";
      const intro = branchAnimation(gsap.timeline({
        defaults: { ease: "power3.out" },
        onComplete() {
          gsap.set(introTargets, { clearProps: "transform,opacity,visibility,strokeDasharray,strokeDashoffset" });
        },
      }));
      intro
        .from(".lab-hero__mark", { scale: 0.96, transformOrigin: "center", duration: 0.45 })
        .from(".cat-line", {
          strokeDasharray: (_, path) => path.getTotalLength(),
          strokeDashoffset: (_, path) => path.getTotalLength(),
          duration: 0.78,
          stagger: 0.08,
        }, "<0.08");

      const orbit = branchAnimation(gsap.to("#cat-orbiter", {
        duration: 11,
        repeat: -1,
        ease: "none",
        motionPath: {
          path: "#orbit-path",
          align: "#orbit-path",
          alignOrigin: [0.5, 0.5],
        },
      }));
      const hero = document.querySelector("#home");
      const orbiter = document.querySelector("#cat-orbiter");
      let heroInView = false;

      function synchronizeOrbitVisibility() {
        if (branchDestroyed || !orbiter) return;
        const shouldRun = heroInView && !document.hidden;
        if (shouldRun) orbit.resume();
        else orbit.pause();
        orbiter.dataset.orbitState = shouldRun ? "running" : "paused";
      }

      if (hero && orbiter) {
        const heroVisibilityTrigger = branchTrigger(ScrollTrigger.create({
          trigger: hero,
          start: "top bottom",
          end: "bottom top",
          onToggle(self) {
            heroInView = self.isActive;
            synchronizeOrbitVisibility();
          },
        }));
        heroInView = heroVisibilityTrigger.isActive;
        visibilityResumeGuards.set(orbit, () => heroInView && !document.hidden && !branchDestroyed);
        visibilitySynchronizers.add(synchronizeOrbitVisibility);
        synchronizeOrbitVisibility();
        branchCleanups.push(() => {
          visibilitySynchronizers.delete(synchronizeOrbitVisibility);
          visibilityResumeGuards.delete(orbit);
          orbiter.removeAttribute("data-orbit-state");
        });
      } else {
        orbit.pause();
      }

      const projectTriggers = ScrollTrigger.batch(".project-card", {
        start: "top 88%",
        once: true,
        onEnter(cards) {
          const cardContents = cards
            .map((card) => card.querySelector(".project-card__content"))
            .filter(Boolean);
          branchAnimation(gsap.from(cardContents, {
            y: 38,
            opacity: 0.72,
            duration: 0.58,
            stagger: 0.09,
            ease: "power2.out",
            overwrite: "auto",
          }));
        },
      });
      branchTrigger(projectTriggers);

      if (conditions.desktop) {
        const flow = document.querySelector("#flow");
        const stages = [...document.querySelectorAll(".flow-stage")];
        const progressBar = document.querySelector(".weui-progress__inner-bar");
        const flowLink = document.querySelector('[data-section-link][href="#flow"]');

        function setFlowNavigationActive(isActive) {
          if (!flowLink) return;
          flowLink.classList.toggle("weui-bar__item_on", isActive);
          if (isActive) flowLink.setAttribute("aria-current", "location");
          else flowLink.removeAttribute("aria-current");
        }

        function synchronizeFlow(progress, isActive = true) {
          if (!stages.length || !flow) return;
          const index = Math.min(stages.length - 1, Math.floor(progress * stages.length));
          stages.forEach((stage, stageIndex) => stage.classList.toggle("is-active", stageIndex === index));
          flow.dataset.activeStage = stages[index].dataset.flowStage;
          flow.querySelector(".weui-progress")?.setAttribute("aria-valuenow", String(index + 1));
          setFlowNavigationActive(isActive);
        }

        resetFlowState();
        if (flow && stages.length && progressBar) {
          const flowTimeline = branchAnimation(gsap.timeline({
            scrollTrigger: {
              trigger: flow,
              start: "top top+=72",
              end: "+=2200",
              pin: true,
              scrub: 0.7,
              invalidateOnRefresh: true,
              onUpdate(self) {
                synchronizeFlow(self.progress, self.isActive);
              },
              onToggle(self) {
                setFlowNavigationActive(self.isActive);
              },
            },
          }));
          flowTimeline.to(progressBar, {
            scaleX: 1,
            transformOrigin: "left center",
            duration: 1,
            ease: "none",
          }, 0);
          branchTrigger(flowTimeline.scrollTrigger);
        }
      }

      const overlayTransitions = new Map();

      function finishOverlayTransition(overlay, transition) {
        if (overlayTransitions.get(overlay) !== transition) return;
        overlayTransitions.delete(overlay);
        transition.timeline.kill();
        forgetAnimation(transition.timeline);
        branchAnimations.delete(transition.timeline);
        gsap.set(overlay, { clearProps: "transform,opacity,visibility" });
        gsap.set(overlay.children, { clearProps: "transform,opacity,visibility" });
        transition.complete();
      }

      function handleOverlayTransition(event) {
        const { overlay, phase, complete } = event.detail ?? {};
        if (!(overlay instanceof HTMLElement) || typeof complete !== "function" || !["open", "close"].includes(phase)) return;
        event.preventDefault();
        const previous = overlayTransitions.get(overlay);
        if (previous) {
          previous.timeline.kill();
          forgetAnimation(previous.timeline);
          branchAnimations.delete(previous.timeline);
        }
        const transition = { complete, timeline: null };
        const opening = phase === "open";
        transition.timeline = branchAnimation(gsap.timeline({
          defaults: { duration: opening ? 0.3 : 0.24, ease: opening ? "power3.out" : "power2.in" },
          onComplete: () => finishOverlayTransition(overlay, transition),
        }));
        overlayTransitions.set(overlay, transition);
        if (opening) {
          transition.timeline.fromTo(overlay, { y: 72, opacity: 0 }, { y: 0, opacity: 1 });
          transition.timeline.from(overlay.children, { y: 16, opacity: 0, stagger: 0.045, duration: 0.24 }, "<0.06");
        } else {
          transition.timeline.to(overlay.children, { y: 10, opacity: 0, stagger: 0.025, duration: 0.14 }, 0);
          transition.timeline.to(overlay, { y: 64, opacity: 0 }, 0.03);
        }
      }

      if (overlayEventTarget) {
        overlayEventTarget.addEventListener(OVERLAY_TRANSITION_EVENT, handleOverlayTransition);
        branchCleanups.push(() => overlayEventTarget.removeEventListener(OVERLAY_TRANSITION_EVENT, handleOverlayTransition));
      }

      if (conditions.desktop && conditions.finePointer) {
        const spotlight = document.querySelector(".pointer-spotlight");
        let spotlightFade = null;
        if (spotlight) {
          spotlight.dataset.pointerState = "idle";
          gsap.set(spotlight, { xPercent: -50, yPercent: -50, autoAlpha: 0 });
          const moveSpotlightX = gsap.quickTo(spotlight, "x", { duration: 0.32, ease: "power3.out" });
          const moveSpotlightY = gsap.quickTo(spotlight, "y", { duration: 0.32, ease: "power3.out" });

          function fadeSpotlight(autoAlpha) {
            if (spotlightFade) {
              spotlightFade.kill();
              forgetAnimation(spotlightFade);
              branchAnimations.delete(spotlightFade);
            }
            spotlightFade = branchAnimation(gsap.to(spotlight, { autoAlpha, duration: 0.2, overwrite: "auto" }));
          }

          function handlePointerMove(event) {
            moveSpotlightX(event.clientX);
            moveSpotlightY(event.clientY);
            if (spotlight.dataset.pointerState !== "active") {
              spotlight.dataset.pointerState = "active";
              fadeSpotlight(0.36);
            }
          }

          function handlePointerLeave() {
            spotlight.dataset.pointerState = "idle";
            fadeSpotlight(0);
          }

          window.addEventListener("pointermove", handlePointerMove, { passive: true });
          document.documentElement.addEventListener("pointerleave", handlePointerLeave);
          window.addEventListener("blur", handlePointerLeave);
          branchCleanups.push(() => {
            window.removeEventListener("pointermove", handlePointerMove);
            document.documentElement.removeEventListener("pointerleave", handlePointerLeave);
            window.removeEventListener("blur", handlePointerLeave);
            moveSpotlightX.tween.kill();
            moveSpotlightY.tween.kill();
            spotlight.dataset.pointerState = "idle";
            gsap.set(spotlight, { clearProps: "transform,opacity,visibility" });
          });
        }

        document.querySelectorAll(".project-card").forEach((card) => {
          card.dataset.motionTilt = "idle";
          gsap.set(card, { transformPerspective: 900, transformStyle: "preserve-3d" });
          const moveX = gsap.quickTo(card, "x", { duration: 0.28, ease: "power3.out" });
          const moveY = gsap.quickTo(card, "y", { duration: 0.28, ease: "power3.out" });
          const rotateX = gsap.quickTo(card, "rotationX", { duration: 0.28, ease: "power3.out" });
          const rotateY = gsap.quickTo(card, "rotationY", { duration: 0.28, ease: "power3.out" });

          function handleCardPointerMove(event) {
            const bounds = card.getBoundingClientRect();
            const horizontal = gsap.utils.clamp(-1, 1, (event.clientX - bounds.left - bounds.width / 2) / (bounds.width / 2));
            const vertical = gsap.utils.clamp(-1, 1, (event.clientY - bounds.top - bounds.height / 2) / (bounds.height / 2));
            moveX(horizontal * 4);
            moveY(vertical * 4);
            rotateX(vertical * -1.5);
            rotateY(horizontal * 1.5);
            card.dataset.motionTilt = "active";
          }

          function handleCardPointerLeave() {
            moveX(0);
            moveY(0);
            rotateX(0);
            rotateY(0);
            card.dataset.motionTilt = "idle";
          }

          card.addEventListener("pointermove", handleCardPointerMove, { passive: true });
          card.addEventListener("pointerleave", handleCardPointerLeave);
          branchCleanups.push(() => {
            card.removeEventListener("pointermove", handleCardPointerMove);
            card.removeEventListener("pointerleave", handleCardPointerLeave);
            moveX.tween.kill();
            moveY.tween.kill();
            rotateX.tween.kill();
            rotateY.tween.kill();
            card.dataset.motionTilt = "idle";
            gsap.set(card, { clearProps: "transform,transformStyle" });
          });
        });
      }

      return () => {
        if (branchDestroyed) return;
        branchDestroyed = true;
        for (const cleanup of branchCleanups.splice(0).reverse()) cleanup();
        for (const [overlay, transition] of [...overlayTransitions]) finishOverlayTransition(overlay, transition);
        for (const trigger of branchTriggers) {
          trigger.kill();
          ownedTriggers.delete(trigger);
        }
        for (const animation of branchAnimations) {
          animation.kill();
          forgetAnimation(animation);
        }
        clearFinalMotionStyles();
        resetFlowState();
        if (orbit) gsap.set("#cat-orbiter", { clearProps: "transform,opacity,visibility" });
      };
    },
  );

  function handleVisibilityChange() {
    if (document.hidden) {
      for (const animation of ownedAnimations) {
        if (!animation.scrollTrigger && animation.isActive()) {
          animation.pause();
          visibilityPaused.add(animation);
        }
      }
      for (const synchronize of visibilitySynchronizers) synchronize();
      return;
    }
    ScrollTrigger.refresh();
    for (const animation of visibilityPaused) {
      const mayResume = visibilityResumeGuards.get(animation);
      if (ownedAnimations.has(animation) && (!mayResume || mayResume())) animation.resume();
    }
    visibilityPaused.clear();
    for (const synchronize of visibilitySynchronizers) synchronize();
  }

  document.addEventListener("visibilitychange", handleVisibilityChange);

  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      media.revert();
      for (const trigger of ownedTriggers) trigger.kill();
      for (const animation of ownedAnimations) animation.kill();
      ownedTriggers.clear();
      ownedAnimations.clear();
      visibilityPaused.clear();
      visibilityResumeGuards.clear();
      visibilitySynchronizers.clear();
      root.dataset.motionLifecycle = "destroyed";
    },
  };
}
