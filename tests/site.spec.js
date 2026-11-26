const { test, expect } = require("@playwright/test");

test("language selection updates page content and browser history", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByRole("button", { name: "Choose language" }).click();
  await page.getByRole("menuitemradio", { name: "Español" }).click();

  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.locator('[data-i18n="hero-title"]')).toHaveText("La esperanza crece cuando");
  await expect(page).toHaveURL(/\/\?lang=es$/);

  await page.goBack();

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('[data-i18n="hero-title"]')).toHaveText("Hope grows when we");
});

test("unsupported language parameters fall back to English", async ({ page }) => {
  await page.goto("/?lang=fr");

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("#language-code")).toHaveText("EN");
  await expect(page).toHaveTitle("Make a Smile ATL — Hope grows when we show up");
});

test("shareable Korean URLs load Korean copy", async ({ page }) => {
  await page.goto("/?lang=ko");

  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(page.locator("#language-code")).toHaveText("KO");
  await expect(page.locator('[data-i18n="hero-title"]')).toHaveText("함께할 때");
});

test("gallery lightbox wraps through photos and closes", async ({ page }) => {
  await page.goto("/");
  const lightbox = page.getByRole("dialog", { name: "Photo viewer" });

  await page.locator(".gallery-open").first().click();
  await expect(lightbox).toBeVisible();
  await expect(page.locator("#lightbox-caption")).toHaveText("A warm welcome");

  await page.getByRole("button", { name: "Previous photo" }).click();
  await expect(page.locator("#lightbox-caption")).toHaveText("Neighbors, together");

  await page.getByRole("button", { name: "Next photo" }).click();
  await expect(page.locator("#lightbox-caption")).toHaveText("A warm welcome");

  await page.getByRole("button", { name: "Close photo" }).click();
  await expect(lightbox).not.toBeVisible();
});

test("video iframe is created only after the visitor chooses to play", async ({ page }) => {
  await page.route("https://www.youtube-nocookie.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "" }),
  );
  await page.goto("/");

  await expect(page.locator("#film-frame")).toHaveCount(0);
  await page.getByRole("button", { name: "Play the Make a Smile ministry video" }).click();

  const frame = page.locator("#film-frame");
  await expect(frame).toHaveAttribute(
    "src",
    "https://www.youtube-nocookie.com/embed/kHAXeYi1O4Y?autoplay=1&rel=0",
  );
  await expect(frame).toHaveAttribute("title", "Make a Smile ministry video");
});

test("mobile navigation opens and closes after a link is selected", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const toggle = page.locator(".nav-toggle");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");

  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Our story" }).click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page).toHaveURL(/#story$/);
});

test("the ministry photo retains its intended proportions on mobile and desktop", async ({ page }) => {
  await page.goto("/");

  const photo = page.locator(".leader-image-wrap img");
  for (const width of [320, 390, 680, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const box = await photo.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width / box.height).toBeCloseTo(0.78, 2);
  }
});

test("the ministry photo stays compact and centered on mobile", async ({ page }) => {
  await page.goto("/");

  for (const width of [320, 390, 402, 430, 680]) {
    await page.setViewportSize({ width, height: 900 });
    const photo = await page.locator(".leader-image-wrap").boundingBox();
    const galleryPhoto = await page.locator('[data-gallery-index="8"]').boundingBox();
    expect(photo.width).toBeLessThanOrEqual(240);
    expect(photo.x + photo.width / 2).toBeCloseTo(width / 2, 0);
    expect(galleryPhoto.width).toBeLessThanOrEqual((width - 40) / 2);
  }
});

test("mobile gallery crops keep the important moments in view", async ({ page }) => {
  await page.goto("/");
  await page.locator(".gallery-open img").evaluateAll((images) =>
    Promise.all(images.map((image) => {
      image.loading = "eager";
      return image.decode();
    })),
  );

  // Vertical source-image bounds containing faces and gestures, from top to bottom.
  const subjects = [
    [0.20, 0.53], [0.20, 0.44], [0.27, 0.59], [0.13, 0.48],
    [0.08, 0.40], [0.10, 0.36], [0.25, 0.55], [0.18, 0.40],
    [0.20, 0.52], [0.17, 0.49], [0.16, 0.60],
  ];

  for (const width of [320, 390, 402, 430, 680]) {
    await page.setViewportSize({ width, height: 900 });
    const crops = await page.locator(".gallery-open img").evaluateAll((images) =>
      images.map((image) => {
        const { width, height } = image.getBoundingClientRect();
        const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
        const visibleHeight = height / scale / image.naturalHeight;
        const position = parseFloat(getComputedStyle(image).objectPosition.split(" ")[1]) / 100;
        const top = (1 - visibleHeight) * position;
        return { top, bottom: top + visibleHeight };
      }),
    );
    for (const [index, [top, bottom]] of subjects.entries()) {
      expect(crops[index].top, `photo ${index} at ${width}px`).toBeLessThanOrEqual(top);
      expect(crops[index].bottom, `photo ${index} at ${width}px`).toBeGreaterThanOrEqual(bottom);
    }
  }
});
