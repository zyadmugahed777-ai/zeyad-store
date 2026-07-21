-- Zeyad For Business - Seed Data
-- Minimal initial data for categories, settings, and admin user

-- =============================================
-- CATEGORIES
-- =============================================
INSERT INTO categories (code, name_ar, name_en, slug, sort_order) VALUES
  ('appl', 'أجهزة كهربائية', 'Appliances', 'appliances', 1),
  ('fur', 'أثاث', 'Furniture', 'furniture', 2),
  ('bed', 'غرف نوم', 'Bedrooms', 'bedrooms', 3),
  ('maj', 'مجالس', 'Majalis', 'majalis', 4),
  ('kit', 'مطابخ', 'Kitchens', 'kitchens', 5),
  ('sol', 'طاقة شمسية', 'Solar Solutions', 'solar', 6),
  ('kid', 'غرف أطفال', 'Kids Rooms', 'kids-rooms', 7),
  ('gen', 'عام', 'General', 'general', 8);

-- =============================================
-- BRANCHES
-- =============================================
INSERT INTO branches (name_ar, name_en, city, address, phone, whatsapp, working_hours, is_active, sort_order) VALUES
  ('معرض زياد - صنعاء الرئيسي', 'Zeyad Showroom - Sanaa Main', 'صنعاء', 'شارع الستين، صنعاء', '01-234567', '777000001', 'السبت - الخميس: 8:00 ص - 10:00 م', 1, 1),
  ('معرض زياد - عدن', 'Zeyad Showroom - Aden', 'عدن', 'المنصورة، عدن', '02-345678', '777000002', 'السبت - الخميس: 8:00 ص - 10:00 م', 1, 2);

-- =============================================
-- DEFAULT SETTINGS
-- =============================================
INSERT INTO settings (key, value, type, group_name) VALUES
  ('store_name_ar', 'زياد للأعمال', 'string', 'general'),
  ('store_name_en', 'Zeyad For Business', 'string', 'general'),
  ('currency', 'YER', 'string', 'general'),
  ('currency_symbol', 'ر.ي', 'string', 'general'),
  ('default_delivery_fee', '0', 'number', 'delivery'),
  ('express_delivery_fee', '500', 'number', 'delivery'),
  ('free_delivery_min', '50000', 'number', 'delivery'),
  ('whatsapp_number', '', 'string', 'contact'),
  ('support_phone', '', 'string', 'contact'),
  ('support_email', '', 'string', 'contact'),
  ('delivery_cities', '["صنعاء","عدن","تعز","الحديدة","إب","ذمار","المكلا","سيئون"]', 'json', 'delivery'),
  ('payment_methods', '[{"id":"kuraimi","label":"كريمي","active":true},{"id":"jaib","label":"جيب","active":true},{"id":"jawali","label":"جوالي","active":true},{"id":"floosk","label":"فلوسك","active":true},{"id":"one-cash","label":"ون كاش","active":true},{"id":"bank-transfer","label":"حوالة بنكية","active":true},{"id":"money-transfer","label":"حوالة مالية","active":true},{"id":"cash-on-delivery","label":"الدفع عند الاستلام","active":true},{"id":"gold","label":"ذهب","active":true},{"id":"direct-transfer","label":"تحويل مباشر","active":true}]', 'json', 'payment'),
  ('order_statuses', '[{"id":"pending","label":"في الانتظار","color":"#f59e0b"},{"id":"confirmed","label":"تم التأكيد","color":"#3b82f6"},{"id":"processing","label":"قيد التجهيز","color":"#8b5cf6"},{"id":"shipped","label":"تم الشحن","color":"#06b6d4"},{"id":"delivered","label":"تم التوصيل","color":"#10b981"},{"id":"cancelled","label":"ملغي","color":"#ef4444"}]', 'json', 'orders');

-- =============================================
-- ADMIN USER (Default: admin / changeme123)
-- Password hash for 'changeme123' using bcryptjs
-- This will be replaced by the server on first run
-- =============================================
-- Note: The actual admin user is created by server.js on first start
-- using bcryptjs to hash the password properly
