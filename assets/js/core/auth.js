/**
 * ZFB Core Customer Authentication System
 * Handles frictionless Guest-First Authentication, Session Management, and Data Merging.
 */
(function () {
  const USER_KEY = 'zfb_user';
  const CART_KEY = 'zfb.cart';
  const WISHLIST_KEY = 'zfb.wishlist';

  function getUser() {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (_) {
      return null;
    }
  }

  function isLoggedIn() {
    const user = getUser();
    return !!(user && user.phone);
  }

  function saveUser(user) {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      window.dispatchEvent(new CustomEvent('zfb-auth-change', { detail: { user } }));
      window.dispatchEvent(new CustomEvent('zfb-state-change', { detail: { key: USER_KEY, value: user } }));
    } catch (e) {
      console.warn('Unable to save user session:', e);
    }
  }

  /**
   * Merge Guest Cart & Wishlist into User Account on Login
   */
  async function mergeGuestData(user) {
    if (!user) return;
    try {
      if (window.ZFB && window.ZFB.Cart && window.ZFB.Cart.merge) {
        await window.ZFB.Cart.merge();
      }
      if (window.ZFB && window.ZFB.Wishlist && window.ZFB.Wishlist.merge) {
        await window.ZFB.Wishlist.merge();
      }
    } catch (e) {
      console.warn('Failed to merge guest data:', e);
    }
  }

  /**
   * Login or Register Customer
   */
  async function login(formData) {
    const name = String(formData.name || formData.fullName || '').trim();
    const phone = String(formData.phone || '').trim().replace(/[^\d+]/g, '');
    const email = String(formData.email || '').trim();

    if (!phone) throw new Error('يرجى إدخال رقم الهاتف للدخول');

    let user = {
      id: `CUS-${Date.now()}`,
      name: name || 'عميل محترم',
      phone,
      email,
      city: formData.city || '',
      address: formData.address || ''
    };

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name, phone, email, city: formData.city, address: formData.address })
      });
      const resData = await response.json();
      if (response.ok && resData.success && resData.data) {
        user = resData.data;
      }
    } catch (_) {
      // Local fallback session
    }

    saveUser(user);
    mergeGuestData(user);
    return user;
  }

  function logout() {
    try {
      fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    } catch (_) {}

    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new CustomEvent('zfb-auth-change', { detail: { user: null } }));
    window.dispatchEvent(new CustomEvent('zfb-state-change', { detail: { key: USER_KEY, value: null } }));

    if (window.location.pathname.includes('account')) {
      window.location.href = 'index.html';
    }
  }

  /**
   * Update Profile & Saved Address
   */
  async function updateProfile(profileData) {
    const current = getUser() || {};
    const updated = {
      ...current,
      name: profileData.name || current.name,
      firstName: profileData.firstName || current.firstName,
      lastName: profileData.lastName || current.lastName,
      phone: profileData.phone || current.phone,
      email: profileData.email || current.email,
      city: profileData.city || current.city,
      district: profileData.district || current.district,
      addressDetail: profileData.addressDetail || current.addressDetail
    };

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(updated)
      });
      const resData = await response.json();
      if (response.ok && resData.success && resData.data) {
        saveUser(resData.data);
        return resData.data;
      }
    } catch (_) {}

    saveUser(updated);
    return updated;
  }

  /**
   * Create & Display Frictionless Auth Modal
   */
  function openAuthModal() {
    let modal = document.getElementById('zfb-auth-modal');
    if (modal) {
      modal.classList.add('show');
      return;
    }

    modal = document.createElement('div');
    modal.id = 'zfb-auth-modal';
    modal.className = 'zfb-auth-modal-backdrop';
    modal.innerHTML = `
      <div class="zfb-auth-modal-card">
        <button class="zfb-auth-modal-close" aria-label="إغلاق">&times;</button>
        <div class="zfb-auth-modal-header">
          <div class="zfb-auth-brand-icon">ز</div>
          <h3>مرحباً بك في زياد للتجارة</h3>
          <p>أدخل بياناتك للدخول وسنقوم بدمج سلتك ومفضلتك تلقائياً</p>
        </div>
        <form class="zfb-auth-form" id="zfb-quick-auth-form">
          <div class="form-group">
            <label for="zfb-auth-name">الاسم الكامل</label>
            <input type="text" id="zfb-auth-name" name="name" placeholder="أدخل اسمك" required autocomplete="name">
          </div>
          <div class="form-group">
            <label for="zfb-auth-phone">رقم الهاتف</label>
            <input type="tel" id="zfb-auth-phone" name="phone" placeholder="مثال: 775010726" required autocomplete="tel">
          </div>
          <div class="form-group">
            <label for="zfb-auth-email">البريد الإلكتروني (اختياري)</label>
            <input type="email" id="zfb-auth-email" name="email" placeholder="example@domain.com" autocomplete="email">
          </div>
          <div class="zfb-auth-error" id="zfb-auth-error-msg" style="display:none; color:var(--error, #ef4444); margin-bottom:12px; font-size:14px;"></div>
          <button type="submit" class="btn-primary zfb-auth-submit-btn">متابعة الدخول</button>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Style injection for Auth Modal
    if (!document.getElementById('zfb-auth-modal-styles')) {
      const style = document.createElement('style');
      style.id = 'zfb-auth-modal-styles';
      style.textContent = `
        .zfb-auth-modal-backdrop {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.65); backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          z-index: 99999; opacity: 0; pointer-events: none; transition: opacity 0.25s ease;
        }
        .zfb-auth-modal-backdrop.show { opacity: 1; pointer-events: auto; }
        .zfb-auth-modal-card {
          background: var(--surface, #1e293b); color: var(--text, #f8fafc);
          width: 90%; max-width: 420px; border-radius: 20px; padding: 28px 24px;
          position: relative; box-shadow: 0 20px 40px rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .zfb-auth-modal-close {
          position: absolute; top: 16px; left: 16px; background: none; border: none;
          color: var(--text-muted, #94a3b8); font-size: 24px; cursor: pointer; line-height: 1;
        }
        .zfb-auth-modal-header { text-align: center; margin-bottom: 20px; }
        .zfb-auth-brand-icon {
          width: 48px; height: 48px; background: linear-gradient(135deg, #d97706, #b45309);
          color: #fff; font-weight: bold; font-size: 24px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;
        }
        .zfb-auth-modal-header h3 { margin: 0 0 6px; font-size: 20px; }
        .zfb-auth-modal-header p { margin: 0; font-size: 13px; color: var(--text-muted, #94a3b8); }
        .zfb-auth-form .form-group { margin-bottom: 14px; text-align: right; }
        .zfb-auth-form label { display: block; font-size: 13px; margin-bottom: 6px; font-weight: 500; }
        .zfb-auth-form input {
          width: 100%; padding: 12px 14px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.15); background: var(--bg-card, #0f172a);
          color: inherit; font-size: 14px; box-sizing: border-box;
        }
        .zfb-auth-form input:focus { outline: none; border-color: #d97706; }
        .zfb-auth-submit-btn {
          width: 100%; padding: 14px; border-radius: 12px; font-weight: 600;
          font-size: 15px; background: linear-gradient(135deg, #d97706, #b45309);
          color: #fff; border: none; cursor: pointer; margin-top: 8px;
        }
      `;
      document.head.appendChild(style);
    }

    setTimeout(() => modal.classList.add('show'), 10);

    const closeBtn = modal.querySelector('.zfb-auth-modal-close');
    closeBtn.addEventListener('click', () => modal.classList.remove('show'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('show');
    });

    const form = modal.querySelector('#zfb-quick-auth-form');
    const errorMsg = modal.querySelector('#zfb-auth-error-msg');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorMsg.style.display = 'none';
      const name = form.name.value.trim();
      const phone = form.phone.value.trim();
      const email = form.email.value.trim();

      if (!phone) {
        errorMsg.textContent = 'يرجى إدخال رقم الهاتف';
        errorMsg.style.display = 'block';
        return;
      }

      try {
        await login({ name, phone, email });
        modal.classList.remove('show');
      } catch (err) {
        errorMsg.textContent = err.message || 'حدث خطأ، يرجى المحاولة مرة أخرى';
        errorMsg.style.display = 'block';
      }
    });
  }

  // Export Global Auth Manager
  window.ZFB_AUTH = {
    getUser,
    isLoggedIn,
    login,
    logout,
    updateProfile,
    openAuthModal
  };

})();
