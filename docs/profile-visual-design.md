# GitHub profile visual redesign

## Direction and source

The profile README adapts the Magazine Portfolio direction from [Personal Homepage Skill by powerycy](https://github.com/shengjidaguai-china/personal-homepage-skill). The actual React gallery was run and inspected alongside Cute Pixel Creator and Creator Bento. The adaptation uses a warm editorial masthead, large project media and concise captions. No website template runtime or dependencies are shipped to the profile.

The hero was generated with the default built-in image_gen tool using the existing public wz20 cat avatar as a character reference. Asset: `assets/readme-editorial-hero.png`. The existing avatar itself is unchanged. Full generation prompt:

> Use case: ads-marketing. Generate a finished, beautifully art-directed GitHub profile banner for 花卷 AI 实验室, landscape 3:1 ratio. Reference image is the user's cat avatar, use the recognizable silver tabby round face and olive eyes only, remove all existing neon space badge surroundings. Editorial magazine portfolio style inspired by warm paper, oversize black typography, terracotta and sage accents, subtle print texture. Left 60% spacious warm ivory paper: top small spaced masthead 'HUAJUAN / CREATIVE LAB'; main exact Chinese title on two lines '花卷' and 'AI 实验室', huge elegant bold readable Chinese typography, near-black; small clear subtitle '把 AI 想法，做成看得见的作品'. Right 40%: beautiful tactile paper-collage / clay-render silver tabby cat bust emerging from a terracotta arch, sage orb and one small warm yellow four-point star, understated dimensionality, refined and sophisticated not childish. Bottom tiny line 'AGENTS  /  TOOLS  /  VISUAL STORIES'. No fake buttons, no navigation UI, no charts, no project screenshots, no purple neon, no watermark, no extra text. Balanced generous margins, meticulously aligned magazine cover composition. This is brand artwork, not a screenshot of an application.

## Project media

Images come from the respective public project repositories. How It Moves uses an explicitly identified historical animation; Knowledge Cottage uses its application demo; Desktop Pet Delivery uses its disclosed concept cover, not an application screenshot; Harness uses its real CLI screenshot. External project media can change or become unavailable independently of this repository.

## Behavior

Project ordering, stars and language remain data-driven. Curated descriptions and image metadata are maintained by the refresh script. New projects without media remain readable text entries. Activity statistics remain accessible in a native details element; the SVG palette matches the editorial direction. The independent Pages site is outside this change.

## Validation

- GitHub Markdown API rendering was used for the preview, inside the existing GitHub page layout and styles.
- The preview removes GitHub's data-animated-image marker because the copied preview intentionally omits GitHub JavaScript. Production README does not contain that marker or any custom script.
- Relevant README and refresh tests pass, including future-project fallback, escaping, ordering, generated-content reproducibility and local assets.
- Browser checks at desktop and 390 px mobile widths include images, overflow and expandable activity.
- The source gallery's dependency install reported 13 audit findings (3 moderate, 10 high). These preview-only dependencies are not included in the profile; no unrelated dependency upgrades were performed.

