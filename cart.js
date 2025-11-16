// cart.js — updated: POST to /order, wait for response, do NOT auto-open WhatsApp
(() => {
  const CART_KEY = 'sdb_cart_v3';
  const LOG = '[cart]';
  function log(...a){ try{ console.log(LOG, ...a) }catch(e){} }
  function err(...a){ try{ console.error(LOG, ...a) }catch(e){} }

  function safeParse(v){ try{ return JSON.parse(v||'{}'); } catch(e){ err('parse error', e); return {}; } }
  function loadCart(){ return safeParse(localStorage.getItem(CART_KEY)); }
  function saveCart(cart){ try{ localStorage.setItem(CART_KEY, JSON.stringify(cart)); render(); } catch(e){ err('save error', e); } }

  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, m=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m])); }

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
      div.innerHTML = `
        <img src="${escapeHtml(it.img)}" alt="${escapeHtml(it.name)}">
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong>${escapeHtml(it.name)}</strong>
            <button data-sku="${escapeHtml(it.sku)}" class="remove">Remove</button>
          </div>
          <div style="margin-top:8px">
            <div class="small">Price: ₹${Number(it.price).toFixed(2)} / kg</div>
            <div style="margin-top:8px">
              <label class="small">Qty (kg)</label>
              <input class="qty" type="number" min="1" step="1" value="${it.qtyKg}" data-sku="${escapeHtml(it.sku)}">
            </div>
          </div>
        </div>
        <div style="min-width:120px;text-align:right">
          <div class="small">Line total</div>
          <div style="font-weight:900">₹${(it.qtyKg * it.price).toFixed(2)}</div>
        </div>
      `;
      list.appendChild(div);
    });
    updateTotals(items);
    document.getElementById('totalItems').textContent = items.length;
  }

  function updateTotals(items){
    items = items || Object.values(loadCart());
    const totalKg = items.reduce((s,i) => s + Number(i.qtyKg || 0), 0);
    const grand = items.reduce((s,i) => s + (Number(i.qtyKg || 0) * Number(i.price || 0)), 0);
    const totalKgEl = document.getElementById('totalKg');
    const grandEl = document.getElementById('grandTotal');
    if (totalKgEl) totalKgEl.textContent = totalKg;
    if (grandEl) grandEl.textContent = grand.toFixed(2);
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

    // removal
    list.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove')) {
        const sku = e.target.dataset.sku;
        const cart = loadCart();
        if (cart[sku]) { delete cart[sku]; saveCart(cart); log('removed', sku); }
      }
    });

    // qty change
    list.addEventListener('input', (e) => {
      if (e.target.classList.contains('qty')) {
        const sku = e.target.dataset.sku;
        let val = Math.round(Number(e.target.value) || 0);
        if (!val || val < 1) val = 1;
        const cart = loadCart();
        if (cart[sku]) { cart[sku].qtyKg = val; saveCart(cart); log('qty updated', sku, val); }
      }
    });

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

      // build payload
      const payload = {
        customer:{ name, phone, address },
        items: items.map(it => ({ sku: it.sku, name: it.name, qtyKg: Number(it.qtyKg), price: Number(it.price), img: it.img })),
        totalKg: items.reduce((s,i)=> s + Number(i.qtyKg || 0), 0),
        totalAmount: items.reduce((s,i)=> s + (Number(i.qtyKg || 0) * Number(i.price || 0)), 0)
      };

      // disable button while posting
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
          const orderId = json.orderId || 'N/A';
          document.getElementById('orderMsg').textContent = 'Order saved. ID: ' + orderId;
          // clear local cart now that server saved it
          localStorage.removeItem(CART_KEY);
          render();

          // enable WhatsApp button and set behavior — but DO NOT auto-open
          if (checkoutWhats) {
            checkoutWhats.disabled = false;
            checkoutWhats.onclick = () => {
              const wa = buildWhatsAppMessage(payload, name, phone);
              window.open(`https://wa.me/918553334247?text=${encodeURIComponent(wa)}`, '_blank');
            };
          }
        } else {
          // server returned non-success
          console.error('order save failed', json);
          document.getElementById('orderMsg').textContent = 'Server error saving order. Try again.';
        }
      } catch (err) {
        console.error('network/order error', err);
        document.getElementById('orderMsg').textContent = 'Network error saving order.';
      } finally {
        // restore button
        if (checkoutBtn) { checkoutBtn.disabled = false; checkoutBtn.textContent = 'Place Order'; }
      }
    });

    // Confirm via WhatsApp (manual) — keep disabled until server success
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
