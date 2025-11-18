// cart.js — final working version (manual qty input, carat display, remove, clear, submit)
(function () {
  const CART_KEY = 'sdb_cart_v3';
  const PENDING_KEY = 'pendingOrders';
  const LOG = '[cart]';
  function log(...a){ try{ console.log(LOG, ...a); } catch(e){} }
  function err(...a){ try{ console.error(LOG, ...a); } catch(e){} }

  // safe JSON parse
  function safeParse(v){ try { return JSON.parse(v || '{}'); } catch(e) { err('parse', e); return {}; } }
  function loadCart(){ return safeParse(localStorage.getItem(CART_KEY)); }
  function saveCart(cart, { renderNow = true } = {}) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      try { localStorage.setItem('cartUpdatedAt', Date.now().toString()); } catch(e){}
      if (renderNow) render();
    } catch (e) { err('saveCart', e); }
  }

  function escapeHtml(s){ if (s === null || s === undefined) return ''; return String(s).replace(/[&<>"']/g, m=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m])); }

  function caratsFromKg(kg){
    const n = Number(kg) || 0;
    if (n <= 0) return '';
    const c = n / 20;
    return c % 1 === 0 ? `${c} carat${c === 1 ? '' : 's'}` : `${c.toFixed(2)} carats`;
  }

  function computeTotals(items){
    const totalKg = items.reduce((s,i) => s + (Number(i.qtyKg)||0), 0);
    const totalAmount = items.reduce((s,i) => s + ((Number(i.qtyKg)||0) * (Number(i.price)||0)), 0);
    return { totalKg, totalAmount };
  }

  // RENDER
  function render(){
    const cart = loadCart() || {};
    const list = document.getElementById('cartList');
    if (!list) { err('No #cartList element'); return; }

    list.innerHTML = '';
    const items = Object.values(cart || {});
    if (!items.length) {
      list.innerHTML = '<div class="small">Your cart is empty. <a href="/">Continue shopping</a>.</div>';
      updateTotals(items);
      return;
    }

    const frag = document.createDocumentFragment();
    items.forEach(it => {
      const sku = it.sku || '';
      const img = escapeHtml(it.img || '/images/placeholder.png');
      const name = escapeHtml(it.name || sku || 'Item');
      const price = Number(it.price) || 0;
      const qty = Number(it.qtyKg) || 0;
      const lineTotal = (price * qty);

      const card = document.createElement('div');
      card.className = 'cart-item';
      card.dataset.sku = sku;

      card.innerHTML = `
        <img src="${img}" alt="${name}" style="width:86px;height:86px;object-fit:cover;border-radius:8px;flex-shrink:0;">

        <div class="item-info" style="flex:1;min-width:0;margin-left:10px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
            <div style="min-width:0;">
              <h3 class="item-title" style="margin:0;font-size:16px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</h3>
              <div class="item-price" style="color:#6b7280;margin-top:6px;">₹${price.toFixed(2)} / kg</div>
            </div>
            <div style="text-align:right;">
              <div style="font-weight:900;font-size:18px">₹ ${lineTotal.toFixed(2)}</div>
            </div>
          </div>

          <div class="qty-row" style="margin-top:10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <label style="font-weight:700;">Qty (kg):</label>
            <input class="qty-input" type="number" min="1" step="1" data-sku="${escapeHtml(sku)}" value="${qty}" style="width:80px;padding:6px;border-radius:8px;border:1px solid #e6e6e6;text-align:center;font-weight:700;">
            <div class="carat-label" style="color:#2f9e44;font-weight:800;margin-left:6px;">${caratsFromKg(qty) ? '(' + caratsFromKg(qty) + ')' : ''}</div>
            <div style="flex:1"></div>
            <button class="remove" data-sku="${escapeHtml(sku)}" style="background:#ffe7e7;color:#c40000;padding:8px 10px;border-radius:8px;border:none;cursor:pointer;">Remove</button>
          </div>
        </div>
      `;

      frag.appendChild(card);
    });

    list.appendChild(frag);
    updateTotals(items);
  }

  function updateTotals(items){
    items = items || Object.values(loadCart() || {});
    const { totalKg, totalAmount } = computeTotals(items);
    const totalItemsEl = document.getElementById('totalItems');
    const totalKgEl = document.getElementById('totalKg');
    const grandEl = document.getElementById('grandTotal');
    const headerCount = document.getElementById('cartCount');
    const fabCount = document.getElementById('cartFabCount');

    if (totalItemsEl) totalItemsEl.textContent = String(items.length || 0);
    if (totalKgEl) totalKgEl.textContent = String(totalKg || 0);
    if (grandEl) grandEl.textContent = (totalAmount || 0).toFixed(2);
    if (headerCount) headerCount.textContent = String(items.length || 0);
    if (fabCount) fabCount.textContent = String(items.length || 0);
  }

  // Remove item
  function handleRemove(sku){
    const cart = loadCart();
    if (!cart || !cart[sku]) return;
    delete cart[sku];
    saveCart(cart, { renderNow: true });
  }

  function clearCart(){
    localStorage.removeItem(CART_KEY);
    try { localStorage.setItem('cartUpdatedAt', Date.now().toString()); } catch(e){}
    render();
  }

  function savePendingOrder(payload){
    try {
      const arr = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
      arr.push(payload);
      localStorage.setItem(PENDING_KEY, JSON.stringify(arr));
    } catch(e){ err('savePending', e); }
  }

  function buildWhatsAppText(payload){
    const cust = payload.customer || {};
    let txt = `Order from ${cust.name||'-'} (${cust.phone||'-'})%0A`;
    payload.items.forEach(it => {
      txt += `- ${it.name}: ${it.qtyKg} kg @ ₹${Number(it.price).toFixed(2)}/kg = ₹${(Number(it.qtyKg)*Number(it.price)).toFixed(2)}%0A`;
    });
    txt += `%0ATotal kg: ${payload.totalKg}%0AGrand total: ₹${payload.totalAmount.toFixed(2)}`;
    return txt;
  }

  async function placeOrder(){
    const cart = loadCart(); const items = Object.values(cart || {});
    if (!items.length) { alert('Cart empty'); return; }

    const name = document.getElementById('custName')?.value?.trim();
    const phone = document.getElementById('custPhone')?.value?.trim();
    const address = document.getElementById('custAddress')?.value?.trim();
    if (!name || !phone || !address) { alert('Please fill name, phone & address'); return; }

    const payload = {
      customer: { name, phone, address },
      items: items.map(it => ({ sku: it.sku, name: it.name, qtyKg: Number(it.qtyKg)||0, price: Number(it.price)||0, img: it.img || '' })),
      totalKg: items.reduce((s,i) => s + (Number(i.qtyKg)||0), 0),
      totalAmount: items.reduce((s,i) => s + ((Number(i.qtyKg)||0) * (Number(i.price)||0)), 0)
    };

    const btn = document.getElementById('checkoutBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Placing order...'; }
    const orderMsgEl = document.getElementById('orderMsg');
    if (orderMsgEl) orderMsgEl.textContent = '';

    try {
      const res = await fetch('/order', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(()=>({}));
      if (res.ok && json && json.success) {
        if (orderMsgEl) orderMsgEl.textContent = json.message || 'Thank you — our team will contact you shortly.';
        localStorage.removeItem(CART_KEY);
        render();
        const waBtn = document.getElementById('checkoutWhats');
        if (waBtn) {
          waBtn.disabled = false;
          waBtn.onclick = () => {
            const wa = buildWhatsAppText(payload);
            window.open(`https://wa.me/918553334247?text=${encodeURIComponent(wa)}`, '_blank');
          };
        }
      } else {
        savePendingOrder(payload);
        if (orderMsgEl) orderMsgEl.textContent = 'Order saved locally (server error).';
        err('order fail', json);
      }
    } catch (e) {
      err('network error', e);
      savePendingOrder(payload);
      if (orderMsgEl) orderMsgEl.textContent = 'Network error — order saved locally.';
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Place Order'; }
    }
  }

  // BIND HANDLERS
  function bindHandlers(){
    const list = document.getElementById('cartList');
    if (!list) return;

    // delegated remove
    list.addEventListener('click', (e) => {
      const rem = e.target.closest && e.target.closest('.remove');
      if (rem) {
        const sku = rem.dataset.sku;
        if (!sku) return;
        if (!confirm('Remove this item from cart?')) return;
        handleRemove(sku);
      }
    });

    // manual qty input (delegated)
    list.addEventListener('input', (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('qty-input')) {
        const sku = e.target.dataset.sku;
        let v = Number(e.target.value);
        if (!v || v < 1) v = 1;
        const cart = loadCart();
        if (!cart[sku]) return;
        cart[sku].qtyKg = v;
        saveCart(cart); // render() will be called by saveCart
      }
    });

    // Clear cart
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      if (!confirm('Clear cart?')) return;
      clearCart();
    });

    // Place order
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) checkoutBtn.addEventListener('click', placeOrder);

    // WhatsApp (build summary from current cart)
    const waBtn = document.getElementById('checkoutWhats');
    if (waBtn) {
      waBtn.disabled = true;
      waBtn.addEventListener('click', () => {
        const cart = loadCart(); const items = Object.values(cart || {});
        if (!items.length) { alert('Cart empty'); return; }
        let msg = 'Hello SDB Plantation, I would like to order:%0A';
        items.forEach(it => msg += `- ${it.name}: ${it.qtyKg} kg @ ₹${Number(it.price).toFixed(2)}/kg = ₹${(Number(it.qtyKg)*Number(it.price)).toFixed(2)}%0A`);
        msg += `%0ATotal items: ${items.length}%0ATotal kg: ${items.reduce((s,i)=> s + Number(i.qtyKg||0),0)} kg%0AGrand total: ₹${items.reduce((s,i)=> s + (Number(i.qtyKg||0)*Number(i.price||0)),0).toFixed(2)}`;
        window.open(`https://wa.me/918553334247?text=${encodeURIComponent(msg)}`, '_blank');
      });
    }
  }

  // Listen storage changes from other tabs
  window.addEventListener('storage', (ev) => {
    if (!ev.key || ev.key === 'cartUpdatedAt' || ev.key === CART_KEY) {
      render();
    }
  });

  // INIT
  document.addEventListener('DOMContentLoaded', () => {
    render();
    bindHandlers();
    log('cart.js initialized');
  });

  // debug helpers
  window.__cartDebug = { loadCart, saveCart, render, clearCart };
})();
