// cart.js — improved: non-destructive qty input, smaller mobile images, immediate totals update
(() => {
  const CART_KEY = 'sdb_cart_v3';
  const LOG = '[cart]';
  function log(...a){ try{ console.log(LOG, ...a) }catch(e){} }
  function err(...a){ try{ console.error(LOG, ...a) }catch(e){} }

  function safeParse(v){ try{ return JSON.parse(v||'{}'); } catch(e){ err('parse error', e); return {}; } }
  function loadCart(){ return safeParse(localStorage.getItem(CART_KEY)); }

  // saveCart optionally avoids calling render (so input caret isn't lost)
  function saveCart(cart, renderNow = true){
    try{
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      if (renderNow) render();
    }catch(e){ err('save error', e) }
  }

  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, m=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m])); }

  // Render whole list (used for initial render, after remove/clear, after order)
  function render(){
    const cart = loadCart();
    const list = document.getElementById('cartList');
    if (!list) { err('cartList element missing'); return; }
    list.innerHTML = '';
    const items = Object.values(cart);
    if (!items.length) {
      list.innerHTML = '<div class="small">Your cart is empty. <a href="/">Continue shopping</a>.</div>';
      updateTotals(items);
      return;
    }
    items.forEach(it => {
      const div = document.createElement('div');
      div.className = 'card';
      // Ensure name is displayed clearly and qty input has stable value
    div.innerHTML = `
  <img src="${escapeHtml(it.img)}" alt="${escapeHtml(it.name)}">

  <div class="meta">
    <strong>${escapeHtml(it.name)}</strong>
    <div class="small">₹${Number(it.price).toFixed(2)} / kg</div>
  </div>

  <div class="controls">
    <div class="stepper">
      <button class="qty-minus" data-sku="${escapeHtml(it.sku)}">−</button>
      <input class="qty" type="number" min="1" value="${it.qtyKg}" data-sku="${escapeHtml(it.sku)}">
      <button class="qty-plus" data-sku="${escapeHtml(it.sku)}">+</button>
    </div>

    <div class="lineTotal">₹${(Number(it.qtyKg) * Number(it.price)).toFixed(2)}</div>
  </div>
`;

      list.appendChild(div);
    });
    updateTotals(items);
    const totalItemsEl = document.getElementById('totalItems');
    if (totalItemsEl) totalItemsEl.textContent = items.length;
  }

  function updateTotals(items){
    items = items || Object.values(loadCart());
    const totalKg = items.reduce((s,i) => s + Number(i.qtyKg || 0), 0);
    const grand = items.reduce((s,i) => s + (Number(i.qtyKg || 0) * Number(i.price || 0)), 0);
    const totalKgEl = document.getElementById('totalKg');
    const grandEl = document.getElementById('grandTotal');
    if (totalKgEl) totalKgEl.textContent = totalKg;
    if (grandEl) grandEl.textContent = grand.toFixed(2);
    // update header/fab counts
    const count = items.length;
    const elHead = document.getElementById('cartCount'); if (elHead) elHead.textContent = count;
    const elFab = document.getElementById('cartFabCount'); if (elFab) elFab.textContent = count;
  }

  // Update only the line total DOM for a given SKU (no full re-render)
  function updateLineTotalDOM(sku){
    const cart = loadCart();
    const data = cart[sku];
    if (!data) return;
    // find the input and the .lineTotal for this sku
    const input = document.querySelector(`input.qty[data-sku="${CSS.escape(sku)}"]`);
    const line = input?.closest('.card')?.querySelector('.lineTotal');
    if (line) line.textContent = '₹' + (Number(data.qtyKg) * Number(data.price)).toFixed(2);
    updateTotals(Object.values(cart));
  }

  // Build WA message string (encoded later)
  function buildWhatsAppMessage(payload, name, phone){
    let msg = `Order from ${name} (${phone})%0A`;
    payload.items.forEach(it => { msg += `- ${it.name}: ${it.qtyKg} kg @ ₹${it.price}/kg = ₹${(it.qtyKg*it.price).toFixed(2)}%0A`; });
    msg += `%0ATotal items: ${payload.items.length}%0ATotal kg: ${payload.totalKg}%0AGrand total: ₹${payload.totalAmount.toFixed(2)}`;
    return msg;
  }

  document.addEventListener('DOMContentLoaded', () => {
    render();
    const list = document.getElementById('cartList');
// delegated handlers: clicks (remove, plus, minus) and input (manual quantity)
list.addEventListener('click', (e) => {
  // Remove button
  const rem = e.target.closest && e.target.closest('.remove');
  if (rem) {
    const sku = rem.dataset.sku;
    const cart = loadCart();
    if (cart[sku]) { delete cart[sku]; saveCart(cart, true); log('removed', sku); }
    return;
  }

  // Stepper plus/minus
  const plus = e.target.closest && e.target.closest('.qty-plus');
  const minus = e.target.closest && e.target.closest('.qty-minus');
  if (plus || minus) {
    const btn = plus || minus;
    const sku = btn.dataset.sku;
    const cart = loadCart();
    if (!cart[sku]) return;
    let cur = Number(cart[sku].qtyKg) || 0;
    cur = plus ? (cur + 1) : Math.max(1, cur - 1);
    cart[sku].qtyKg = cur;
    saveCart(cart, false);         // persist but avoid full re-render
    // update DOM input value if present
    const input = document.querySelector(`input.qty[data-sku="${CSS.escape(sku)}"]`);
    if (input) input.value = cur;
    updateLineTotalDOM(sku);
    return;
  }
});

// input handler — manual typing (no full re-render)
list.addEventListener('input', (e) => {
  if (e.target.classList.contains('qty')) {
    const sku = e.target.dataset.sku;
    // allow typing, but sanitize to integer >=1 on blur (not immediately)
    let raw = e.target.value;
    // accept '' while typing, but if becomes empty set to 1 on blur
    // use a relaxed parse here; final sanitization on blur
    let val = Number(raw);
    if (Number.isNaN(val)) return; // let user type
    val = Math.round(val);
    if (val < 1) val = 1;
    // update localStorage WITHOUT triggering full rerender (save only)
    const cart = loadCart();
    if (cart[sku]) {
      cart[sku].qtyKg = val;
      saveCart(cart, false);
      updateLineTotalDOM(sku);
    }
  }
});

// blur handler to ensure caret doesn't jump: sanitize final input value
list.addEventListener('blur', (e) => {
  if (e.target.classList && e.target.classList.contains('qty')) {
    const sku = e.target.dataset.sku;
    let val = Math.round(Number(e.target.value) || 0);
    if (!val || val < 1) val = 1;
    e.target.value = val;
    const cart = loadCart();
    if (cart[sku]) {
      cart[sku].qtyKg = val;
      saveCart(cart, true); // persist and re-render to keep DOM consistent
    }
  }
}, true);


    document.getElementById('clearBtn')?.addEventListener('click', () => {
      if (!confirm('Clear cart?')) return;
      localStorage.removeItem(CART_KEY);
      render();
    });

    // PLACE ORDER — send to /order and WAIT for server response
    document.getElementById('checkoutBtn')?.addEventListener('click', async () => {
      const cart = loadCart(); const items = Object.values(cart);
      if (!items.length){ alert('Cart empty'); return; }
      const name = document.getElementById('custName')?.value?.trim(); const phone = document.getElementById('custPhone')?.value?.trim();
      const address = document.getElementById('custAddress')?.value?.trim();
      if (!name || !phone || !address){ alert('Enter name, phone & address'); return; }

      const payload = {
        customer:{ name, phone, address },
        items: items.map(it => ({ sku: it.sku, name: it.name, qtyKg: Number(it.qtyKg), price: Number(it.price), img: it.img })),
        totalKg: items.reduce((s,i)=> s + Number(i.qtyKg || 0), 0),
        totalAmount: items.reduce((s,i)=> s + (Number(i.qtyKg || 0) * Number(i.price || 0)), 0)
      };

      const checkoutBtn = document.getElementById('checkoutBtn');
      const checkoutWhats = document.getElementById('checkoutWhats');
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = 'Placing order...';
      document.getElementById('orderMsg').textContent = '';

      try {
        const res = await fetch('/order', {
          method:'POST',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json && json.success) {
          document.getElementById('orderMsg').textContent = 'Thank you — our team will contact you shortly.';
          localStorage.removeItem(CART_KEY);
          render();
          if (checkoutWhats) {
            checkoutWhats.disabled = false;
            checkoutWhats.onclick = () => {
              const wa = buildWhatsAppMessage(payload, name, phone);
              window.open(`https://wa.me/918553334247?text=${encodeURIComponent(wa)}`, '_blank');
            };
          }
        } else {
          console.error('order save failed', json);
          document.getElementById('orderMsg').textContent = 'Server error saving order. Try again.';
        }
      } catch (err) {
        console.error('network/order error', err);
        document.getElementById('orderMsg').textContent = 'Network error saving order.';
      } finally {
        if (checkoutBtn) { checkoutBtn.disabled = false; checkoutBtn.textContent = 'Place Order'; }
      }
    });

    const checkoutWhatsBtn = document.getElementById('checkoutWhats');
    if (checkoutWhatsBtn) {
      checkoutWhatsBtn.disabled = true;
      checkoutWhatsBtn.addEventListener('click', () => {
        const cart = loadCart(); const items = Object.values(cart);
        if (!items.length) { alert('Cart empty'); return; }
        let msg = 'Hello SDB Plantation, I would like to order:%0A';
        items.forEach(it => msg += `- ${it.name}: ${it.qtyKg} kg @ ₹${it.price}/kg = ₹${(it.qtyKg*it.price).toFixed(2)}%0A`);
        msg += `%0ATotal items: ${items.length}%0ATotal kg: ${items.reduce((s,i)=>s+Number(i.qtyKg||0),0)} kg%0AGrand total: ₹${items.reduce((s,i)=>s + (Number(i.qtyKg||0)*Number(i.price||0)),0).toFixed(2)}`;
        window.open(`https://wa.me/918553334247?text=${msg}`, '_blank');
      });
    }

    log('cart handlers bound');
  });

})();
