// cart.js — Clean, safe, full-featured cart page script
(function () {
  const CART_KEY = 'sdb_cart_v3';
  const PENDING_KEY = 'pendingOrders';
  const LOG = '[cart]';
  function log(...a){ try{ console.log(LOG, ...a) }catch(e){} }
  function err(...a){ try{ console.error(LOG, ...a) }catch(e){} }

  // safe JSON parse
  function safeParse(v){ try { return JSON.parse(v || '{}'); } catch(e) { err('parse', e); return {}; } }
  function loadCart(){ return safeParse(localStorage.getItem(CART_KEY)); }
  function saveCart(cart, { renderNow=true } = {}) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      // notify other tabs
      try { localStorage.setItem('cartUpdatedAt', Date.now().toString()); } catch(e){}
      if (renderNow) render();
    } catch(e) { err('saveCart', e); }
  }

  function escapeHtml(s){ if (!s && s !== 0) return ''; return String(s).replace(/[&<>"']/g, m=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m])); }

  // carats helper: 1 carat = 20 kg
  function caratsFromKg(kg){
    const n = Number(kg) || 0;
    if (n <= 0) return '';
    const c = n / 20;
    // show integer as "1 carat" else "1.25 carats"
    return c % 1 === 0 ? `${c} carat${c===1?'':'s'}` : `${c.toFixed(2)} carats`;
  }

  // totals helper
  function computeTotals(items){
    const totalKg = items.reduce((s,i) => s + (Number(i.qtyKg)||0), 0);
    const totalAmount = items.reduce((s,i) => s + ((Number(i.qtyKg)||0) * (Number(i.price)||0)), 0);
    return { totalKg, totalAmount };
  }

  // Render full cart list into #cartList
function render() {
  const cart = loadCart();
  const list = document.getElementById("cartList");

  list.innerHTML = "";
  const items = Object.values(cart);

  if (!items.length) {
    list.innerHTML = `<div class="small">Your cart is empty. <a href="/">Continue shopping</a>.</div>`;
    updateTotals(items);
    return;
  }

  items.forEach(it => {
    const div = document.createElement("div");
    div.className = "cart-item";

    const carats = it.qtyKg / 20;
    const caratLabel = carats > 0
      ? `(${carats % 1 === 0 ? carats + " carat" : carats.toFixed(2) + " carats"})`
      : "";

    div.innerHTML = `
      <img src="${escapeHtml(it.img)}" class="item-img">

      <div class="item-info">
        <h3 class="item-title">${escapeHtml(it.name)}</h3>
        <div class="item-price">₹${Number(it.price).toFixed(2)} / kg</div>

        <div class="qty-row">
          <label style="font-weight:600;">Qty:</label>
          <input 
            class="qty-input"
            type="number"
            min="1"
            step="1"
            data-sku="${escapeHtml(it.sku)}"
            value="${it.qtyKg}"
          >
          <span class="carat-label">${caratLabel}</span>
        </div>

        <div class="line-total">
          ₹${(it.qtyKg * it.price).toFixed(2)}
        </div>
      </div>

      <button class="remove" data-sku="${escapeHtml(it.sku)}">Remove</button>
    `;

    list.appendChild(div);
  });

  updateTotals(items);
}


    // create fragment for better perf
    const frag = document.createDocumentFragment();
    items.forEach(it => {
      const sku = it.sku || it.SKU || '';
      const imgSrc = escapeHtml(it.img || '/images/placeholder.png');
      const name = escapeHtml(it.name || sku || 'Item');
      const priceNum = Number(it.price) || 0;
      const qtyKg = Number(it.qtyKg) || 0;
      const lineTotal = (priceNum * qtyKg);

      // container
      const card = document.createElement('div');
      card.className = 'card cart-item';
      card.dataset.sku = sku;

      // inner HTML (kept safe with escapeHtml)
      card.innerHTML = `
        <div style="display:flex;gap:12px;align-items:center;">
          <img src="${imgSrc}" alt="${name}" style="width:86px;height:86px;object-fit:cover;border-radius:8px;flex-shrink:0">
          <div style="flex:1;min-width:0">
            <div style="display:flex;justify-content:space-between;align-items:start;gap:8px">
              <div style="min-width:0">
                <h3 style="margin:0;font-size:16px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</h3>
                <div style="color:#6b7280;margin-top:6px">₹${priceNum.toFixed(2)} / kg</div>
              </div>
              <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
                <button class="remove-btn" data-sku="${escapeHtml(sku)}" type="button" style="background:#fff;border:1px solid #f0e6e6;padding:6px 8px;border-radius:8px;cursor:pointer">Remove</button>
                <div style="font-weight:900;font-size:18px">₹ ${lineTotal.toFixed(2)}</div>
              </div>
            </div>

            <div style="margin-top:10px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
              <div>Quantity: <strong>${qtyKg}</strong> kg</div>
              <div style="color:#2f9e44;font-weight:700">(${caratsFromKg(qtyKg)})</div>
            </div>
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

  // Remove item handler (delegated)
  function handleRemove(sku){
    const cart = loadCart();
    if (!cart || !cart[sku]) return;
    delete cart[sku];
    saveCart(cart, { renderNow: true });
  }

  // Clear cart
  function clearCart(){
    localStorage.removeItem(CART_KEY);
    // also notify
    try { localStorage.setItem('cartUpdatedAt', Date.now().toString()); } catch(e){}
    render();
  }

  // Save pending orders locally (fallback if server unavailable)
  function savePendingOrder(payload){
    try {
      const arr = safeParse(localStorage.getItem(PENDING_KEY) || '[]');
      arr.push(payload);
      localStorage.setItem(PENDING_KEY, JSON.stringify(arr));
    } catch(e){ err('save pending', e); }
  }

  // Build WhatsApp text (encoded later)
  function buildWhatsAppText(payload){
    const cust = payload.customer || {};
    let txt = `Order from ${cust.name||'-'} (${cust.phone||'-'})%0A`;
    payload.items.forEach(it => {
      txt += `- ${it.name}: ${it.qtyKg} kg @ ₹${Number(it.price).toFixed(2)}/kg = ₹${(Number(it.qtyKg)||0 * Number(it.price)||0).toFixed(2)}%0A`;
    });
    txt += `%0ATotal kg: ${payload.totalKg}%0AGrand total: ₹${payload.totalAmount.toFixed(2)}`;
    return txt;
  }

  // Place order (POST to /order)
  async function placeOrder(){
    const cart = loadCart();
    const items = Object.values(cart || {});
    if (!items.length) { alert('Cart empty'); return; }

    const name = document.getElementById('custName')?.value?.trim();
    const phone = document.getElementById('custPhone')?.value?.trim();
    const address = document.getElementById('custAddress')?.value?.trim();
    if (!name || !phone || !address) { alert('Please fill name, phone and address'); return; }

    const payload = {
      customer: { name, phone, address },
      items: items.map(it => ({
        sku: it.sku, name: it.name, qtyKg: Number(it.qtyKg)||0, price: Number(it.price)||0, img: it.img || ''
      })),
      totalKg: items.reduce((s,i) => s + (Number(i.qtyKg)||0), 0),
      totalAmount: items.reduce((s,i) => s + ((Number(i.qtyKg)||0) * (Number(i.price)||0)), 0)
    };

    const btn = document.getElementById('checkoutBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Placing order...'; }
    document.getElementById('orderMsg') && (document.getElementById('orderMsg').textContent = '');

    try {
      const res = await fetch('/order', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(()=>({}));
      if (res.ok && json && json.success) {
        document.getElementById('orderMsg') && (document.getElementById('orderMsg').textContent = json.message || 'Thank you — our team will contact you shortly.');
        // clear cart
        localStorage.removeItem(CART_KEY);
        render();
        // enable WhatsApp confirm if present
        const waBtn = document.getElementById('checkoutWhats');
        if (waBtn) {
          waBtn.disabled = false;
          waBtn.onclick = () => {
            const wa = buildWhatsAppText(payload);
            window.open(`https://wa.me/918553334247?text=${encodeURIComponent(wa)}`, '_blank');
          };
        }
      } else {
        // save pending and show message
        savePendingOrder(payload);
        document.getElementById('orderMsg') && (document.getElementById('orderMsg').textContent = 'Order received locally (server error). We will retry later.');
        err('order fail', json);
      }
    } catch (e) {
      err('network error', e);
      savePendingOrder(payload);
      document.getElementById('orderMsg') && (document.getElementById('orderMsg').textContent = 'Network error — order saved locally.');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Place Order'; }
    }
  }

  // Hook up event listeners
  function bindHandlers(){
    const list = document.getElementById('cartList');
    if (!list) return;

    // Delegated click handling for Remove and future buttons
    list.addEventListener('click', (e) => {
      const rem = e.target.closest && e.target.closest('.remove-btn');
      if (rem) {
        const sku = rem.dataset.sku;
        if (!sku) return;
        if (!confirm('Remove this item from cart?')) return;
        handleRemove(sku);
      }
    });

    // Clear cart
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      if (!confirm('Clear cart?')) return;
      clearCart();
    });

    // Checkout (place order)
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) checkoutBtn.addEventListener('click', placeOrder);

    // WhatsApp confirm (build message from current cart)
    const waBtn = document.getElementById('checkoutWhats');
    if (waBtn) {
      waBtn.disabled = true; // enabled only after successful place order, or you can change policy
      waBtn.addEventListener('click', () => {
        const cart = loadCart(); const items = Object.values(cart || {});
        if (!items.length) { alert('Cart empty'); return; }
        let msg = 'Hello SDB Plantation, I would like to order:%0A';
        items.forEach(it => msg += `- ${it.name}: ${it.qtyKg} kg @ ₹${Number(it.price).toFixed(2)}/kg = ₹${(Number(it.qtyKg)||0 * Number(it.price)||0).toFixed(2)}%0A`);
        msg += `%0ATotal items: ${items.length}%0ATotal kg: ${items.reduce((s,i)=> s + Number(i.qtyKg||0),0)} kg%0AGrand total: ₹${items.reduce((s,i)=> s + (Number(i.qtyKg||0)*Number(i.price||0)),0).toFixed(2)}`;
        window.open(`https://wa.me/918553334247?text=${encodeURIComponent(msg)}`, '_blank');
      });
    }
  }

  // Listen for storage changes (other tabs) and re-render
  window.addEventListener('storage', (ev) => {
    if (!ev.key || ev.key === 'cartUpdatedAt' || ev.key === CART_KEY) {
      render();
    }
  });

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    render();
    bindHandlers();
    log('cart.js initialized');
  });

  // Expose small debug helpers
  window.__cartDebug = {
    loadCart, saveCart, render, clearCart
  };
})();

