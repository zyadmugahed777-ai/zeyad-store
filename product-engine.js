(function () {
  const CART_KEY = "zfb.cart";
  const WISHLIST_KEY = "zfb.wishlist";
  const COMPARE_KEY = "zfb.compare";

  let currentProduct = null;
  let currentMedia = [];
  let currentMediaIndex = 0;
  let selectedColor = null;
  let selectedSize = null;

  function qs(id) {
    return document.getElementById(id);
  }

  function getProductIdFromUrl() {
    return new URLSearchParams(window.location.search).get("id");
  }

  function formatPrice(value) {
    if (window.ZFB_CURRENCY) return window.ZFB_CURRENCY.format(Number(value || 0));
    return `${Number(value || 0).toLocaleString("ar-SA")} ر.س`;
  }

  function getCategoryCode(product) {
    if (product.category) return product.category;
    return String(product.id || "gen").split("-")[0] || "gen";
  }

  function getCategoryLabel(code) {
    const map = {
      appl: "الأجهزة الكهربائية",
      fur: "الأثاث",
      bed: "غرف النوم",
      maj: "المجالس",
      kit: "المطابخ",
      sol: "الطاقة الشمسية",
      kid: "غرف الأطفال",
      gen: "منتجات مختارة"
    };
    return map[code] || "المنتجات";
  }

  function getCategoryLink(code) {
    const map = {
      appl: "appliances-catalog.html",
      fur: "furniture-catalog.html",
      bed: "bedrooms-catalog.html",
      maj: "majalis-catalog.html",
      kit: "kitchens-catalog.html",
      sol: "solar-catalog.html",
      kid: "kids-rooms.html",
      gen: "collections.html"
    };
    return map[code] || "collections.html";
  }

  function getProductById(id) {
    return (window.PRODUCTS_DB || []).find((item) => item.id === id) || null;
  }

  function getFallbackProduct() {
    return getProductById("appl-0017") || (window.PRODUCTS_DB || [])[0] || null;
  }

  function getDiscountPercent(product) {
    if (!product.oldPrice || Number(product.oldPrice) <= Number(product.price)) return 0;
    return Math.round(((Number(product.oldPrice) - Number(product.price)) / Number(product.oldPrice)) * 100);
  }

  function getSavingAmount(product) {
    if (!product.oldPrice || Number(product.oldPrice) <= Number(product.price)) return 0;
    return Number(product.oldPrice) - Number(product.price);
  }

  function buildMedia(product) {
    const gallery = Array.isArray(product.gallery) ? product.gallery.filter(Boolean) : [];
    const items = gallery.map((src) => ({ type: "image", src }));
    if (product.video && /\.(mp4|webm|ogg)$/i.test(product.video)) {
      items.push({ type: "video", src: product.video });
    }
    return items.length ? items : [{ type: "image", src: "assets/zeyad-product-sprite.png" }];
  }

  function showToast(message) {
    let toast = document.querySelector(".zfb-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "zfb-toast";
      toast.setAttribute("role", "status");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function addToCart(product, redirectToCheckout) {
    const qty = Math.max(1, parseInt(qs("product-qty-input")?.value || "1", 10));
    if (window.ZFB && window.ZFB.Cart) {
        window.ZFB.Cart.add(product, qty);
    }
    if (redirectToCheckout) {
      window.location.href = "checkout.html";
      return;
    }
    showToast("تمت إضافة المنتج إلى السلة");
  }

  function renderBreadcrumb(product) {
    const code = getCategoryCode(product);
    const label = getCategoryLabel(code);
    const link = getCategoryLink(code);
    qs("breadcrumb-category-link").textContent = label;
    qs("breadcrumb-category-link").href = link;
    qs("breadcrumb-title").textContent = product.title;
    qs("product-summary-breadcrumb-mini").textContent = `الرئيسية / ${label}`;
  }

  function renderSummary(product) {
    document.title = `${product.title} - زياد للتجارة`;
    qs("product-title").textContent = product.title;
    qs("product-brand").textContent = product.brand || "غير محدد";
    qs("product-brand-inline").textContent = product.brand || "غير محدد";
    qs("product-sku").textContent = product.sku || "غير محدد";
    qs("product-origin").textContent = product.origin || "غير محدد";
    qs("product-warranty").textContent = product.warranty || "غير محدد";
    qs("product-rating-value").textContent = product.rating || "0.0";
    qs("product-reviews-count").textContent = `(${Number(product.reviewsCount || 0).toLocaleString("ar-SA")})`;
    qs("product-current-price").textContent = formatPrice(product.price);
    qs("product-tax-note").textContent = "شامل الضريبة";

    const oldPrice = qs("product-old-price");
    const saving = qs("product-saving");
    const discountBadge = qs("product-discount-badge");
    const discount = getDiscountPercent(product);
    const savingAmount = getSavingAmount(product);

    if (discount > 0) {
      oldPrice.textContent = formatPrice(product.oldPrice);
      oldPrice.hidden = false;
      saving.textContent = `وفر ${formatPrice(savingAmount)}`;
      saving.hidden = false;
      discountBadge.textContent = `-${discount}%`;
      discountBadge.hidden = false;
    } else {
      oldPrice.hidden = true;
      saving.hidden = true;
      discountBadge.hidden = true;
    }

    const badges = [];
    if (product.isNew) badges.push('<span class="product-badge status">جديد</span>');
    if (product.isBestSeller) badges.push('<span class="product-badge status">الأكثر مبيعاً</span>');
    qs("product-status-badges").innerHTML = badges.join("");

    qs("product-stock-note").innerHTML = '<strong>متوفر في المخزون</strong>';
    qs("trust-shipping").innerHTML = `${product.shipping || "توصيل مجاني"}<br><small>${product.deliveryTime || "2-5 أيام عمل"}</small>`;
    qs("trust-warranty").innerHTML = `${product.warranty || "ضمان"}<br><small>مضمون</small>`;
  }

  function renderGalleryStage(index) {
    currentMediaIndex = index;
    const stage = qs("product-gallery-stage");
    const item = currentMedia[index];
    if (!item) return;

    if (item.type === "video") {
      stage.innerHTML = `<video controls playsinline preload="metadata"><source src="${item.src}"></video>`;
    } else {
      stage.innerHTML = `<img src="${item.src}" alt="${currentProduct.title}" />`;
    }

    document.querySelectorAll(".product-thumb").forEach((thumb, thumbIndex) => {
      thumb.classList.toggle("is-active", thumbIndex === index);
    });
  }

  function renderGallery(product) {
    currentMedia = buildMedia(product);
    const track = qs("product-thumbs-track");
    track.innerHTML = currentMedia
      .map((item, index) => {
        const isVideo = item.type === "video";
        const thumbSrc = isVideo ? (product.gallery && product.gallery[0]) || "assets/zeyad-product-sprite.png" : item.src;
        return `
          <button class="product-thumb ${index === 0 ? "is-active" : ""} ${isVideo ? "is-video" : ""}" type="button" data-media-index="${index}" aria-label="${isVideo ? "فيديو المنتج" : `صورة ${index + 1}`}" >
            <img src="${thumbSrc}" alt="${product.title}" />
          </button>
        `;
      })
      .join("");

    track.querySelectorAll(".product-thumb").forEach((thumb) => {
      thumb.addEventListener("click", () => renderGalleryStage(Number(thumb.dataset.mediaIndex)));
    });

    renderGalleryStage(0);
  }

  function renderOptions(product) {
    const colorsGroup = qs("product-colors-group");
    const colorsWrap = qs("product-colors");
    const selectedColorName = qs("selected-color-name");
    const sizesGroup = qs("product-sizes-group");
    const sizesWrap = qs("product-sizes");
    const selectedSizeName = qs("selected-size-name");

    const colors = Array.isArray(product.colors) ? product.colors.filter(Boolean) : [];
    const sizes = Array.isArray(product.sizes) ? product.sizes.filter(Boolean) : [];

    if (colors.length) {
      selectedColor = colors[0].name;
      colorsGroup.hidden = false;
      selectedColorName.textContent = selectedColor;
      colorsWrap.innerHTML = colors
        .map(
          (color, index) => `
            <button
              class="product-color-swatch ${index === 0 ? "is-active" : ""}"
              type="button"
              data-color-name="${color.name}"
              style="background:${color.hex};"
              aria-label="${color.name}">
            </button>`
        )
        .join("");

      colorsWrap.querySelectorAll(".product-color-swatch").forEach((btn) => {
        btn.addEventListener("click", () => {
          selectedColor = btn.dataset.colorName;
          selectedColorName.textContent = selectedColor;
          colorsWrap.querySelectorAll(".product-color-swatch").forEach((item) => item.classList.remove("is-active"));
          btn.classList.add("is-active");
        });
      });
    } else {
      colorsGroup.hidden = true;
    }

    if (sizes.length) {
      selectedSize = sizes[0];
      sizesGroup.hidden = false;
      selectedSizeName.textContent = selectedSize;
      sizesWrap.innerHTML = sizes
        .map(
          (size, index) => `
            <button class="product-size-chip ${index === 0 ? "is-active" : ""}" type="button" data-size-name="${size}">${size}</button>
          `
        )
        .join("");

      sizesWrap.querySelectorAll(".product-size-chip").forEach((btn) => {
        btn.addEventListener("click", () => {
          selectedSize = btn.dataset.sizeName;
          selectedSizeName.textContent = selectedSize;
          sizesWrap.querySelectorAll(".product-size-chip").forEach((item) => item.classList.remove("is-active"));
          btn.classList.add("is-active");
        });
      });
    } else {
      sizesGroup.hidden = true;
    }
  }

  function renderQuickSpecs(product) {
    const quickSpecs = qs("product-quick-specs");
    const specs = Array.isArray(product.specs) ? product.specs.slice(0, 6) : [];
    quickSpecs.innerHTML = specs
      .map(
        (spec) => `
          <div class="product-quick-meta">
            <dt>${spec.label}</dt>
            <dd>${spec.value}</dd>
          </div>
        `
      )
      .join("");
  }

  function renderTabs(product) {
    qs("product-description").innerHTML = `<p>${product.description || "لا يوجد وصف متاح حالياً لهذا المنتج."}</p>`;

    const specs = Array.isArray(product.specs) ? product.specs : [];
    qs("product-specs-table").innerHTML = specs
      .map(
        (spec) => `
          <div class="product-spec-row">
            <dt>${spec.label}</dt>
            <dd>${spec.value}</dd>
          </div>
        `
      )
      .join("");

    qs("product-reviews-placeholder").innerHTML = `
      <p>تقييم المنتج <strong>${product.rating || "0.0"}</strong> من أصل 5 بناءً على <strong>${Number(product.reviewsCount || 0).toLocaleString("ar-SA")}</strong> تقييم.</p>
      <p>سيتم عرض مراجعات العملاء التفصيلية هنا عند ربط نظام التقييمات الكامل.</p>
    `;

    const faq = Array.isArray(product.faq) ? product.faq : [];
    qs("product-faq-list").innerHTML = faq.length
      ? faq
          .map(
            (item) => `
              <details class="product-faq-item">
                <summary>${item.q}</summary>
                <p>${item.a}</p>
              </details>
            `
          )
          .join("")
      : `<p class="product-reviews-placeholder">لا توجد أسئلة شائعة متاحة حالياً لهذا المنتج.</p>`;

    document.querySelectorAll(".product-tab-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.tabTarget;
        document.querySelectorAll(".product-tab-btn").forEach((btn) => {
          btn.classList.remove("is-active");
          btn.setAttribute("aria-selected", "false");
        });
        document.querySelectorAll(".product-tab-panel").forEach((panel) => {
          panel.hidden = panel.id !== target;
        });
        button.classList.add("is-active");
        button.setAttribute("aria-selected", "true");
      });
    });
  }

  function createMiniCard(product) {
    const discount = getDiscountPercent(product);
    return `
      <article class="product-mini-card">
        <a class="product-mini-card-media" href="product.html?id=${encodeURIComponent(product.id)}" aria-label="${product.title}">
          ${discount > 0 ? `<span class="product-mini-card-badge">-${discount}%</span>` : ""}
          <img src="${(product.gallery && product.gallery[0]) || "assets/zeyad-product-sprite.png"}" alt="${product.title}" />
        </a>
        <div class="product-mini-card-body">
          <div class="product-mini-card-meta">${product.brand || "زياد للتجارة"}</div>
          <h3 class="product-mini-card-title"><a href="product.html?id=${encodeURIComponent(product.id)}">${product.title}</a></h3>
          <div class="product-mini-card-price">
            <strong>${formatPrice(product.price)}</strong>
            ${discount > 0 ? `<del>${formatPrice(product.oldPrice)}</del>` : ""}
          </div>
          <div class="product-mini-card-foot">
            <span class="product-mini-card-rating">★ ${product.rating || "0.0"}</span>
            <button class="product-mini-card-add" type="button" data-mini-add="${product.id}">أضف</button>
          </div>
        </div>
      </article>
    `;
  }

  function getRelatedProducts(product) {
    const db = window.PRODUCTS_DB || [];
    const category = getCategoryCode(product);
    const sameCategory = db.filter((item) => item.id !== product.id && getCategoryCode(item) === category).slice(0, 10);
    const similar = db.filter((item) => item.id !== product.id && item.brand === product.brand).slice(0, 10);
    const mayLike = db.filter((item) => item.id !== product.id && (item.isBestSeller || item.isNew)).slice(0, 10);
    return { sameCategory, similar, mayLike };
  }

  function renderCarousels(product) {
    const related = getRelatedProducts(product);
    qs("same-category-track").innerHTML = related.sameCategory.map(createMiniCard).join("");
    qs("similar-products-track").innerHTML = related.similar.map(createMiniCard).join("");
    qs("you-may-like-track").innerHTML = related.mayLike.map(createMiniCard).join("");

    document.querySelectorAll("[data-mini-add]").forEach((button) => {
      button.addEventListener("click", () => {
        const targetProduct = getProductById(button.dataset.miniAdd);
        if (targetProduct) addToCart(targetProduct, false);
      });
    });

    document.querySelectorAll("[data-carousel-prev], [data-carousel-next]").forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.dataset.carouselPrev || button.dataset.carouselNext;
        const track = qs(`${key}-track`);
        if (!track) return;
        const amount = 240;
        track.scrollBy({ left: button.dataset.carouselPrev ? -amount : amount, behavior: "smooth" });
      });
    });
  }

  function bindQuantity() {
    const input = qs("product-qty-input");
    qs("qty-increase-btn").addEventListener("click", () => {
      input.value = Math.min(99, (parseInt(input.value || "1", 10) || 1) + 1);
    });
    qs("qty-decrease-btn").addEventListener("click", () => {
      input.value = Math.max(1, (parseInt(input.value || "1", 10) || 1) - 1);
    });
  }

  function openLightbox() {
    const item = currentMedia[currentMediaIndex];
    if (!item) return;
    const lightbox = document.createElement("div");
    lightbox.className = "product-lightbox";
    lightbox.innerHTML = `
      <div class="product-lightbox-dialog">
        <button class="product-lightbox-close" type="button" aria-label="إغلاق">×</button>
        ${item.type === "video" ? `<video controls autoplay playsinline><source src="${item.src}"></video>` : `<img src="${item.src}" alt="${currentProduct.title}" />`}
      </div>
    `;
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox || event.target.classList.contains("product-lightbox-close")) {
        lightbox.remove();
      }
    });
    document.body.appendChild(lightbox);
  }

  function bindActions(product) {
    qs("add-to-cart-btn").addEventListener("click", () => addToCart(product, false));
    qs("buy-now-btn").addEventListener("click", () => addToCart(product, true));

    const wishlistButtons = [qs("wishlist-btn"), qs("gallery-favorite-btn")].filter(Boolean);
    if(window.ZFB && window.ZFB.Wishlist && window.ZFB.Wishlist.has(product.id)) {
        wishlistButtons.forEach((btn) => btn.classList.add("is-active"));
    }
    wishlistButtons.forEach((button) => {
      button.addEventListener("click", () => {
        let added = false;
        if(window.ZFB && window.ZFB.Wishlist) {
           added = window.ZFB.Wishlist.toggle(product);
        }
        wishlistButtons.forEach((btn) => btn.classList.toggle("is-active", added));
        showToast(added ? "تمت الإضافة للمفضلة" : "تمت الإزالة من المفضلة");
      });
    });

    const compareButtons = [qs("compare-btn"), qs("gallery-compare-btn")].filter(Boolean);
    if(window.ZFB && window.ZFB.Compare && window.ZFB.Compare.has(product.id)) {
        compareButtons.forEach((btn) => btn.classList.add("is-active"));
    }
    compareButtons.forEach((button) => {
      button.addEventListener("click", () => {
        let added = false;
        if(window.ZFB && window.ZFB.Compare) {
           added = window.ZFB.Compare.toggle(product);
        }
        compareButtons.forEach((btn) => btn.classList.toggle("is-active", added !== false));
        if(added !== false) {
           showToast(added ? "تمت الإضافة للمقارنة" : "تمت الإزالة من المقارنة");
        }
      });
    });

    [qs("share-btn"), qs("gallery-share-btn")].filter(Boolean).forEach((button) => {
      button.addEventListener("click", async () => {
        const url = window.location.href;
        if (navigator.share) {
          try {
            await navigator.share({ title: product.title, url });
          } catch (_) {}
        } else if (navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(url);
            showToast("تم نسخ رابط المنتج");
          } catch (_) {
            showToast("تعذر نسخ الرابط حالياً");
          }
        }
      });
    });

    qs("gallery-zoom-btn").addEventListener("click", openLightbox);
    qs("thumbs-prev-btn").addEventListener("click", () => {
      qs("product-thumbs-track").scrollBy({ left: -120, behavior: "smooth" });
    });
    qs("thumbs-next-btn").addEventListener("click", () => {
      qs("product-thumbs-track").scrollBy({ left: 120, behavior: "smooth" });
    });
  }

  function renderProduct(product) {
    currentProduct = product;
    renderBreadcrumb(product);
    renderSummary(product);
    renderGallery(product);
    renderOptions(product);
    renderQuickSpecs(product);
    renderTabs(product);
    renderCarousels(product);
    bindQuantity();
    bindActions(product);
  }

  function init() {
    const dbReady = Array.isArray(window.PRODUCTS_DB) && window.PRODUCTS_DB.length;
    if (!dbReady) {
      window.addEventListener("load", init, { once: true });
      return;
    }

    const productId = getProductIdFromUrl();
    const product = getProductById(productId) || getFallbackProduct();
    
    if (!product) {
      qs("product-loading").innerHTML = "<div style='text-align:center; padding: 40px; color: var(--error)'>المنتج غير موجود أو لم يعد متاحاً.</div>";
      return;
    }

    try {
      renderProduct(product);
    } catch (e) {
      console.error("Error rendering product:", e);
    } finally {
      if (qs("product-loading")) qs("product-loading").style.display = 'none';
      if (qs("product-page")) qs("product-page").hidden = false;
    }
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("zfb-currency-change", () => {
    if (currentProduct) {
      try { renderProduct(currentProduct); } catch (_) {}
    }
  });
})();