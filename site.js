(function () {
  const CART_KEY = "zfb.cart";
  const ORDER_KEY = "zfb.lastOrder";
  const WISHLIST_KEY = "zfb.wishlist";

  const paymentMethods = [
    { id: "kuraimi", label: "كريمي" },
    { id: "jaib", label: "جيب" },
    { id: "jawali", label: "جوالي" },
    { id: "floosk", label: "فلوسك" },
    { id: "one-cash", label: "ون كاش" },
    { id: "bank-transfer", label: "حوالة بنكية" },
    { id: "money-transfer", label: "حوالة مالية" },
    { id: "cash-on-delivery", label: "الدفع عند الاستلام" },
    { id: "gold", label: "ذهب" },
    { id: "direct-transfer", label: "تحويل مباشر" },
  ];

  function read(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch (_) {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent('zfb-state-change', { detail: { key, value: value } }));
  }

  function createId(prefix) {
    return `${prefix}-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  }

  function normalizePhone(value) {
    return String(value || "").replace(/[^\d+]/g, "");
  }

  function getApiError(data, fallback) {
    return data?.error || data?.message || fallback || "تعذر تنفيذ الطلب. حاول مرة أخرى.";
  }

  function normalizeApiAction(action) {
    const map = {
      "/api/submit-form": "/api/contact",
      "/api/book-appointment": "/api/appointments",
      "/api/request-consultation": "/api/consultations",
      "/api/request-design": "/api/designs",
      "/api/request-quote": "/api/quotes",
    };
    return map[action] || action;
  }

  function normalizeFormData(form) {
    const formData = new FormData(form);
    const action = form.getAttribute("action") || "";

    if (action === "/api/submit-form") {
      const firstName = formData.get("firstName");
      const lastName = formData.get("lastName");
      if (formData.get("contactName") && !formData.has("fullName")) formData.set("fullName", formData.get("contactName"));
      if (formData.get("contactPhone") && !formData.has("phone")) formData.set("phone", formData.get("contactPhone"));
      if (formData.get("contactSubject") && !formData.has("subject")) formData.set("subject", formData.get("contactSubject"));
      if ((firstName || lastName) && !formData.has("fullName")) formData.set("fullName", `${firstName || ""} ${lastName || ""}`.trim());
      if (!formData.has("subject")) formData.set("subject", "طلب من نموذج الموقع");
      if (!formData.has("message")) {
        const details = Array.from(formData.entries())
          .filter(([key]) => !["fullName", "message"].includes(key))
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n");
        formData.set("message", details || "طلب جديد من الموقع");
      }
    }

    return formData;
  }

  async function submitApiForm(form) {
    const formData = normalizeFormData(form);
    const hasFiles = Array.from(formData.values()).some((value) => (
      typeof File !== "undefined" && value instanceof File && value.name && value.size > 0
    ));
    const fetchOptions = {
      method: form.method?.toUpperCase() || "POST",
      headers: { Accept: "application/json" },
    };

    if (hasFiles) {
      fetchOptions.body = formData;
    } else {
      fetchOptions.headers["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify(Object.fromEntries(formData.entries()));
    }

    const response = await fetch(normalizeApiAction(form.getAttribute("action")), {
      ...fetchOptions,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) throw new Error(getApiError(data));
    return data;
  }

  function isYemeniPhone(value) {
    const phone = normalizePhone(value);
    return /^(?:\+?967)?7[01378]\d{7}$/.test(phone) || /^(?:\+?967)?[12]\d{6,8}$/.test(phone);
  }

  function ProductModel(input) {
    return {
      id: input.id || "",
      sku: input.sku || "",
      name: input.name || "",
      category: input.category || "",
      subcategory: input.subcategory || "",
      brand: input.brand || "",
      quantity: Math.max(1, Number(input.quantity) || 1),
      price: Number(input.price) || 0,
      discount: Number(input.discount) || 0,
      stock: input.stock || "",
      currency: input.currency || "YER",
    };
  }

  function CustomerModel(input) {
    const firstName = input.firstName || "";
    const lastName = input.lastName || "";
    return {
      id: input.id || createId("CUS"),
      firstName,
      lastName,
      name: input.name || `${firstName} ${lastName}`.trim(),
      phone: normalizePhone(input.phone),
      email: input.email || "",
      city: input.city || "",
      address: input.address || {},
      notes: input.notes || "",
    };
  }

  function CartModel(items) {
    const products = (items || []).map((item) => ProductModel(item));
    const subtotal = products.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discount = products.reduce((sum, item) => sum + item.discount * item.quantity, 0);
    return {
      id: createId("CART"),
      products,
      subtotal,
      discount,
      totalQuantity: products.reduce((sum, item) => sum + item.quantity, 0),
      currency: "YER",
    };
  }

  function OrderModel(input) {
    const cart = CartModel(input.products || []);
    const shipping = Number(input.shipping || 0);
    return {
      orderId: input.orderId || createId("ZFB"),
      customer: CustomerModel(input.customer || {}),
      products: cart.products,
      productIds: cart.products.map((item) => item.id),
      quantities: Object.fromEntries(cart.products.map((item) => [item.id, item.quantity])),
      prices: Object.fromEntries(cart.products.map((item) => [item.id, item.price])),
      discount: Number(input.discount ?? cart.discount) || 0,
      shipping,
      paymentMethod: input.paymentMethod || {},
      orderTotal: Number(input.orderTotal ?? cart.subtotal - cart.discount + shipping) || 0,
      createdAt: input.createdAt || new Date().toISOString(),
      status: input.status || "pending-confirmation",
      currency: input.currency || "YER",
      notes: input.notes || "",
      integrations: {
        whatsappBusinessReady: true,
        adminPanelReady: true,
        databaseReady: true,
      },
    };
  }

  window.ZFBBackend = {
    keys: { cart: CART_KEY, order: ORDER_KEY, wishlist: WISHLIST_KEY },
    models: { ProductModel, CartModel, OrderModel, CustomerModel },
  };

  function numberFromText(text) {
    const western = String(text || "")
      .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
      .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
    const value = parseFloat((western.match(/[\d,.]+/) || ["0"])[0].replace(/,/g, ""));
    return Number.isFinite(value) ? value : 0;
  }

  function productFromElement(source) {
    const card = source.closest("[data-product-id], .product-card, .premium-product-page, .cart-item, .summary-product");
    const title = card?.querySelector("h1, h3, h4")?.textContent?.trim() || "منتج من زيد للتجارة";
    const priceText =
      card?.dataset.price ||
      card?.querySelector("[data-field='price'], .current, .price strong, .cart-item-price strong, .summary-product-price")?.textContent ||
      "0";
    const id =
      card?.dataset.productId ||
      title
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48) ||
      "zfb-product";
    return {
      id,
      sku: card?.dataset.sku || "",
      title,
      name: title,
      quantity: Math.max(1, parseInt(card?.querySelector("input[type='number']")?.value || "1", 10)),
      price: numberFromText(priceText),
      discount: numberFromText(card?.dataset.discount || card?.querySelector(".discount, .saving")?.textContent || "0"),
      priceText: priceText.trim(),
      category: card?.dataset.category || document.body.dataset.category || "",
      subcategory: card?.dataset.subcategory || "",
      brand: card?.dataset.brand || card?.querySelector("[data-field='brand']")?.textContent?.trim() || "",
      stock: card?.dataset.stock || card?.querySelector(".stock span, [data-field='availability']")?.textContent?.trim() || "",
      currency: card?.dataset.currency || "YER",
      image: card?.querySelector("img")?.getAttribute("src") || "",
      gallery: card?.querySelector("img")?.getAttribute("src") ? [card.querySelector("img").getAttribute("src")] : [],
    };
  }

  window.productFromElement = productFromElement;

  function cartTotal(cart) {
    return cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
  }

  function cartCount() {
    if (window.ZFB && window.ZFB.Cart) return window.ZFB.Cart.count();
    return read(CART_KEY, []).reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  }

  function updateCartBadges() {
    const count = cartCount();
    document.querySelectorAll("#floating-cart-count, .cart b").forEach((node) => {
      node.textContent = count;
      node.setAttribute("data-order", String(count));
    });
  }

  window.updateCartBadges = updateCartBadges;

  function addItem(source) {
    const item = productFromElement(source);
    if (window.ZFB && window.ZFB.Cart) {
      window.ZFB.Cart.add(item, item.quantity || 1);
    } else {
      const cart = read(CART_KEY, []);
      const existing = cart.find((entry) => entry.id === item.id);
      if (existing) existing.quantity += item.quantity;
      else cart.push(item);
      write(CART_KEY, cart);
    }
    updateCartBadges();
    return item;
  }

  window.addToCart = function (button, event) {
    event?.preventDefault();
    event?.stopPropagation();
    
    const original = button.innerHTML;
    
    try {
        const item = addItem(button);
        if(!item || !item.id) throw new Error("Product data missing");
        
        // Visual Feedback
        button.setAttribute("aria-live", "polite");
        button.innerHTML = "تمت الإضافة";
        button.style.backgroundColor = "#16a34a";
        
        // Bounce animation for the cart icon
        const cartIcon = document.querySelector('.cart svg, .cart-icon');
        if (cartIcon) {
            cartIcon.style.transform = 'scale(1.2)';
            setTimeout(() => { cartIcon.style.transform = 'scale(1)'; }, 200);
        }
    } catch(err) {
        console.error("Cart Error:", err);
        button.innerHTML = "خطأ";
        button.style.backgroundColor = "#ef4444";
    }

    setTimeout(() => {
        button.innerHTML = original;
        button.style.backgroundColor = "";
    }, 1200);
  };

  function setupSearch() {
    document.querySelectorAll("form.search").forEach((form) => {
      if (!form.querySelector("[name='q']")) {
        const input = form.querySelector("input[type='search']");
        if (input) input.name = "q";
      }
      form.action = "search.html";
      form.method = "get";
      form.addEventListener("submit", (event) => {
        const value = form.querySelector("input[type='search']")?.value.trim();
        if (!value) event.preventDefault();
      });
    });
  }

  function renderCheckoutSummary() {
    const container = document.getElementById("checkout-items-container");
    if (!container) return;
    
    const cart = read(CART_KEY, []);
    container.innerHTML = "";
    
    if (cart.length === 0) {
       container.innerHTML = "<div style='text-align:center; padding: 20px;'>السلة فارغة</div>";
    } else {
       cart.forEach(item => {
          const div = document.createElement('div');
          div.className = 'summary-product';
          div.setAttribute('data-product-id', item.id || item.sku || "");
          div.innerHTML = `
            <img src="${item.image || (item.gallery && item.gallery[0]) || 'assets/placeholder.png'}" alt="${item.title}">
            <div class="summary-product-info">
              <h3>${item.title}</h3>
              <p class="summary-product-price">${item.price} ر.س</p>
            </div>
            <span class="summary-product-quantity">x${item.quantity || 1}</span>
          `;
          container.appendChild(div);
       });
    }
    
    const subtotal = cartTotal(cart);
    const totalsContainer = document.querySelector(".summary-totals");
    if (totalsContainer) {
       const lines = totalsContainer.querySelectorAll(".summary-line");
       if (lines.length >= 3) {
          lines[0].querySelector("span:last-child").textContent = subtotal + " ر.س";
          lines[0].querySelector("span:first-child").textContent = `المجموع الفرعي (${cart.reduce((s, i) => s + (Number(i.quantity)||1), 0)})`;
          
          const deliveryCard = document.querySelector(".delivery-card.selected");
          let deliveryCost = 0;
          if (deliveryCard) {
            deliveryCost = numberFromText(deliveryCard.querySelector(".delivery-card-price")?.textContent);
          }
          
          const total = subtotal + deliveryCost;
          lines[2].querySelector("span:last-child").textContent = total + " ر.س";
       }
    }
  }
  window.renderCheckoutSummary = renderCheckoutSummary;

  function setupSelectableCards(selector) {
    document.querySelectorAll(selector).forEach((card) => {
      card.addEventListener("click", () => {
        const group = card.parentElement;
        group.querySelectorAll(selector).forEach((item) => {
          item.classList.remove("selected");
          item.setAttribute("aria-checked", "false");
        });
        card.classList.add("selected");
        card.setAttribute("aria-checked", "true");
        if (window.renderCheckoutSummary) window.renderCheckoutSummary();
      });
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          card.click();
        }
      });
    });
  }

  function setupPaymentMethods() {
    const notesSection = document.querySelector("#notes-title")?.closest(".checkout-section");
    if (!notesSection || document.querySelector(".payment-options")) return;
    const section = document.createElement("section");
    section.className = "checkout-section";
    section.setAttribute("aria-labelledby", "payment-title");
    section.innerHTML = `
      <div class="section-label">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
        <h2 id="payment-title">طريقة الدفع</h2>
      </div>
      <div class="payment-options" role="radiogroup" aria-label="طريقة الدفع">
        ${paymentMethods
          .map(
            (method, index) => `
          <div class="delivery-card payment-card${index === 0 ? " selected" : ""}" role="radio" aria-checked="${index === 0 ? "true" : "false"}" tabindex="0" data-payment-method="${method.id}" data-order="payment-method">
            <div class="delivery-radio"></div>
            <div class="delivery-card-body">
              <strong>${method.label}</strong>
              <span>سيتم تأكيد تفاصيل الدفع مع فريق المبيعات بعد إنشاء الطلب</span>
            </div>
          </div>`
          )
          .join("")}
      </div>
      <p class="form-hint">لا يتم تحصيل أي مبلغ داخل الموقع حالياً. يتم تجهيز الطلب فقط للربط لاحقاً مع واتساب بزنس أو لوحة الإدارة أو قاعدة البيانات.</p>
    `;
    notesSection.before(section);
    setupSelectableCards(".payment-card");
  }

  function setInvalid(field, message) {
    field.setAttribute("aria-invalid", "true");
    let error = field.parentElement.querySelector(".field-error");
    if (!error) {
      error = document.createElement("p");
      error.className = "field-error";
      field.parentElement.appendChild(error);
    }
    error.textContent = message;
  }

  function clearInvalid(field) {
    field.removeAttribute("aria-invalid");
    field.parentElement.querySelector(".field-error")?.remove();
  }

  function getInput(id) {
    return document.getElementById(id);
  }

  function normalizePaymentMethodId(id) {
    return {
      jeeb: "jaib",
      floosak: "floosk",
      cod: "cash-on-delivery",
    }[id] || id || "";
  }

  function getSelectedPaymentMethod() {
    const selectedCard = document.querySelector(".payment-card.selected");
    if (selectedCard) {
      return {
        id: selectedCard.dataset.paymentMethod || "",
        label: selectedCard.querySelector("strong")?.textContent.trim() || "",
      };
    }

    const select = getInput("payment-method");
    const id = normalizePaymentMethodId(select?.value);
    return {
      id,
      label: select?.selectedOptions?.[0]?.textContent.trim() || "",
    };
  }

  function validateCheckout() {
    const required = ["first-name", "last-name", "phone", "city", "district"];
    if (getInput("payment-method")) required.push("payment-method");
    let valid = true;
    required.forEach((id) => {
      const field = getInput(id);
      if (!field) return;
      if (!field.value.trim()) {
        valid = false;
        setInvalid(field, "هذا الحقل مطلوب لإكمال الطلب");
      } else {
        clearInvalid(field);
      }
    });
    const phone = getInput("phone");
    if (phone && phone.value.trim() && !isYemeniPhone(phone.value)) {
      valid = false;
      setInvalid(phone, "أدخل رقم هاتف صحيح للتواصل");
    }
    return valid;
  }

  function buildOrderObject() {
    const cart = read(CART_KEY, []);
    const products = cart.length
      ? cart
      : Array.from(document.querySelectorAll(".summary-product")).map((item) => productFromElement(item));
    const selectedDelivery = document.querySelector(".delivery-options .delivery-card.selected");
    const selectedPayment = getSelectedPaymentMethod();
    const deliveryCost = numberFromText(selectedDelivery?.querySelector(".delivery-card-price")?.textContent);
    const subtotal = cartTotal(products);
    const discounts = products.reduce((sum, item) => sum + (Number(item.discount) || 0), 0);
    const order = OrderModel({
      customer: {
        firstName: getInput("first-name")?.value.trim() || "",
        lastName: getInput("last-name")?.value.trim() || "",
        phone: getInput("phone")?.value.trim() || "",
        email: getInput("email")?.value.trim() || "",
        city: getInput("city")?.value || "",
        address: {
          district: getInput("district")?.value.trim() || "",
          detail: getInput("address-detail")?.value.trim() || "",
        },
      },
      products,
      paymentMethod: selectedPayment,
      shipping: deliveryCost,
      discount: discounts,
      orderTotal: subtotal - discounts + deliveryCost,
      notes: getInput("notes")?.value.trim() || "",
    });
    return {
      ...order,
      orderedAt: order.createdAt,
      city: order.customer.city,
      address: order.customer.address,
      delivery: {
        method: selectedDelivery?.querySelector("strong")?.textContent.trim() || "",
        cost: deliveryCost,
      },
      subtotal,
      discounts: order.discount,
      deliveryCost,
      total: order.orderTotal,
      customerNotes: order.notes,
    };
  }


  function setupCheckout() {
    setupSelectableCards(".delivery-card");
    setupPaymentMethods();
    
    renderCheckoutSummary();
    window.addEventListener("cartUpdated", renderCheckoutSummary);

    // Auto-prefill if customer is logged in
    if (window.ZFB_AUTH && window.ZFB_AUTH.isLoggedIn()) {
      const user = window.ZFB_AUTH.getUser();
      if (user) {
        if (user.firstName && getInput("first-name") && !getInput("first-name").value) getInput("first-name").value = user.firstName;
        if (user.lastName && getInput("last-name") && !getInput("last-name").value) getInput("last-name").value = user.lastName;
        if (user.phone && getInput("phone") && !getInput("phone").value) getInput("phone").value = user.phone;
        if (user.email && getInput("email") && !getInput("email").value) getInput("email").value = user.email;
        if (user.city && getInput("city") && !getInput("city").value) getInput("city").value = user.city;
        if (user.district && getInput("district") && !getInput("district").value) getInput("district").value = user.district;
        if (user.addressDetail && getInput("address-detail") && !getInput("address-detail").value) getInput("address-detail").value = user.addressDetail;
      }
    }

    ["first-name", "last-name", "phone", "email", "city", "district", "address-detail", "notes", "payment-method"].forEach((id) => {
      const field = getInput(id);
      if (field && !field.name) field.name = id.replace(/-/g, "_");
      field?.addEventListener("input", () => clearInvalid(field));
      field?.addEventListener("change", () => clearInvalid(field));
    });
    const placeOrder = document.querySelector(".btn-place-order");
    if (!placeOrder) return;
    placeOrder.setAttribute("data-order", "submit");
    placeOrder.addEventListener("click", async (event) => {
      event.preventDefault();
      if (!validateCheckout()) {
        document.querySelector("[aria-invalid='true']")?.focus();
        return;
      }
      const order = buildOrderObject();
      const original = placeOrder.innerHTML;
      placeOrder.disabled = true;
      placeOrder.setAttribute("aria-busy", "true");
      placeOrder.innerHTML = "جارٍ إنشاء الطلب...";
      try {
        const payload = {
          customer: {
            firstName: order.customer.firstName,
            lastName: order.customer.lastName,
            phone: order.customer.phone,
            email: order.customer.email,
            city: order.customer.city,
            district: order.customer.address?.district || "",
            addressDetail: order.customer.address?.detail || "",
          },
          items: order.products.map((item) => ({
            id: item.id || item.sku,
            quantity: item.quantity || 1,
          })),
          paymentMethod: order.paymentMethod?.id || order.paymentMethod?.label || "cash-on-delivery",
          deliveryMethod: order.delivery?.method || "",
          notes: order.customerNotes || order.notes || "",
        };
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) throw new Error(getApiError(data));
        order.orderId = data.data?.orderId || order.orderId;
        order.status = data.data?.status || order.status;
        order.backendSynced = true;
        write(ORDER_KEY, order);
        localStorage.removeItem(CART_KEY);
        window.dispatchEvent(new CustomEvent("zfb-state-change", { detail: { key: CART_KEY, value: [] } }));
        window.location.href = `confirmation.html?order=${encodeURIComponent(order.orderId)}`;
      } catch (error) {
        setInvalid(getInput("phone") || placeOrder, error.message || "تعذر إنشاء الطلب في قاعدة البيانات");
      } finally {
        placeOrder.disabled = false;
        placeOrder.removeAttribute("aria-busy");
        placeOrder.innerHTML = original;
      }
    });
  }

  function setupConfirmation() {
    if (!document.querySelector(".confirmation-page")) return;
    const order = read(ORDER_KEY, null);
    if (!order) return;
    document.querySelector(".order-ref strong").textContent = `#${order.orderId}`;
    const total = document.querySelector(".confirm-order-total strong");
    if (total) {
      if (order.total && window.ZFB_CURRENCY) {
        total.textContent = window.ZFB_CURRENCY.format(order.total);
      } else if (order.total) {
        total.textContent = `${order.total.toLocaleString("ar")} ر.س`;
      }
    }
    const count = document.querySelector(".confirm-order-head span");
    if (count) count.textContent = `${order.products.length} منتجات`;
  }

  function setupTrackOrder() {
    const form = document.getElementById("trackForm");
    if (!form) return;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const order = read(ORDER_KEY, null);
      const phoneField = form.querySelector("input[type='tel'], input[name='phone'], #phone");
      const orderField = form.querySelector("input[name='orderNumber'], input[name='order'], #order-number, #orderNumber");
      const phone = normalizePhone(phoneField?.value || order?.customer?.phone || "");
      form.querySelector(".form-success, .form-error")?.remove();
      const result = document.createElement("div");
      result.className = "form-success";
      result.setAttribute("role", "status");
      try {
        if (!phone) throw new Error("أدخل رقم الهاتف المستخدم في الطلب.");
        const response = await fetch(`/api/orders/track/${encodeURIComponent(phone)}`, { headers: { Accept: "application/json" } });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) throw new Error(getApiError(data));
        const requestedOrder = String(orderField?.value || "").trim().replace(/^#/, "");
        const orders = Array.isArray(data.data) ? data.data : [];
        const matched = requestedOrder ? orders.filter((item) => String(item.order_id).replace(/^#/, "") === requestedOrder) : orders;
        result.textContent = matched.length
          ? `حالة الطلب ${matched[0].order_id}: ${matched[0].status}.`
          : "لم نجد طلباً مطابقاً لهذا الرقم والهاتف. تأكد من البيانات أو تواصل معنا.";
      } catch (error) {
        result.className = "form-error";
        result.textContent = error.message || "تعذر التحقق من حالة الطلب الآن.";
      }
      form.appendChild(result);
    });
  }

  function validateField(field) {
    clearInvalid(field);
    if (field.required && !String(field.value || "").trim()) {
      setInvalid(field, "هذا الحقل مطلوب");
      return false;
    }
    if (field.type === "email" && field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
      setInvalid(field, "أدخل بريد إلكتروني صحيح");
      return false;
    }
    if (field.type === "tel" && field.value && !isYemeniPhone(field.value)) {
      setInvalid(field, "أدخل رقم هاتف يمني صحيح");
      return false;
    }
    if (field.type === "number" && Number(field.value) < Number(field.min || 1)) {
      setInvalid(field, "أدخل كمية صحيحة");
      return false;
    }
    return true;
  }

  function validateForm(form) {
    const fields = Array.from(form.querySelectorAll("input, select, textarea"));
    const valid = fields.map((field) => validateField(field)).every(Boolean);
    if (!valid) fields.find((field) => field.getAttribute("aria-invalid") === "true")?.focus();
    return valid;
  }

  function setupForms() {
    document.querySelectorAll("form.subscribe-row").forEach((form) => {
      form.removeAttribute("onsubmit");
      form.action = "/api/newsletter";
      form.method = "POST";
      form.name = form.name || "newsletter-form";
      const email = form.querySelector("input[type='email']");
      if (email) {
        email.name = "email";
        email.required = true;
      }
    });

    document.querySelectorAll("form").forEach((form) => {
      form.querySelectorAll("input, select, textarea").forEach((field) => {
        field.addEventListener("input", () => clearInvalid(field));
        field.addEventListener("change", () => clearInvalid(field));
      });
    });

    document.querySelectorAll("form[action^='/api/']").forEach((form) => {
      if (form.id === "trackForm") return;
      if ((form.getAttribute("action") || "").includes("/api/calculate-")) return;
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!validateForm(form) || !form.checkValidity()) {
          form.reportValidity();
          return;
        }
        const submitter = form.querySelector("button[type='submit'], input[type='submit']");
        const original = submitter?.tagName === "BUTTON" ? submitter.innerHTML : submitter?.value;
        let message = form.querySelector(".form-success");
        if (!message) {
          message = document.createElement("p");
          message.className = "form-success";
          message.setAttribute("role", "status");
          form.appendChild(message);
        }
        try {
          if (submitter) {
            submitter.disabled = true;
            submitter.setAttribute("aria-busy", "true");
            if (submitter.tagName === "BUTTON") submitter.innerHTML = "جارٍ الإرسال...";
            else submitter.value = "جارٍ الإرسال...";
          }
          const data = await submitApiForm(form);
          message.className = "form-success";
          message.textContent = data.message || "تم إرسال الطلب بنجاح.";
          form.reset();
        } catch (error) {
          message.className = "form-error";
          message.textContent = error.message || "تعذر إرسال الطلب. حاول مرة أخرى.";
        } finally {
          if (submitter) {
            submitter.disabled = false;
            submitter.removeAttribute("aria-busy");
            if (submitter.tagName === "BUTTON") submitter.innerHTML = original;
            else submitter.value = original;
          }
        }
      });
    });
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

  function setupUtilityActions() {
    document.querySelectorAll("[data-action='share-product']").forEach((button) => {
      button.addEventListener("click", async () => {
        const title = document.querySelector("h1")?.textContent.trim() || document.title;
        const url = window.location.href;
        if (navigator.share) {
          await navigator.share({ title, url }).catch(() => {});
        } else {
          await navigator.clipboard?.writeText(url).catch(() => {});
          showToast("تم نسخ رابط المنتج");
        }
      });
    });

    document.querySelectorAll("[data-action='zoom-product']").forEach((button) => {
      button.addEventListener("click", () => {
        const source = document.querySelector(".gallery-main .photo, .gallery-main img");
        if (!source) return;
        const overlay = document.createElement("div");
        overlay.className = "zfb-lightbox";
        overlay.tabIndex = -1;
        overlay.innerHTML = `<button type="button" aria-label="إغلاق">×</button><div class="zfb-lightbox-media">${source.outerHTML}</div>`;
        overlay.querySelector("button").addEventListener("click", () => overlay.remove());
        overlay.addEventListener("click", (event) => {
          if (event.target === overlay) overlay.remove();
        });
        document.body.appendChild(overlay);
        overlay.focus();
      });
    });

    document.querySelectorAll("[data-action='product-360']").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelector(".gallery-thumbnails")?.scrollIntoView({ behavior: "smooth", block: "center" });
        document.querySelectorAll(".thumb").forEach((thumb, index) => {
          setTimeout(() => thumb.classList.toggle("active", index === 0), index * 60);
        });
        showToast("يمكنك استعراض زوايا المنتج من الصور المصغرة");
      });
    });

    document.querySelectorAll("[data-action='product-video']").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelector(".premium-details-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
        showToast("تفاصيل المنتج تعرض الحجم والخامة والاستخدام بوضوح");
      });
    });

    document.querySelectorAll("[data-action='voice-search'], [data-action='image-search']").forEach((button) => {
      button.addEventListener("click", () => {
        const input = document.querySelector(".large-search-input, form.search input[type='search']");
        input?.focus();
        showToast(button.dataset.action === "voice-search" ? "اكتب ما تبحث عنه وسنقترح النتائج فوراً" : "صف المنتج أو اكتب اسمه للبحث عنه");
      });
    });

    document.querySelectorAll(".thumb:not([data-action])").forEach((button) => {
      button.addEventListener("click", () => {
        const main = document.querySelector(".gallery-main .photo");
        const thumbPhoto = button.querySelector(".photo");
        if (main && thumbPhoto) main.setAttribute("style", thumbPhoto.getAttribute("style") || "");
        button.parentElement.querySelectorAll(".thumb").forEach((thumb) => thumb.classList.remove("active"));
        button.classList.add("active");
      });
    });

    document.querySelectorAll(".thumb-nav").forEach((button) => {
      button.addEventListener("click", () => {
        const thumbs = button.closest(".gallery-thumbnails");
        thumbs?.scrollBy({ top: button.classList.contains("up") ? -80 : 80, behavior: "smooth" });
      });
    });

    document.querySelectorAll(".tabs button, .chip-row button, .filter-chip, .filter-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const group = button.parentElement;
        group?.querySelectorAll("button").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        button.setAttribute("aria-pressed", "true");
      });
    });

    document.querySelectorAll("button").forEach((button) => {
      const hasInlineAction = button.getAttribute("onclick") || button.type === "submit" || button.type === "reset";
      const hasKnownAction =
        hasInlineAction ||
        button.dataset.action ||
        button.matches(".wish, .btn-wishlist, .btn-add-cart, .btn-add-cart-mini, .btn-remove-item, .btn-save-later, .delivery-card, .payment-card, .thumb, .thumb-nav, .tabs button, .chip-row button, .filter-chip, .filter-btn");
      if (hasKnownAction || button.dataset.boundFallback) return;
      button.dataset.boundFallback = "true";
      button.addEventListener("click", () => {
        button.setAttribute("aria-pressed", button.getAttribute("aria-pressed") === "true" ? "false" : "true");
        showToast("تم تحديث الاختيار");
      });
    });
  }

  function setupProductActions() {
    document.querySelectorAll(".product-card").forEach((card, index) => {
      if (!card.dataset.productId) card.dataset.productId = `zfb-product-${index + 1}`;
      if (!card.dataset.price) card.dataset.price = String(numberFromText(card.querySelector(".price strong")?.textContent));
      if (!card.dataset.stock) card.dataset.stock = card.querySelector(".stock span")?.textContent.trim() || "available";
      if (!card.dataset.category) card.dataset.category = document.body.dataset.category || "store";
    });
    document.querySelectorAll(".wish, .btn-wishlist").forEach((button) => {
      button.setAttribute("aria-pressed", "false");
    });
    document.querySelectorAll(".btn-add-cart").forEach((button) => {
      if (button.dataset.boundAdd) return;
      button.dataset.boundAdd = "true";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        addItem(button);
        window.location.href = button.classList.contains("btn-buy-now") ? "checkout.html" : "cart.html";
      });
    });
  }

  function setupQuantityButtons() {
    document.querySelectorAll(".qty-controls, .cart-qty").forEach((box) => {
      const input = box.querySelector("input");
      const valueNode = box.querySelector("span");
      box.querySelectorAll("button").forEach((button) => {
        button.addEventListener("click", () => {
          const current = parseInt(input?.value || valueNode?.textContent || "1", 10) || 1;
          const next = button.textContent.trim() === "+" ? current + 1 : Math.max(1, current - 1);
          if (input) input.value = next;
          if (valueNode) valueNode.textContent = next;
        });
      });
    });
    document.querySelectorAll(".btn-remove-item").forEach((button) => {
      button.addEventListener("click", () => {
        button.closest(".cart-item")?.remove();
        if (!document.querySelector(".cart-item")) {
          document.querySelector(".cart-empty").style.display = "";
          document.querySelector(".cart-layout").style.display = "none";
        }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupSearch();
    setupProductActions();
    setupQuantityButtons();
    setupCheckout();
    setupConfirmation();
    setupTrackOrder();
    setupForms();
    setupUtilityActions();
    updateCartBadges();
  });
})();
