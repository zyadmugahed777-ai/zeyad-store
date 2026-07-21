const fs = require('fs');

const updateBodyClass = (file, newClass) => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('<body id="top">')) {
      content = content.replace('<body id="top">', `<body id="top" class="${newClass}">`);
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Updated ${file}`);
    } else if (content.includes('<body')) {
       // if it already has a class, just append
       // for simplicity, let's just do a regex replace
       content = content.replace(/<body([^>]*)class="([^"]*)"/g, `<body$1class="$2 ${newClass}"`);
       if (!content.includes(newClass)) {
         content = content.replace(/<body([^>]*)>/, `<body$1 class="${newClass}">`);
       }
       fs.writeFileSync(file, content, 'utf8');
       console.log(`Updated ${file}`);
    }
  }
};

updateBodyClass('checkout.html', 'checkout-page');
updateBodyClass('cart.html', 'cart-page');
updateBodyClass('login.html', 'auth-page');
updateBodyClass('register.html', 'auth-page');

// Also update admin pages just in case
const adminLayout = 'backend/views/admin/layout.ejs';
updateBodyClass(adminLayout, 'admin-page');
const adminDashboard = 'backend/views/admin/dashboard.ejs';
updateBodyClass(adminDashboard, 'admin-page');

