// script.js — final: add-to-cart WITHOUT redirect; go to cart only when Cart button clicked
(() => {
  const CART_KEY = 'sdb_cart_v3';
  const DEFAULT_KG = 200;
  const TOAST_MS = 1400;

  const log = (...a) => console.log('[shop]', ...a);
  const err = (...a) => console.error('[shop]', ...a);

  // Version marker so you can verify the correct file is served
  log('script loaded (final no-redirect v1)');

  function safeParse(v){ try { return JSON.parse(v || '{}'); } catch(e){ err('parse error', e); return {}; } }
  function loadCart(){ return safeParse(localStorage.getItem(CART_KEY)); }
  function saveCart(cart){ try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); updateUI(cart); } catch(e){ err('save error', e); } }

  function updateUI(cart){
    cart = cart || {};
    const count = Object.keys(cart).length;
    const elCount = document.getElementById('cartCount');
    if (elCount) elCount.textContent = count;
    const elFab = document.getElementById('cartFabCount');
    if (elFab) elFab.textContent = count;
    document.querySelectorAll('.card').forEach(card => {
      try {
        const sku = card.dataset.sku;
        const span = card.querySelector('.in-cart');
        if (span) span.textContent = cart[sku] ? cart[sku].qtyKg : 0;
      } catch(e){}
    });
  }

  function showToast(msg){
    try {
      let t = document.getElementById('sdb-toast');
      if (!t) {
        t = document.createElement('div');
        t.id = 'sdb-toast';
        Object.assign(t.style, {
          position: 'fixed', right: '18px', bottom: '86px',
          background: '#2f9e44', color: '#fff', padding: '10px 14px',
          borderRadius: '10px', boxShadow: '0 8px 22px rgba(0,0,0,0.18)',
          zIndex: 99999, fontWeight: 700, fontFamily: 'Inter, system-ui, sans-serif'
        });
        document.body.appendChild(t);
      }
      t.textContent = msg;
      t.style.opacity = '1';
      clearTimeout(t._timer);
      t._timer = setTimeout(()=> { try { t.style.transition = 'opacity .25s'; t.style.opacity = '0'; } catch(e){} }, TOAST_MS);
    } catch(e){ err('toast error', e); }
  }

  function addToCartFromCard(card){
    if (!card) { err('addToCartFromCard: no card'); return; }
    const sku = card.dataset.sku;
    if (!sku) { err('card missing sku'); return; }
    const name = card.dataset.name || card.querySelector('h3')?.innerText || sku;
    const price = Number(card.dataset.price) || 0;
    const img = card.querySelector('img')?.getAttribute('src') || '';

    const cart = loadCart();
    if (cart[sku]) cart[sku].qtyKg = Number(cart[sku].qtyKg) + DEFAULT_KG;
    else cart[sku] = { sku, name, qtyKg: DEFAULT_KG, price, img };

    saveCart(cart);
    showToast(`Added ${DEFAULT_KG} kg — ${name}`);

    const btn = card.querySelector('.add-btn');
    if (btn) {
      const prev = btn.innerHTML;
      btn.innerHTML = 'Added ✓';
      btn.disabled = true;
      setTimeout(()=> { try { btn.innerHTML = prev; btn.disabled = false; } catch(e){} }, 700);
    }

    log('Added to cart:', sku, DEFAULT_KG);
    // IMPORTANT: NO redirect here — user stays on the same page.
  }

  function onDocumentClick(e){
    const addBtn = e.target.closest && e.target.closest('.add-btn');
    if (addBtn) {
      e.preventDefault();
      const card = addBtn.closest('.card');
      if (!card) { err('add-btn clicked but card not found'); return; }
      addToCartFromCard(card);
      return;
    }

    // Only these buttons navigate to cart page:
    if (e.target.closest && e.target.closest('#openCart')) {
      e.preventDefault();
      window.location.href = '/cart.html';
      return;
    }
    if (e.target.closest && e.target.closest('#cartFab')) {
      e.preventDefault();
      window.location.href = '/cart.html';
      return;
    }
  }

  function bindDirectOnce(){
    document.querySelectorAll('.add-btn').forEach(btn => {
      if (btn._sdbBound) return;
      btn._sdbBound = true;
      btn.addEventListener('click', (ev) => {
        ev.preventDefault();
        const card = btn.closest('.card');
        if (!card) { err('direct add-btn clicked but no card'); return; }
        addToCartFromCard(card);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    updateUI(loadCart());
    document.addEventListener('click', onDocumentClick, true);
    bindDirectOnce();
    log('final no-redirect script ready — Add will not navigate; use Cart to go to cart page');
  });

  // expose for debugging
  window.SDBDebug = { loadCart, saveCart, addToCartFromCard, updateUI };
})();
