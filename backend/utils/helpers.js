/**
 * Common helpers for Zeyad For Business Backend
 */

/**
 * Format price in Yemeni Rial
 */
function formatPrice(amount) {
  if (amount == null) return '0 ر.ي';
  return new Intl.NumberFormat('ar-YE').format(amount) + ' ر.ي';
}

/**
 * Format date for display (Arabic-friendly)
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ar-YE', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

/**
 * Format date-time for display
 */
function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ar-YE', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

/**
 * Validate Yemeni phone number
 */
function isValidYemeniPhone(phone) {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  return /^(00967|\+967|7)\d{8,9}$/.test(cleaned);
}

/**
 * Normalize phone number to standard format
 */
function normalizePhone(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('00967')) cleaned = cleaned.substring(5);
  else if (cleaned.startsWith('+967')) cleaned = cleaned.substring(4);
  else if (cleaned.startsWith('967')) cleaned = cleaned.substring(3);
  return cleaned;
}

/**
 * Parse pagination params from query string
 */
function parsePagination(query, defaultLimit = 20) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || defaultLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Build pagination info object
 */
function paginationInfo(page, limit, totalItems) {
  const totalPages = Math.ceil(totalItems / limit);
  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}

/**
 * Sanitize string input
 */
function sanitize(str) {
  if (!str) return '';
  return String(str).trim();
}

/**
 * Get status badge color
 */
function statusColor(status) {
  const colors = {
    'pending': '#f59e0b',
    'confirmed': '#3b82f6',
    'processing': '#8b5cf6',
    'shipped': '#06b6d4',
    'delivered': '#10b981',
    'cancelled': '#ef4444',
    'read': '#6b7280'
  };
  return colors[status] || '#6b7280';
}

/**
 * Get status label in Arabic
 */
function statusLabel(status) {
  const labels = {
    'pending': 'في الانتظار',
    'confirmed': 'تم التأكيد',
    'processing': 'قيد التجهيز',
    'shipped': 'تم الشحن',
    'delivered': 'تم التوصيل',
    'cancelled': 'ملغي'
  };
  return labels[status] || status;
}

/**
 * Payment method label in Arabic
 */
function paymentLabel(method) {
  const labels = {
    'kuraimi': 'كريمي',
    'jaib': 'جيب',
    'jawali': 'جوالي',
    'floosk': 'فلوسك',
    'one-cash': 'ون كاش',
    'bank-transfer': 'حوالة بنكية',
    'money-transfer': 'حوالة مالية',
    'cash-on-delivery': 'الدفع عند الاستلام',
    'gold': 'ذهب',
    'direct-transfer': 'تحويل مباشر'
  };
  return labels[method] || method;
}

/**
 * Visual Editor Helper
 * Outputs HTML wrapped in a data-editor span if editMode is active.
 * Otherwise outputs the plain value.
 */
function visual(locals, key, type, defaultValue) {
  const contentMap = locals.themeContent || {};
  const isEditMode = locals.editMode === true;
  
  let val = contentMap[key] !== undefined ? contentMap[key] : defaultValue;
  
  if (isEditMode) {
    // If it's an image, we don't wrap it in span, we add data attributes to the img tag?
    // Actually, returning a wrapper is easier for text/html. For images, we might need a different helper or apply attributes directly.
    if (type === 'image') {
      return `src="${val}" data-visual-key="${key}" data-visual-type="image" class="visual-editable-img"`;
    }
    if (type === 'bg-image') {
      return `style="background-image: url('${val}')" data-visual-key="${key}" data-visual-type="bg-image" class="visual-editable-bg"`;
    }
    if (type === 'link') {
      return `href="${val}" data-visual-key="${key}" data-visual-type="link" class="visual-editable-link"`;
    }
    return `<span data-visual-key="${key}" data-visual-type="${type}" class="visual-editable">${val}</span>`;
  }
  
  if (type === 'image') return `src="${val}"`;
  if (type === 'bg-image') return `style="background-image: url('${val}')"`;
  if (type === 'link') return `href="${val}"`;
  return val;
}

module.exports = {
  formatPrice,
  formatDate,
  formatDateTime,
  isValidYemeniPhone,
  normalizePhone,
  parsePagination,
  paginationInfo,
  sanitize,
  statusColor,
  statusLabel,
  paymentLabel,
  visual
};
