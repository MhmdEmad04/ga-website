import { expect, test } from "@playwright/test";

test("homepage is readable, loads images and adapts without horizontal overflow", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /لكل يوم/ })).toBeVisible();
  await expect(page.locator(".product-card")).toHaveCount(8);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.evaluate(() => document.fonts.ready);
  expect(await page.locator('body').evaluate((element) => getComputedStyle(element).fontFamily)).toContain('Cairo Variable');
  for (const image of await page.locator('img').all()) await image.scrollIntoViewIfNeeded();
  await page.locator(".site-footer").scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator("img").evaluateAll((images) => images.every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("homepage.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("catalog search, filter, reset and category navigation work together", async ({ page }) => {
  await page.goto("/products");
  await page.getByRole("button", { name: "كروس بودي", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(2);
  await page.getByRole("button", { name: "الفلترة", exact: true }).click();
  await page.getByRole("slider").fill("530");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(page.locator(".product-card")).toContainText("جود");
  await page.getByRole("searchbox", { name: "ابحثي عن شنطة" }).fill("غير موجود");
  await expect(page.getByRole("heading", { name: "لسه ملقيناش الشنطة دي" })).toBeVisible();
  await page.getByRole("button", { name: "عرض كل الشنط", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(8);
  await page.locator("footer").getByRole("link", { name: "كروس بودي", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(2);
});

test("color selection survives navigation and cart survives refresh with flat shipping", async ({ page }) => {
  await page.goto("/products/laila?color=black");
  await expect(page.getByRole("radio", { name: "أسود", exact: true })).toBeChecked();
  await page.getByRole("button", { name: "زيادة الكمية", exact: true }).click();
  await page.getByRole("button", { name: "أضيفي للسلة", exact: true }).click();
  await page.getByRole("link", { name: "شاهدي السلة", exact: true }).click();
  await expect(page.locator(".cart-item")).toContainText("أسود");
  await expect(page.locator(".cart-item output")).toHaveText("2");
  await expect(page.locator('body')).not.toContainText('الشحن');
  await page.getByRole("button", { name: "زيادة كمية ليلى أسود" }).click();
  await page.getByRole('link', { name: 'إتمام الطلب', exact: true }).click();
  await page.getByRole("combobox", { name: "المحافظة", exact: true }).selectOption("القاهرة");
  await expect(page.locator(".summary-total")).toContainText("١٬٨٥٠ ج.م");
  await page.getByRole("combobox", { name: "المحافظة", exact: true }).selectOption("الجيزة");
  await expect(page.locator('.shipping-row')).toContainText('٨٠ ج.م');
  await page.getByRole("combobox", { name: "المحافظة", exact: true }).selectOption("الإسكندرية");
  await expect(page.locator(".summary-total")).toContainText("١٬٨٩٠ ج.م");
  await page.goto('/cart');
  await page.reload();
  await expect(page.locator(".cart-item output")).toHaveText("3");
  await page.getByRole("button", { name: "حذف ليلى أسود من السلة" }).click();
  await expect(page.getByRole("heading", { name: "سلتك مستنية حكاية." })).toBeVisible();
});

test("cart clamps persisted quantities and blocks adding beyond a variant stock", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("garbalia-preview-cart-v1", JSON.stringify([
    { productId: "01", color: "black", quantity: 999 },
    { productId: "01", color: "black", quantity: 10 },
    { productId: "bad-id", color: "camel", quantity: 2 },
    { productId: "01", color: "invalid", quantity: 1 },
  ])));
  await page.goto("/products/laila?color=black");
  await expect(page.getByRole("button", { name: "أضيفي للسلة", exact: true })).toBeDisabled();
  await expect(page.locator(".availability")).toHaveText("كل الكمية المتاحة موجودة في سلتك");
  await page.getByRole("radio", { name: "بيج", exact: true }).check();
  await expect(page.getByRole("button", { name: "أضيفي للسلة", exact: true })).toBeEnabled();
  await page.goto("/cart");
  await expect(page.locator(".cart-item")).toHaveCount(1);
  await expect(page.locator(".cart-item output")).toHaveText("30");
});

test("image dialog closes with Escape and missing products have a useful 404", async ({ page }) => {
  await page.goto("/products/laila");
  await page.getByRole("button", { name: "تكبير صورة شنطة ليلى" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "تكبير صورة شنطة ليلى" })).toBeFocused();
  await page.goto("/products/missing-product");
  await expect(page.getByRole("heading", { name: "الصفحة دي مش موجودة." })).toBeVisible();
});

test("mobile navigation opens, closes with Escape and navigates", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile navigation only");
  await page.goto("/");
  await page.getByRole("button", { name: "فتح القائمة" }).click();
  await expect(page.getByRole("navigation", { name: "قائمة الموبايل" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "فتح القائمة" })).toBeFocused();
  await page.getByRole("button", { name: "فتح القائمة" }).click();
  await page.getByRole("navigation", { name: "قائمة الموبايل" }).getByRole("link", { name: "تسوّقي الشنط" }).click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByRole("navigation", { name: "قائمة الموبايل" })).not.toBeVisible();
});
test('all eight products switch the shared photos and buy links with their color', async ({ page }) => {
  await page.goto('/products');
  const cards = page.locator('.product-card');
  for (let i = 0; i < 8; i++) {
    const card = cards.nth(i);
    for (const color of ['black', 'beige', 'camel']) {
      await card.locator('.swatch').nth(['black', 'beige', 'camel'].indexOf(color)).click();
      await expect(card.locator('.product-image img')).toHaveAttribute('src', new RegExp(`laila-${color}`));
      await expect(card.locator('.card-buy')).toHaveAttribute('href', new RegExp(`product=0${i + 1}&color=${color}&quantity=1`));
      await expect.poll(() => card.locator('.product-image img').evaluate((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)).toBe(true);
    }
  }
  await cards.first().locator('.product-image').click();
  await expect(page.getByRole('radio', { name: 'جملي', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'عرض صورة اللون بيج', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'بيج', exact: true })).toBeChecked();
  await expect(page.locator('.detail-image img')).toHaveAttribute('src', /laila-beige/);
});

test('direct buy keeps the cart and reviews selected color, quantity, address and shipping', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/products/nour?color=black');
  await page.getByRole('button', { name: 'أضيفي للسلة', exact: true }).click();
  await page.goto('/products/laila?color=camel');
  await page.getByRole('button', { name: 'زيادة الكمية', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('product.png'), fullPage: true });
  await page.getByRole('button', { name: 'اشتري الآن', exact: true }).click();
  await expect(page).toHaveURL(/checkout\?product=01&color=camel&quantity=2/);
  await expect(page.locator('.checkout-item')).toHaveCount(1);
  await expect(page.locator('.checkout-item')).toContainText('جملي · الكمية ٢');
  await expect(page.locator('.checkout-item img')).toHaveAttribute('src', /laila-camel/);
  await page.getByRole('button', { name: 'مراجعة الطلب', exact: true }).click();
  await expect(page.locator('.customer-review')).toHaveCount(0);
  await page.getByLabel('الاسم بالكامل').fill('عميلة تجريبية');
  await page.getByLabel('رقم الموبايل').fill('01012345678');
  await page.getByRole('combobox', { name: 'المحافظة', exact: true }).selectOption('القاهرة');
  await page.getByLabel('المدينة أو المنطقة').fill('مدينة نصر');
  await page.getByLabel('العنوان بالتفصيل').fill('١ شارع تجريبي، الدور الثاني');
  await expect(page.locator('.summary-total')).toContainText('١٬٢٦٠ ج.م');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('checkout.png'), fullPage: true });
  await page.getByRole('button', { name: 'مراجعة الطلب', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'راجعي تفاصيلك' })).toBeVisible();
  await expect(page.locator('.customer-review')).toContainText('إرسال الطلب');
  await page.getByRole('button', { name: 'تعديل البيانات' }).click();
  await expect(page.getByLabel('الاسم بالكامل')).toHaveValue('عميلة تجريبية');
  await page.goto('/cart');
  await expect(page.locator('.cart-item')).toHaveCount(1);
  await expect(page.locator('.cart-item')).toContainText('نور');
  expect(errors).toEqual([]);
});

test('shipping is only shown at checkout and invalid buy requests are rejected', async ({ page }) => {
  for (const path of ['/', '/products', '/products/laila', '/cart', '/contact']) {
    await page.goto(path);
    await expect(page.locator('body')).not.toContainText(/الشحن|التوصيل/);
    await expect(page.locator('a[href="/shipping"]')).toHaveCount(0);
  }
  await page.goto('/checkout');
  await expect(page.getByRole('heading', { name: 'اختاري شنطتك الأول.' })).toBeVisible();
  for (const query of ['product=01&color=black&quantity=31', 'product=01&color=red&quantity=1', 'product=01']) {
    await page.goto(`/checkout?${query}`);
    await expect(page.getByRole('heading', { name: 'الصفحة دي مش موجودة.' })).toBeVisible();
  }
});
