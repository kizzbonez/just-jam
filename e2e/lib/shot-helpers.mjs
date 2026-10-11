// Small page helpers for the screenshot run.

const PADDING = 12;

/**
 * The clip rectangle, in page coordinates, covering one or more rack units
 * found by their silkscreen names, with a little margin around them.
 */
export async function rackBox(page, labels) {
  const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
  const boxes = [];
  for (const label of labels) {
    const heading = page.getByRole("heading", { name: new RegExp(`^${label}`), level: 2 });
    const box = await heading.locator("xpath=ancestor::section[1]").boundingBox();
    if (box) boxes.push(box);
  }
  const left = Math.min(...boxes.map((box) => box.x)) + scroll.x;
  const top = Math.min(...boxes.map((box) => box.y)) + scroll.y;
  const right = Math.max(...boxes.map((box) => box.x + box.width)) + scroll.x;
  const bottom = Math.max(...boxes.map((box) => box.y + box.height)) + scroll.y;
  return {
    x: Math.max(0, left - PADDING),
    y: Math.max(0, top - PADDING),
    width: right - left + PADDING * 2,
    height: bottom - top + PADDING * 2,
  };
}

/** Forces lazily loaded images to load, so a full-page capture has no blanks. */
export async function loadAllImages(page) {
  await page.evaluate(async () => {
    const pending = [...document.images].map((image) => {
      image.loading = "eager";
      return image.complete ? null : new Promise((done) => image.addEventListener("load", done, { once: true }));
    });
    await Promise.all(pending);
  });
}

/** Spreads the players across the stereo field, as someone mixing would. */
export async function tidyMix(page) {
  const knobs = page.getByRole("slider", { name: / pan$/ });
  const count = await knobs.count();
  const moves = [
    ["ArrowLeft", 4],
    ["ArrowRight", 3],
  ];
  for (let index = 0; index < count; index++) {
    const [key, presses] = moves[index % moves.length];
    await knobs.nth(index).focus();
    for (let press = 0; press < presses; press++) await page.keyboard.press(key);
  }
  await page.evaluate(() => document.activeElement?.blur());
}
