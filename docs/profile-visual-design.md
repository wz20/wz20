# Creator Bento profile

Based on **Creator Bento Homepage**, BentoPreview in [Personal Homepage Skill by powerycy](https://github.com/shengjidaguai-china/personal-homepage-skill/blob/main/src/previews/creator.tsx). The actual gallery preview was inspected. Preserve its asymmetric yellow tile, dark canvas, rounded modules, and pink/cyan accents throughout the README. Attribution is retained in the profile footer.

## Assets and behavior

- assets/readme-bento-hero.png: default built-in image_gen, referencing the template preview and existing public cat avatar. The avatar itself is unchanged.
- assets/profile-project-{1..4}.svg: generated UI cards with actual project identity, language and stars.
- assets/profile-project-{1..4}-mobile.svg: mobile layouts selected at 600 px.
- Each project card is an actual link. Alt text and an expandable text directory retain accessible descriptions.
- The header links to the existing lab. Its pink/cyan tiles are decorative, not independent controls.
- No custom CSS or scripts execute in README. Old artwork remains unreferenced for history.
- New projects get data-driven cards automatically, with escaped and bounded text.
- The refresh workflow stages all generated cards together with the README and snapshot.

## Validation

GitHub Markdown API rendering; actual browser inspection at desktop/mobile widths with fresh reload; 11 focused tests for safety, data correspondence, responsive assets, new-project fallback, ordering, long text and workflow staging. The real refresh script was run against current GitHub repository and contribution data before publication.

## Image generation prompt

Default built-in image_gen; no local image CLI or API key.

Create a finished premium GitHub profile identity board, landscape aspect ratio 3:2, crisp polished graphic design. Image 1 is the EXACT template layout and palette reference (Creator Bento): very dark warm charcoal #15110a background, asymmetric tightly fitted grid with large rounded rectangles, huge warm yellow #ffe15a left tile, small dark right tile, pink #ff7ac8 and cyan #5cf4ff tiles, narrow consistent gutters. Faithfully develop this specific layout, do not turn it into a conventional banner or magazine illustration. Image 2 is character reference: the owner's recognizable silver tabby cat face, olive eyes. Build actual final graphic, no browser frame, no webpage mockup. Composition: top 12% black masthead with small white 'HUAJUAN / CREATIVE LAB' left and minimal four-point yellow star right. Main grid occupying 78%: left 53% huge yellow tile with giant expressive dark Chinese typography exact text '花卷' then 'AI 实验室', and smaller 2-line tagline '把想法' / '做成作品'; bottom-right of yellow tile a subtle black abstract orbit flourish. Right top large dark gray rounded tile with an exquisitely rendered playful 3D silver tabby cat bust looking at viewer, resting paws on tile bottom, tiny white label 'BUILDING IN PUBLIC'. Right bottom two equal tiles, pink and cyan: pink exact big label 'AGENT' and a crisp black linked-node symbol; cyan exact big label 'CREATE' and a crisp black four-point spark. Bottom 10% narrow dark strip with white text 'JAVA BACKEND   /   AI AGENT   /   VIBE CODING'. Huge readable text, flat beautiful high-contrast palette, no gradients except subtle cat modeling, no tiny paragraphs, no fake clickable buttons, no project screenshots, no badges, no neon, no additional words. Generous internal padding but compact coherent overall board. All outer edges dark; tactile 3D cat is the only non-flat element.
