const router = require('express').Router();
const { getDb } = require('../../config/database');
const { generateOrderId } = require('../../utils/order-number');
const { formatOrderForWhatsApp } = require('../../utils/whatsapp-prep');
const { sanitize, normalizePhone } = require('../../utils/helpers');

router.post('/', (req, res, next) => {
  try {
    const db = getDb();
    const { customer, items, paymentMethod, deliveryMethod, notes } = req.body;

    if (!customer || !customer.firstName || !customer.phone) {
      return res.status(400).json({ success: false, error: 'بيانات العميل (الاسم ورقم الهاتف) مطلوبة' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'الطلب يجب أن يحتوي على منتج واحد على الأقل' });
    }

    const phone = normalizePhone(customer.phone);
    
    // Process in a transaction
    const processOrder = db.transaction(() => {
      // 1. Find or create customer
      let customerRecord = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
      let customerId;
      
      if (customerRecord) {
        customerId = customerRecord.id;
        db.prepare(`
          UPDATE customers 
          SET first_name = ?, last_name = ?, email = ?, city = ?, district = ?, address_detail = ?
          WHERE id = ?
        `).run(
          customer.firstName, customer.lastName || customerRecord.last_name, 
          customer.email || customerRecord.email, customer.city || customerRecord.city,
          customer.district || customerRecord.district, customer.addressDetail || customerRecord.address_detail,
          customerId
        );
      } else {
        const result = db.prepare(`
          INSERT INTO customers (first_name, last_name, phone, email, city, district, address_detail)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          customer.firstName, customer.lastName || '', phone, customer.email || '',
          customer.city || '', customer.district || '', customer.addressDetail || ''
        );
        customerId = result.lastInsertRowid;
        customerRecord = { id: customerId, first_name: customer.firstName, phone: phone };
      }

      // 2. Calculate totals and verify items
      let subtotal = 0;
      const orderItemsData = [];
      
      for (const item of items) {
        if (!item.id || !item.quantity || item.quantity < 1) continue;
        const product = db.prepare('SELECT * FROM products WHERE product_id = ? OR id = ?').get(item.id, item.id);
        if (product) {
          const itemTotal = product.price * item.quantity;
          subtotal += itemTotal;
          orderItemsData.push({
            product_id: product.product_id,
            product_title: product.title,
            quantity: item.quantity,
            price: product.price,
            total: itemTotal
          });
        }
      }

      if (orderItemsData.length === 0) {
        throw new Error('لم يتم العثور على المنتجات المطلوبة');
      }

      const shippingFee = deliveryMethod && deliveryMethod.includes('سريع') ? 500 : 0; // Simple logic
      const total = subtotal + shippingFee;

      // 3. Create Order
      const orderIdStr = generateOrderId();
      const orderResult = db.prepare(`
        INSERT INTO orders (
          order_id, customer_id, status, subtotal, shipping_fee, total,
          payment_method, delivery_method, city, district, address_detail, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderIdStr, customerId, 'pending', subtotal, shippingFee, total,
        paymentMethod || 'cash-on-delivery', deliveryMethod || '',
        customer.city || '', customer.district || '', customer.addressDetail || '', sanitize(notes)
      );
      const orderDbId = orderResult.lastInsertRowid;

      // 4. Create Order Items
      const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, product_title, quantity, price, total) VALUES (?, ?, ?, ?, ?, ?)');
      for (const oi of orderItemsData) {
        insertItem.run(orderDbId, oi.product_id, oi.product_title, oi.quantity, oi.price, oi.total);
      }

      // 5. Record Payment method (just recording, not processing)
      db.prepare('INSERT INTO payments (order_id, method, amount, status) VALUES (?, ?, ?, ?)').run(
        orderDbId, paymentMethod || 'cash-on-delivery', total, 'pending'
      );

      // 6. Update customer totals
      db.prepare('UPDATE customers SET total_orders = total_orders + 1, total_spent = total_spent + ? WHERE id = ?').run(total, customerId);

      // 7. Prepare WhatsApp Message
      const fullOrder = {
        order_id: orderIdStr, created_at: new Date().toISOString(),
        customer_name: `${customer.firstName} ${customer.lastName || ''}`.trim(),
        customer_phone: phone, city: customer.city, district: customer.district, address_detail: customer.addressDetail,
        items: orderItemsData, subtotal, discount: 0, shipping_fee: shippingFee, total,
        payment_method: paymentMethod, delivery_method: deliveryMethod, notes: sanitize(notes)
      };
      
      const whatsappMsg = formatOrderForWhatsApp(fullOrder);
      db.prepare('UPDATE orders SET whatsapp_message = ? WHERE id = ?').run(whatsappMsg, orderDbId);

      // 8. Create Notification for Admin
      db.prepare('INSERT INTO notifications (type, reference_id, title, message) VALUES (?, ?, ?, ?)').run(
        'order', orderDbId, 'طلب جديد', `طلب جديد رقم ${orderIdStr} بقيمة ${total} ر.ي`
      );

      return orderIdStr;
    });

    const finalOrderId = processOrder();
    res.json({ success: true, data: { orderId: finalOrderId, status: 'pending' } });

  } catch (error) {
    if (error.message === 'لم يتم العثور على المنتجات المطلوبة') {
      return res.status(400).json({ success: false, error: error.message });
    }
    next(error);
  }
});

router.get('/track/:phone', (req, res, next) => {
  try {
    const db = getDb();
    const phone = normalizePhone(req.params.phone);
    
    const customer = db.prepare('SELECT id FROM customers WHERE phone = ?').get(phone);
    if (!customer) {
      return res.json({ success: true, data: [] });
    }

    const orders = db.prepare('SELECT order_id, status, total, created_at FROM orders WHERE customer_id = ? ORDER BY id DESC').all(customer.id);
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
});

module.exports = router;