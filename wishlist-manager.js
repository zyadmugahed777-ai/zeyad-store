
// Universal Wishlist Manager
document.addEventListener('DOMContentLoaded', () => {
  const getWishlist = () => JSON.parse(localStorage.getItem('zfb_wishlist') || '[]');
  const setWishlist = (list) => localStorage.setItem('zfb_wishlist', JSON.stringify(list));
  
  const updateBadges = () => {
    const wl = getWishlist();
    document.querySelectorAll('.wishlist-badge').forEach(b => {
      b.textContent = wl.length;
      if (wl.length > 0) b.style.display = 'grid';
      else b.style.display = 'none';
    });
  };

  const syncUI = () => {
    const wl = getWishlist();
    document.querySelectorAll('.wish, .btn-wishlist, #wishlist-btn, #gallery-favorite-btn').forEach(btn => {
      let id = btn.getAttribute('data-product-id') || btn.getAttribute('data-id') || btn.closest('[data-product-id]')?.getAttribute('data-product-id') || btn.closest('[data-id]')?.getAttribute('data-id');
      if (!id && window.location.pathname.includes('product.html')) {
          const urlParams = new URLSearchParams(window.location.search);
          id = urlParams.get('id');
      }
      if (id && wl.includes(id)) {
        btn.classList.add('is-active');
      } else {
        btn.classList.remove('is-active');
      }
    });
  };

  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('.wish, .btn-wishlist, #wishlist-btn, #gallery-favorite-btn');
    if (!btn) return;
    
    e.preventDefault();
    let id = btn.getAttribute('data-product-id') || btn.getAttribute('data-id') || btn.closest('[data-product-id]')?.getAttribute('data-product-id') || btn.closest('[data-id]')?.getAttribute('data-id');
      if (!id && window.location.pathname.includes('product.html')) {
          const urlParams = new URLSearchParams(window.location.search);
          id = urlParams.get('id');
      }
    if (!id) return;

    let wl = getWishlist();
    if (wl.includes(id)) {
      wl = wl.filter(item => item !== id);
      btn.classList.remove('is-active');
    } else {
      wl.push(id);
      btn.classList.add('is-active');
    }
    
    setWishlist(wl);
    updateBadges();
    syncUI();
    
    // if on wishlist page, reload or remove element
    if (window.location.pathname.includes('wishlist.html') && !wl.includes(id)) {
       const card = btn.closest('.product-card');
       if (card) {
         card.style.opacity = '0';
         setTimeout(() => card.remove(), 300);
       }
    }
  });

  updateBadges();
  syncUI();
});
