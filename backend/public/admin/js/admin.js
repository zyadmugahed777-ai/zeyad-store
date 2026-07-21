document.addEventListener('DOMContentLoaded', () => {
  // Theme logic is now handled in head.ejs and topbar.ejs

  // Auto-hide flash messages
  const flashAlerts = document.querySelectorAll('.alert');
  flashAlerts.forEach(alert => {
    setTimeout(() => {
      alert.style.opacity = '0';
      setTimeout(() => alert.remove(), 300);
    }, 5000);
  });

  // Confirm delete actions
  const deleteForms = document.querySelectorAll('.delete-form');
  deleteForms.forEach(form => {
    form.addEventListener('submit', (e) => {
      if (!confirm('هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذه العملية.')) {
        e.preventDefault();
      }
    });
  });

  // Initialize TinyMCE if present on the page
  if (typeof tinymce !== 'undefined') {
    tinymce.init({
      selector: '.rich-editor',
      directionality: 'rtl',
      language: 'ar',
      height: 400,
      plugins: 'advlist autolink lists link image charmap preview anchor pagebreak searchreplace wordcount visualblocks visualchars code fullscreen insertdatetime media nonbreaking save table directionality emoticons template',
      toolbar: 'undo redo | formatselect | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | outdent indent | numlist bullist | link image media | rtl ltr | fullscreen code',
      skin: document.documentElement.getAttribute('data-theme') === 'dark' ? 'oxide-dark' : 'oxide',
      content_css: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default',
      setup: function (editor) {
        editor.on('init', function () {
          // Listen for theme changes to update tinymce theme
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.attributeName === 'data-theme') {
                // Changing skin dynamically in TinyMCE is complex, usually requires re-init or iframe CSS injection
                // For now, reload the page on theme change if editor is active, or just let it be.
              }
            });
          });
          observer.observe(document.documentElement, { attributes: true });
        });
      }
    });
  }
});


// ==============================================================
// PHASE 7: PREMIUM CMS IMAGE MANAGEMENT SYSTEM (DRAG & DROP)
// ==============================================================
document.addEventListener('DOMContentLoaded', () => {
    const fileInputs = document.querySelectorAll('input[type="file"][accept*="image"]');
    
    fileInputs.forEach(input => {
        // Skip if already upgraded
        if(input.dataset.premiumUploader) return;
        input.dataset.premiumUploader = 'true';
        
        const isMultiple = input.hasAttribute('multiple');
        
        // Create Uploader UI
        const dropZone = document.createElement('div');
        dropZone.className = 'premium-dropzone';
        
        const dropMessage = document.createElement('div');
        dropMessage.className = 'drop-message';
        dropMessage.innerHTML = `<span class="material-symbols-rounded">cloud_upload</span><br>
                                 اسحب وأفلت الصور هنا<br>
                                 <small>أو اضغط لاختيار الملفات (الحد الأقصى 5MB)</small>`;
                                 
        const previewContainer = document.createElement('div');
        previewContainer.className = 'preview-container';
        
        dropZone.appendChild(dropMessage);
        dropZone.appendChild(previewContainer);
        
        // Hide original input and insert dropZone
        input.style.display = 'none';
        input.parentNode.insertBefore(dropZone, input);
        
        // Handle Clicks
        dropZone.addEventListener('click', (e) => {
            if(e.target.closest('.preview-item')) return;
            input.click();
        });
        
        // Handle Drag & Drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.add('is-dragover'), false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.remove('is-dragover'), false);
        });
        
        dropZone.addEventListener('drop', handleDrop, false);
        
        let selectedFiles = []; // To keep track of files if multiple
        
        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            handleFiles(files);
        }
        
        input.addEventListener('change', function() {
            handleFiles(this.files);
        });
        
        function handleFiles(files) {
            const validFiles = Array.from(files).filter(file => {
                if(!file.type.startsWith('image/')) {
                    alert('نوع الملف غير مدعوم: ' + file.name);
                    return false;
                }
                if(file.size > 5 * 1024 * 1024) {
                    alert('حجم الملف كبير جداً (يجب أن يكون أقل من 5MB): ' + file.name);
                    return false;
                }
                return true;
            });
            
            if(!isMultiple && validFiles.length > 0) {
                selectedFiles = [validFiles[0]];
                previewContainer.innerHTML = '';
            } else {
                selectedFiles = [...selectedFiles, ...validFiles];
            }
            
            // Sync to original input (DataTransfer)
            syncInput();
            renderPreviews();
        }
        
        function renderPreviews() {
            previewContainer.innerHTML = '';
            if(selectedFiles.length > 0) dropMessage.style.display = 'none';
            else dropMessage.style.display = 'block';
            
            selectedFiles.forEach((file, index) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const item = document.createElement('div');
                    item.className = 'preview-item';
                    item.innerHTML = `
                        <img src="${e.target.result}" alt="Preview">
                        <button type="button" class="btn-remove-preview" data-index="${index}">
                            <span class="material-symbols-rounded">close</span>
                        </button>
                    `;
                    previewContainer.appendChild(item);
                }
                reader.readAsDataURL(file);
            });
        }
        
        previewContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-remove-preview');
            if(btn) {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                selectedFiles.splice(index, 1);
                syncInput();
                renderPreviews();
            }
        });
        
        function syncInput() {
            const dt = new DataTransfer();
            selectedFiles.forEach(file => dt.items.add(file));
            input.files = dt.files;
            // Trigger change event to update any live preview scripts
            const event = new Event('change');
            input.dispatchEvent(event);
        }
    });
});
