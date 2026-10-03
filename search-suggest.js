/* =========================================================
   Weighspot Scales - Search Suggestions (Autocomplete)
   Works on every page that has <input id="searchInput">
   ========================================================= */
(function () {
    'use strict';

    var SUPABASE_URL = 'https://ukemuqyzflbqridefzox.supabase.co';
    var SUPABASE_KEY = 'sb_publishable_a6vdgDr-K2G5Mq3kQ96CWQ_M41zMEMq';
    var MAX_SUGGESTIONS = 8;

    /* ---------- CSS ---------- */
    var css = '\
    .search-bar.ws-suggest-host, .nav-search-bar.ws-suggest-host { position: relative; }\
    .search-bar.ws-suggest-host > i.fa-search, .nav-search-bar.ws-suggest-host > i.fa-search {\
        width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center;\
        border-radius: 50%; right: 5px; font-size: 13px; box-shadow: 0 2px 6px rgba(4,76,161,0.3);\
        transition: all 0.3s ease;\
    }\
    .search-bar.ws-suggest-host > i.fa-search:hover, .nav-search-bar.ws-suggest-host > i.fa-search:hover {\
        transform: translateY(-50%) scale(1.08); box-shadow: 0 4px 12px rgba(4,76,161,0.4);\
    }\
    .search-bar.ws-suggest-host input, .nav-search-bar.ws-suggest-host input { padding-right: 46px; }\
    .search-bar .ws-suggest-box i, .nav-search-bar .ws-suggest-box i {\
        position: static; transform: none; background: none; padding: 0; border-radius: 0; width: auto; height: auto;\
        box-shadow: none; display: inline-block; right: auto; top: auto; cursor: inherit; color: #044ca1;\
    }\
    .search-bar .ws-suggest-box .ws-suggest-empty i, .nav-search-bar .ws-suggest-box .ws-suggest-empty i { color: #666; margin-right: 6px; }\
    .ws-suggest-box {\
        position: absolute; top: calc(100% + 6px); left: 0; right: 0; background: #fff;\
        border: 1px solid #e0e0e0; border-radius: 12px; box-shadow: 0 12px 36px rgba(0,0,0,0.18);\
        z-index: 100000; overflow: hidden; display: none; max-height: 420px; overflow-y: auto;\
        text-align: left; min-width: 260px;\
    }\
    .ws-suggest-box.show { display: block; animation: wsSuggestIn 0.2s ease; }\
    @keyframes wsSuggestIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }\
    .ws-suggest-item {\
        display: flex; align-items: center; gap: 12px; padding: 9px 14px; cursor: pointer;\
        border-bottom: 1px solid #f1f1f1; transition: background 0.15s ease; color: #1a1a1a;\
    }\
    .ws-suggest-item:last-child { border-bottom: none; }\
    .ws-suggest-item:hover, .ws-suggest-item.active { background: #e8f0fe; }\
    .ws-suggest-thumb {\
        width: 44px; height: 44px; flex-shrink: 0; border-radius: 8px; background: #f5f5f5;\
        border: 1px solid #e0e0e0; display: flex; align-items: center; justify-content: center; overflow: hidden;\
    }\
    .ws-suggest-thumb img { width: 100%; height: 100%; object-fit: contain; padding: 3px; }\
    .ws-suggest-thumb i { color: #044ca1; font-size: 16px; }\
    .ws-suggest-text { flex: 1; min-width: 0; }\
    .ws-suggest-name {\
        font-size: 13px; font-weight: 600; color: #1a1a1a; white-space: nowrap; overflow: hidden;\
        text-overflow: ellipsis;\
    }\
    .ws-suggest-name mark { background: #fff3b0; color: inherit; padding: 0 1px; border-radius: 2px; }\
    .ws-suggest-meta { font-size: 11px; color: #044ca1; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\
    .ws-suggest-price { font-size: 12px; font-weight: 700; color: #044ca1; white-space: nowrap; }\
    .ws-suggest-price.ask { color: #f39c12; }\
    .ws-suggest-all {\
        background: #fafafa; justify-content: center; color: #044ca1; font-weight: 700; font-size: 12.5px;\
    }\
    .ws-suggest-all i { margin-right: 6px; }\
    .ws-suggest-empty { padding: 16px; text-align: center; font-size: 13px; color: #666; }\
    @media (max-width: 768px) {\
        .ws-suggest-box { max-height: 340px; }\
        .ws-suggest-thumb { width: 38px; height: 38px; }\
        .ws-suggest-name { font-size: 12px; }\
        .ws-suggest-price { font-size: 11px; }\
    }';

    var styleEl = document.createElement('style');
    styleEl.setAttribute('data-ws-suggest', 'true');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    /* ---------- Helpers ---------- */
    function normalize(text) {
        return String(text || '').toLowerCase().replace(/[\s\-_\.\,\(\)\[\]\{\}\/\\]+/g, '');
    }

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function highlight(name, query) {
        var safe = esc(name);
        var q = String(query || '').trim();
        if (!q) return safe;
        var escQ = esc(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        try {
            return safe.replace(new RegExp('(' + escQ + ')', 'ig'), '<mark>$1</mark>');
        } catch (e) {
            return safe;
        }
    }

    function productLink(p) {
        return p.slug ? '/product/' + p.slug : '/product-detail.html?id=' + p.id;
    }

    function productImage(p) {
        if (Array.isArray(p.images) && p.images.length > 0 && p.images[0]) return p.images[0];
        return p.image || '';
    }

    function score(p, q, nq) {
        var name = String(p.name || '').toLowerCase();
        var nName = normalize(p.name);
        var nCat = normalize(p.category);
        var nModel = normalize(p.model_number);
        var nDesc = normalize(p.description);
        if (name.indexOf(q) === 0 || nName.indexOf(nq) === 0) return 100;
        if (nName.indexOf(nq) !== -1) return 80;
        if (nModel && nModel.indexOf(nq) !== -1) return 70;
        if (nCat.indexOf(nq) !== -1) return 50;
        if (nDesc && nDesc.indexOf(nq) !== -1) return 20;
        return 0;
    }

    /* ---------- Data ---------- */
    var allProducts = null;
    var loading = null;

    function getClient() {
        if (window.__wsSuggestClient) return Promise.resolve(window.__wsSuggestClient);
        return new Promise(function (resolve, reject) {
            function make() {
                try {
                    window.__wsSuggestClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
                    resolve(window.__wsSuggestClient);
                } catch (e) { reject(e); }
            }
            if (window.supabase && window.supabase.createClient) { make(); return; }
            var s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            s.onload = make;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    function loadProducts() {
        if (allProducts) return Promise.resolve(allProducts);
        if (loading) return loading;
        loading = getClient().then(function (client) {
            return client.from('products').select('*');
        }).then(function (res) {
            if (res.error) throw res.error;
            allProducts = res.data || [];
            return allProducts;
        }).catch(function (err) {
            console.error('Search suggestions: could not load products', err);
            loading = null;
            allProducts = [];
            return allProducts;
        });
        return loading;
    }

    /* ---------- UI ---------- */
    function init() {
        var input = document.getElementById('searchInput');
        if (!input) return;

        var host = input.parentElement;
        host.classList.add('ws-suggest-host');
        input.setAttribute('autocomplete', 'off');

        var box = document.createElement('div');
        box.className = 'ws-suggest-box';
        box.setAttribute('role', 'listbox');
        host.appendChild(box);

        var items = [];
        var activeIndex = -1;
        var debounceTimer = null;

        function close() {
            box.classList.remove('show');
            activeIndex = -1;
        }

        function setActive(i) {
            var nodes = box.querySelectorAll('.ws-suggest-item');
            nodes.forEach(function (n) { n.classList.remove('active'); });
            if (i >= 0 && nodes[i]) {
                nodes[i].classList.add('active');
                nodes[i].scrollIntoView({ block: 'nearest' });
            }
            activeIndex = i;
        }

        function goSearch(query) {
            window.location.href = '/products.html?search=' + encodeURIComponent(query);
        }

        function render(query) {
            var q = query.trim().toLowerCase();
            var nq = normalize(query);
            if (!nq) { close(); return; }

            var matches = (allProducts || []).map(function (p) {
                return { p: p, s: score(p, q, nq) };
            }).filter(function (x) { return x.s > 0; })
              .sort(function (a, b) { return b.s - a.s || String(a.p.name || '').localeCompare(String(b.p.name || '')); })
              .slice(0, MAX_SUGGESTIONS);

            items = matches.map(function (x) { return x.p; });

            var html = '';
            if (items.length === 0) {
                html += '<div class="ws-suggest-empty"><i class="fas fa-search"></i> No matching products found</div>';
            } else {
                items.forEach(function (p, i) {
                    var img = productImage(p);
                    var thumb = img
                        ? '<img src="' + esc(img) + '" alt="" onerror="this.parentElement.innerHTML=\'<i class=&quot;fas fa-weight-scale&quot;></i>\'">'
                        : '<i class="fas fa-weight-scale"></i>';
                    var price = p.stock_status === 'ask-price'
                        ? '<span class="ws-suggest-price ask">Ask for Price</span>'
                        : '<span class="ws-suggest-price">PKR ' + (Number(p.price) || 0).toLocaleString() + '</span>';
                    html += '<div class="ws-suggest-item" role="option" data-index="' + i + '">' +
                        '<div class="ws-suggest-thumb">' + thumb + '</div>' +
                        '<div class="ws-suggest-text">' +
                        '<div class="ws-suggest-name">' + highlight(p.name || 'Product', query.trim()) + '</div>' +
                        '<div class="ws-suggest-meta">' + esc(p.category || 'Uncategorized') + '</div>' +
                        '</div>' + price + '</div>';
                });
                html += '<div class="ws-suggest-item ws-suggest-all" data-all="1"><i class="fas fa-search"></i> See all results for "' + esc(query.trim()) + '"</div>';
            }
            box.innerHTML = html;
            box.classList.add('show');
            activeIndex = -1;
        }

        function onInput() {
            var value = input.value;
            clearTimeout(debounceTimer);
            if (!value.trim()) { close(); return; }
            debounceTimer = setTimeout(function () {
                if (allProducts) { render(value); }
                else { loadProducts().then(function () { if (input.value === value) render(value); }); }
            }, 120);
        }

        input.addEventListener('input', onInput);
        input.addEventListener('focus', function () {
            loadProducts();
            if (input.value.trim() && allProducts) render(input.value);
        });

        input.addEventListener('keydown', function (e) {
            var nodes = box.querySelectorAll('.ws-suggest-item');
            var open = box.classList.contains('show') && nodes.length > 0;

            if (e.key === 'ArrowDown' && open) {
                e.preventDefault();
                setActive(activeIndex + 1 >= nodes.length ? 0 : activeIndex + 1);
            } else if (e.key === 'ArrowUp' && open) {
                e.preventDefault();
                setActive(activeIndex - 1 < 0 ? nodes.length - 1 : activeIndex - 1);
            } else if (e.key === 'Enter' && open && activeIndex >= 0) {
                e.preventDefault();
                e.stopImmediatePropagation();
                var node = nodes[activeIndex];
                if (node.getAttribute('data-all')) goSearch(input.value.trim());
                else window.location.href = productLink(items[Number(node.getAttribute('data-index'))]);
            } else if (e.key === 'Escape') {
                close();
            }
        }, true);

        box.addEventListener('mousedown', function (e) { e.preventDefault(); });

        box.addEventListener('click', function (e) {
            var node = e.target.closest ? e.target.closest('.ws-suggest-item') : null;
            if (!node) return;
            if (node.getAttribute('data-all')) goSearch(input.value.trim());
            else window.location.href = productLink(items[Number(node.getAttribute('data-index'))]);
        });

        box.addEventListener('mousemove', function (e) {
            var node = e.target.closest ? e.target.closest('.ws-suggest-item') : null;
            if (!node) return;
            var nodes = Array.prototype.slice.call(box.querySelectorAll('.ws-suggest-item'));
            var idx = nodes.indexOf(node);
            if (idx !== activeIndex) setActive(idx);
        });

        document.addEventListener('click', function (e) {
            if (!host.contains(e.target)) close();
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();