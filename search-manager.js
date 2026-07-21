
// Smart Search Manager
document.addEventListener('DOMContentLoaded', () => {
  const searchInputs = document.querySelectorAll('.main-nav .search input, .search-bar input, input[type="search"]');
  
  searchInputs.forEach(input => {
    // Create dropdown container
    const dropdown = document.createElement('div');
    dropdown.className = 'search-autocomplete-dropdown';
    input.parentNode.style.position = 'relative';
    input.parentNode.appendChild(dropdown);

    let debounceTimer;
    input.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      const query = e.target.value.trim();
      
      if (query.length < 2) {
        dropdown.classList.remove('active');
        return;
      }

      debounceTimer = setTimeout(async () => {
        try {
          const res = await fetch('/api/products/search/suggestions?q=' + encodeURIComponent(query));
          const data = await res.json();
          
          if (data.success) {
            dropdown.innerHTML = '';
            
            if (data.data.length > 0) {
              data.data.forEach(item => {
                dropdown.innerHTML += `<a href="/product.html?id=${item.product_id}" class="search-suggestion-item">
                  <img src="${item.main_image ? '/uploads/'+item.main_image : '/images/placeholder.jpg'}" alt="">
                  <div style="flex:1">
                    <div style="font-size:0.9rem;font-weight:700">${item.title}</div>
                    <div style="font-size:0.8rem;color:var(--primary-color,#c68f31)">${item.price} ر.ي</div>
                  </div>
                </a>`;
              });
            } else if (data.suggestions.length > 0) {
              dropdown.innerHTML += `<div class="search-smart-notice">لم نجد تطابق تام، هل تقصد:</div>`;
              data.suggestions.forEach(item => {
                dropdown.innerHTML += `<a href="/product.html?id=${item.product_id}" class="search-suggestion-item">
                  <img src="${item.main_image ? '/uploads/'+item.main_image : '/images/placeholder.jpg'}" alt="">
                  <div style="flex:1">
                    <div style="font-size:0.9rem;font-weight:700">${item.title}</div>
                    <div style="font-size:0.8rem;color:var(--primary-color,#c68f31)">${item.price} ر.ي</div>
                  </div>
                </a>`;
              });
            } else {
              dropdown.innerHTML = `<div style="padding:16px;text-align:center;color:var(--muted)">لا توجد نتائج مطابقة</div>`;
            }
            dropdown.classList.add('active');
          }
        } catch(e) { console.error('Search error', e); }
      }, 250);
    });

    document.addEventListener('click', (e) => {
      if (!input.parentNode.contains(e.target)) {
        dropdown.classList.remove('active');
      }
    });
  });
});
