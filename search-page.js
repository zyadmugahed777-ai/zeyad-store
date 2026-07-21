
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    
    const input = document.getElementById('q-2') || document.getElementById('q-1');
    if (input && query) input.value = query;

    if (query) {
        // Hide static discovery sections
        // We no longer hide discovery sections. We want customers to dive into offers!
        
        const main = document.querySelector('.premium-search-page');
        
        // Add loading state
        let resultsContainer = document.getElementById('dynamic-search-results');
        if (!resultsContainer) {
            resultsContainer = document.createElement('section');
            resultsContainer.id = 'dynamic-search-results';
            resultsContainer.className = 'search-results-container container';
            
        const hero = main.querySelector('.premium-search-hero');
        if (hero && hero.nextSibling) {
            main.insertBefore(resultsContainer, hero.nextSibling);
        } else {
            main.appendChild(resultsContainer);
        }
        
        }
        
        resultsContainer.innerHTML = '<div style="text-align:center; padding: 40px;"><div class="loader" style="display:inline-block; width: 40px; height:40px; border:4px solid var(--gold); border-top-color:transparent; border-radius:50%; animation: spin 1s linear infinite;"></div><p style="margin-top:16px;">جاري البحث عن "'+query+'"...</p></div>';
        
        try {
            const res = await fetch('/api/products/search/suggestions?q=' + encodeURIComponent(query));
            const data = await res.json();
            
            if (data.success) {
                let renderData = data.data;
                let isSuggestion = false;
                
                if (renderData.length === 0 && data.suggestions && data.suggestions.length > 0) {
                    renderData = data.suggestions;
                    isSuggestion = true;
                }
                
                if (renderData.length > 0) {
                    let html = '<h2 style="margin-bottom: 24px;">' + (isSuggestion ? 'لم نجد تطابق تام، هل تقصد هذه المنتجات؟' : 'نتائج البحث عن "'+query+'" ('+renderData.length+')') + '</h2><div class="search-results-grid">';
                    
                    renderData.forEach(product => {
                        html += `
                        <article class="product-card" data-product-id="${product.product_id}">
                          <a href="product.html?id=${product.product_id}" class="product-photo-link" style="display:block; width:100%; aspect-ratio:4/5; flex-shrink:0; overflow:hidden;">
                            <img src="${product.main_image ? '/uploads/'+product.main_image : '/images/placeholder.jpg'}" alt="${product.title}" style="width:100%; height:100%; object-fit:cover; display:block;" loading="lazy">
                          </a>
                          <div class="product-body">
                            <h3>${product.title}</h3>
                            <div class="price">
                              <strong>${product.price} ر.س</strong>
                              ${product.old_price > product.price ? '<del>'+product.old_price+' ر.س</del>' : ''}
                            </div>
                            <div class="stock" style="margin-top:auto;">
                              <div style="display:flex; gap:8px;">
                                <button type="button" class="wish" aria-label="المفضلة" style="position:static;"><svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"></path></svg></button>
                                <button type="button" class="btn-primary btn-add-cart-mini" onclick="addToCart(this, event)">إضافة للسلة</button>
                              </div>
                            </div>
                          </div>
                        </article>
                        `;
                    });
                    
                    html += '</div>';
                    resultsContainer.innerHTML = html;
                    
                    
    // Safely sync wishlist UI for new elements without re-triggering DOMContentLoaded
    const wl = JSON.parse(localStorage.getItem('zfb_wishlist') || '[]');
    document.querySelectorAll('.wish, .btn-wishlist').forEach(btn => {
        const id = btn.getAttribute('data-product-id') || btn.getAttribute('data-id') || btn.closest('[data-product-id]')?.getAttribute('data-product-id') || btn.closest('[data-id]')?.getAttribute('data-id');
        if (id && wl.includes(id)) {
            btn.classList.add('is-active');
        } else {
            btn.classList.remove('is-active');
        }
    });
    
                } else {
                    document.querySelector('.search-no-results').style.display = 'flex';
                    resultsContainer.innerHTML = '';
                }
            }
        } catch (err) {
            console.error('Search failed:', err);
            resultsContainer.innerHTML = '<p style="text-align:center; color:red;">حدث خطأ أثناء البحث، يرجى المحاولة لاحقاً.</p>';
        }
    }
});
