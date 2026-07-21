/* Visual Editor Client injected into the frontend */
document.addEventListener('DOMContentLoaded', () => {
  console.log('Visual CMS Editor initialized.');

  // Disable all default links so clicking an anchor selects it instead of navigating
  document.querySelectorAll('a').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
    });
  });

  const editableElements = document.querySelectorAll('[data-vid]');
  
  editableElements.forEach(el => {
    el.classList.add('visual-cms-element');

    el.addEventListener('mouseenter', (e) => {
      e.stopPropagation(); // Only highlight the most specific nested element
      document.querySelectorAll('.visual-cms-hover').forEach(h => h.classList.remove('visual-cms-hover'));
      el.classList.add('visual-cms-hover');
    });

    el.addEventListener('mouseleave', (e) => {
      el.classList.remove('visual-cms-hover');
    });

    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      document.querySelectorAll('.visual-cms-active').forEach(a => a.classList.remove('visual-cms-active'));
      el.classList.add('visual-cms-active');

      // Send to parent
      const payload = {
        vid: el.getAttribute('data-vid'),
        tagName: el.tagName,
        text: el.innerText || '',
        html: el.innerHTML || '',
        src: el.src || '',
        href: el.href || '',
      };

      window.parent.postMessage({ type: 'ELEMENT_SELECTED', payload }, '*');
    });
  });

  // Listen for real-time updates from parent
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (data && data.type === 'UPDATE_ELEMENT') {
      const { vid, prop, value } = data.payload;
      const el = document.querySelector(`[data-vid="${vid}"]`);
      if (el) {
        if (prop === 'src') el.src = value;
        else if (prop === 'bg-image') el.style.backgroundImage = `url('${value}')`;
        else if (prop === 'href') el.href = value;
        else if (prop === 'text') {
           el.textContent = value;
        }
      }
    }
  });

});
