(function() {
  'use strict';

  var allProducts = [];
  var gadgetCategories = [];
  var applianceCategories = [];
  var productModal = null;
  var modalContent = null;

  /* ---- Utility ---- */
  function stars(rating, size) {
    var num = parseFloat(rating) || 0;
    var full = Math.floor(num);
    var half = num % 1 >= 0.25 && num % 1 < 0.75;
    var empty = 5 - full - (half ? 1 : 0);
    var s = size || 14;
    var html = '<span class="stars">';
    for (var i = 0; i < full; i++) html += '<svg class="fill" viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
    if (half) html += '<svg class="fill" viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="currentColor"><defs><linearGradient id="half"><stop offset="50%" stop-color="currentColor"/><stop offset="50%" stop-color="transparent"/></linearGradient></defs><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="url(#half)" stroke="currentColor" stroke-width="1"/></svg>';
    for (var j = 0; j < empty; j++) html += '<svg class="empty" viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
    html += '</span>';
    return html;
  }

  function ratingHTML(rating) {
    var r = parseFloat(rating) || 0;
    if (r <= 0) return '';
    return '<div class="product-card-rating">' + stars(r, 14) + '<span class="rating-value">' + r.toFixed(1) + '</span></div>';
  }

  function priceHTML(price) {
    if (!price) return '';
    return '<span class="product-card-price">' + price + '</span>';
  }

  function brandBadge(brand) {
    if (!brand) return '';
    return '<span class="product-card-brand">' + escapeHtml(brand) + '</span>';
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /* ---- Loading / Fallback ---- */
  function showSpinner(section) {
    var el = document.querySelector('[data-spinner="' + section + '"]');
    if (el) el.style.display = 'flex';
  }

  function hideSpinner(section) {
    var el = document.querySelector('[data-spinner="' + section + '"]');
    if (el) el.style.display = 'none';
  }

  function showFallback(section) {
    hideSpinner(section);
    var el = document.querySelector('[data-fallback="' + section + '"]');
    if (el) el.style.display = 'block';
  }

  function hideFallback(section) {
    var el = document.querySelector('[data-fallback="' + section + '"]');
    if (el) el.style.display = 'none';
  }

  /* ---- Product Card ---- */
  function productCardHTML(p, trending) {
    var rating = ratingHTML(p.rating);
    var price = priceHTML(p.price);
    var brand = brandBadge(p.brand);
    var specsHtml = '';
    var specKeys = ['display', 'processor', 'ram', 'storage', 'camera', 'battery'];
    for (var i = 0; i < specKeys.length; i++) {
      var val = p.specs[specKeys[i]];
      if (val) {
        var label = specKeys[i].charAt(0).toUpperCase() + specKeys[i].slice(1);
        specsHtml += '<span class="spec-pill" title="' + escapeHtml(label) + ': ' + escapeHtml(val) + '">' + escapeHtml(truncateSpec(val)) + '</span>';
      }
    }
    var releaseHtml = '';
    if (p.releaseDate) {
      var year = p.releaseDate.slice(0, 4);
      if (year > '2000') releaseHtml = '<span class="product-card-release">' + year + '</span>';
    }

    var trendingBadge = trending ? '<span class="trending-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>Trending</span>' : '';
    return '<article class="product-card' + (trending ? ' trending' : '') + '" data-product-id="' + escapeHtml(p.id) + '">' +
      '<div class="product-card-image">' +
        trendingBadge +
        '<img src="' + escapeHtml(p.image) + '" alt="' + escapeHtml(p.name) + '" loading="lazy">' +
        brand +
        (releaseHtml ? releaseHtml : '') +
      '</div>' +
      '<div class="product-card-body">' +
        '<h3 class="product-card-name">' + escapeHtml(p.name) + '</h3>' +
        (rating ? rating : '') +
        (specsHtml ? '<div class="product-card-specs">' + specsHtml + '</div>' : '') +
        '<div class="product-card-footer">' +
          (price ? price : '<span class="product-card-price-placeholder"></span>') +
          '<button class="btn btn-primary btn-sm view-details-btn" data-view-product="' + escapeHtml(p.id) + '">View Details</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function truncateSpec(val) {
    var s = String(val);
    if (s.length > 30) return s.slice(0, 27) + '...';
    return s;
  }

  function renderProductGrid(products, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var existing = container.querySelector('.product-grid');
    if (existing) existing.remove();
    var fallback = container.querySelector('.fallback-message');
    var spinner = container.querySelector('.loading-spinner');
    if (spinner) spinner.style.display = 'none';
    if (!products || products.length === 0) {
      if (fallback) fallback.style.display = 'block';
      return;
    }
    if (fallback) fallback.style.display = 'none';
    var grid = document.createElement('div');
    grid.className = 'product-grid';
    grid.innerHTML = products.map(function(p) { return productCardHTML(p); }).join('');
    if (spinner) {
      spinner.parentNode.insertBefore(grid, spinner.nextSibling);
    } else {
      container.appendChild(grid);
    }
  }

  /* ---- Featured Product (rotated) ---- */
  /* ---- Best Picks (one top per category) ---- */
  function renderBestPicks(products) {
    var container = document.getElementById('best-picks-grid');
    if (!container) return;
    var spinner = container.querySelector('[data-spinner="bestpicks"]');
    if (!products || products.length < 4) {
      if (spinner) spinner.style.display = 'none';
      return;
    }
    if (spinner) spinner.style.display = 'none';
    var picked = [];
    var usedCats = {};
    var sorted = products.slice().sort(function(a, b) { return (b.rating || 0) - (a.rating || 0); });
    sorted.forEach(function(p) {
      if (picked.length >= 6) return;
      if (!usedCats[p.category]) {
        usedCats[p.category] = true;
        picked.push(p);
      }
    });
    if (picked.length < 4) {
      sorted.forEach(function(p) {
        if (picked.length >= 6) return;
        if (picked.indexOf(p) === -1) picked.push(p);
      });
    }
    var grid = container.querySelector('.product-grid');
    if (grid) grid.remove();
    var gridEl = document.createElement('div');
    gridEl.className = 'product-grid';
    gridEl.innerHTML = picked.map(function(p) {
      return productCardHTML(p, true);
    }).join('');
    container.appendChild(gridEl);
  }

  /* ---- Latest Reviews (mixed gadgets + appliances) ---- */
  function renderLatestReviews(products) {
    var container = document.getElementById('latest-grid');
    if (!container) return;
    var spinner = container.querySelector('[data-spinner="latest"]');
    if (!products || products.length === 0) {
      if (spinner) spinner.style.display = 'none';
      var fallback = container.querySelector('[data-fallback="latest"]');
      if (fallback) fallback.style.display = 'block';
      return;
    }
    if (spinner) spinner.style.display = 'none';
    var fallback = container.querySelector('[data-fallback="latest"]');
    if (fallback) fallback.style.display = 'none';
    var gadgets = products.filter(function(p) {
      return ['phones','laptops','audio','gaming'].indexOf(p.category) !== -1;
    });
    var appliances = products.filter(function(p) {
      return ['refrigerators','washing-machines','vacuum-cleaners','air-fryers','kitchen-appliances'].indexOf(p.category) !== -1;
    });
    var selected = [];
    gadgets.slice(0, 4).forEach(function(p) { selected.push(p); });
    var appCount = Math.min(appliances.length, 3);
    for (var i = 0; i < appCount; i++) {
      selected.push(appliances[i]);
    }
    selected.sort(function() { return Math.random() - 0.5; });
    var existing = container.querySelector('.product-grid');
    if (existing) existing.remove();
    var grid = document.createElement('div');
    grid.className = 'product-grid';
    grid.innerHTML = selected.map(function(p) { return productCardHTML(p); }).join('');
    container.appendChild(grid);
  }

  /* ---- Browse Categories ---- */
  function renderBrowseCategories(categoryCounts) {
    var gadgetsContainer = document.getElementById('browse-gadgets');
    var appliancesContainer = document.getElementById('browse-appliances');
    if (!gadgetsContainer || !appliancesContainer) return;

    var gadgetsSpinner = gadgetsContainer.querySelector('[data-spinner="gadgets"]');
    var appliancesSpinner = appliancesContainer.querySelector('[data-spinner="appliances"]');
    if (gadgetsSpinner) gadgetsSpinner.style.display = 'none';
    if (appliancesSpinner) appliancesSpinner.style.display = 'none';

    var getCount = function(slug) {
      if (categoryCounts && categoryCounts[slug]) return categoryCounts[slug];
      return allProducts.filter(function(p) { return p.category && p.category.toLowerCase() === slug; }).length;
    };

    gadgetsContainer.innerHTML = gadgetCategories.map(function(c) {
      return '<a href="/' + c.slug + '/" class="category-card">' +
        '<div class="category-card-icon">' + c.icon + '</div>' +
        '<h3 class="category-card-title">' + c.name + '</h3>' +
        '<span class="category-card-count">' + getCount(c.slug) + ' products</span>' +
      '</a>';
    }).join('');

    appliancesContainer.innerHTML = applianceCategories.map(function(c) {
      return '<a href="/' + c.slug + '/" class="category-card">' +
        '<div class="category-card-icon">' + c.icon + '</div>' +
        '<h3 class="category-card-title">' + c.name + '</h3>' +
        '<span class="category-card-count">' + getCount(c.slug) + ' products</span>' +
      '</a>';
    }).join('');
  }

  /* ---- Comparison Spotlight ---- */
  var comparisonIdx = [0, 1];
  var detailCache = {};

  function enrichProduct(p) {
    if (!p || !p.id) return Promise.resolve(p);
    if (detailCache[p.id]) return Promise.resolve(detailCache[p.id]);
    return window.TSAPI.getProductDetail(p.id).then(function(detail) {
      if (detail && detail.specs) {
        var merged = {};
        for (var k in p) merged[k] = p[k];
        merged.specs = detail.specs;
        merged.rawSpecs = detail.rawSpecs || p.rawSpecs;
        detailCache[p.id] = merged;
        return merged;
      }
      detailCache[p.id] = p;
      return p;
    }).catch(function() {
      detailCache[p.id] = p;
      return p;
    });
  }

  function specRows() {
    return [
      { label: 'Display',  key: 'display' },
      { label: 'Chipset',  key: 'processor' },
      { label: 'RAM',      key: 'ram' },
      { label: 'Storage',  key: 'storage' },
      { label: 'Camera',   key: 'camera' },
      { label: 'Battery',  key: 'battery' },
      { label: 'OS',       key: 'os' },
      { label: 'Weight',   key: 'weight' },
      { label: 'Price',    key: '_price' }
    ];
  }

  function pickWinner(rows, p1, p2) {
    var w = {};
    rows.forEach(function(r) {
      if (r.key === '_price') {
        var pr1 = parseFloat((p1.price || '').replace(/[^0-9.]/g, '')) || Infinity;
        var pr2 = parseFloat((p2.price || '').replace(/[^0-9.]/g, '')) || Infinity;
        w[r.label] = pr1 < pr2 ? 1 : pr2 < pr1 ? 2 : 0;
        return;
      }
      var v1 = p1.specs[r.key] || '';
      var v2 = p2.specs[r.key] || '';
      if (!v1 && !v2) { w[r.label] = 0; return; }
      if (!v1) { w[r.label] = 2; return; }
      if (!v2) { w[r.label] = 1; return; }
      var n1 = parseFloat(v1.replace(/[^0-9.]/g, ''));
      var n2 = parseFloat(v2.replace(/[^0-9.]/g, ''));
      if (!isNaN(n1) && !isNaN(n2)) {
        w[r.label] = n1 > n2 ? 1 : n2 > n1 ? 2 : 0;
      } else {
        w[r.label] = 0;
      }
    });
    return w;
  }

  function buildComparisonHTML(p1, p2, loading) {
    var rows = specRows();
    var winners = pickWinner(rows, p1, p2);
    var tableRows = '';

    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      var v1, v2;
      if (row.key === '_price') {
        v1 = p1.price || '—';
        v2 = p2.price || '—';
      } else {
        v1 = p1.specs[row.key] || '—';
        v2 = p2.specs[row.key] || '—';
      }
      var w = winners[row.label];
      var cls1 = w === 1 ? ' comp-win' : '';
      var cls2 = w === 2 ? ' comp-win' : '';
      var alt = r % 2 === 0 ? ' comp-row-even' : ' comp-row-odd';
      tableRows += '<tr class="' + alt + '">' +
        '<td class="comp-label">' + row.label + '</td>' +
        '<td class="comp-val' + cls1 + '">' + escapeHtml(v1) + '</td>' +
        '<td class="comp-val' + cls2 + '">' + escapeHtml(v2) + '</td>' +
      '</tr>';
    }

    var opts = '';
    for (var i = 0; i < allProducts.length; i++) {
      opts += '<option value="' + i + '">' + escapeHtml(allProducts[i].name) + '</option>';
    }

    var loadingBar = loading ? '<div class="comp-loading"><div class="comp-loading-bar"></div><span>Fetching full specs...</span></div>' : '';

    return '' +
      '<div class="comparison-header-row">' +
        '<div class="comparison-card">' +
          '<div class="comparison-card-selector">' +
            '<select class="comp-select" data-comp-select="0">' + opts + '</select>' +
          '</div>' +
          '<div class="comparison-card-header">' +
            '<span class="comparison-card-name">' + escapeHtml(p1.name) + '</span>' +
            (p1.price ? '<span class="comparison-card-price">' + escapeHtml(p1.price) + '</span>' : '') +
          '</div>' +
          '<div class="comparison-card-body">' +
            '<span class="tier-badge best">Top Pick</span>' +
            '<div style="margin-top:var(--spacing-3)">' + stars(p1.rating || 0, 16) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="vs-divider"><span>VS</span></div>' +
        '<div class="comparison-card">' +
          '<div class="comparison-card-selector">' +
            '<select class="comp-select" data-comp-select="1">' + opts + '</select>' +
          '</div>' +
          '<div class="comparison-card-header">' +
            '<span class="comparison-card-name">' + escapeHtml(p2.name) + '</span>' +
            (p2.price ? '<span class="comparison-card-price">' + escapeHtml(p2.price) + '</span>' : '') +
          '</div>' +
          '<div class="comparison-card-body">' +
            '<span class="tier-badge premium">Runner Up</span>' +
            '<div style="margin-top:var(--spacing-3)">' + stars(p2.rating || 0, 16) + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      loadingBar +
      '<div class="comp-table-wrap">' +
        '<table class="comp-table">' +
          '<thead><tr><th class="comp-label"></th><th>' + escapeHtml(p1.name) + '</th><th>' + escapeHtml(p2.name) + '</th></tr></thead>' +
          '<tbody>' + tableRows + '</tbody>' +
        '</table>' +
      '</div>';
  }

  function renderComparison(products) {
    var container = document.getElementById('comparison-spotlight');
    if (!container) return;
    hideSpinner('comparison');
    if (!products || products.length < 2) {
      showFallback('comparison');
      return;
    }
    hideFallback('comparison');

    var p1raw = products[comparisonIdx[0]] || products[0];
    var p2raw = products[comparisonIdx[1]] || products[1];

    container.innerHTML = buildComparisonHTML(p1raw, p2raw, true);
    setSelectValues(container);

    Promise.all([enrichProduct(p1raw), enrichProduct(p2raw)]).then(function(pair) {
      var p1 = pair[0], p2 = pair[1];
      container.innerHTML = buildComparisonHTML(p1, p2, false);
      setSelectValues(container);
    });
  }

  function setSelectValues(container) {
    var selects = container.querySelectorAll('.comp-select');
    for (var s = 0; s < selects.length; s++) {
      selects[s].value = comparisonIdx[s];
    }
  }

  /* ---- Modal ---- */
  function openModal(productId) {
    if (!productModal) productModal = document.getElementById('product-modal');
    if (!modalContent) modalContent = document.getElementById('modal-content');
    if (!productModal || !modalContent) return;

    productModal.setAttribute('aria-hidden', 'false');
    productModal.classList.add('open');
    document.body.style.overflow = 'hidden';
    modalContent.innerHTML = '<div class="loading-spinner"></div>';

    window.TSAPI.getProductDetail(productId).then(function(product) {
      if (!product) {
        modalContent.innerHTML = '<div class="fallback-message" style="display:block"><p>Could not load product details.</p></div>';
        return;
      }
      renderModalContent(product);
    }).catch(function() {
      var cached = findProductInCache(productId);
      if (cached) {
        renderModalContent(cached);
      } else {
        modalContent.innerHTML = '<div class="fallback-message" style="display:block"><p>Could not load product details.</p></div>';
      }
    });
  }

  function findProductInCache(productId) {
    for (var i = 0; i < allProducts.length; i++) {
      if (allProducts[i].id === productId) return allProducts[i];
    }
    return null;
  }

  function renderModalContent(product) {
    var rating = product.rating ? ratingHTML(product.rating) : '';
    var specsHtml = '';
    var specKeys = [
      { key: 'display', label: 'Display' },
      { key: 'processor', label: 'Processor' },
      { key: 'ram', label: 'Memory' },
      { key: 'storage', label: 'Storage' },
      { key: 'camera', label: 'Camera' },
      { key: 'battery', label: 'Battery' },
      { key: 'weight', label: 'Weight' },
      { key: 'os', label: 'OS' }
    ];
    for (var i = 0; i < specKeys.length; i++) {
      var val = product.specs[specKeys[i].key];
      if (val) {
        specsHtml += '<div class="modal-spec-item"><span class="modal-spec-label">' + specKeys[i].label + '</span><span class="modal-spec-value">' + escapeHtml(val) + '</span></div>';
      }
    }

    var allSpecs = product.rawSpecs;
    if (allSpecs && typeof allSpecs === 'object') {
      var extraKeys = Object.keys(allSpecs).filter(function(k) {
        var lower = k.toLowerCase();
        return specKeys.every(function(s) { return lower.indexOf(s.key) === -1; }) &&
               lower.indexOf('id') === -1 && lower.indexOf('_') !== 0 &&
               allSpecs[k] && typeof allSpecs[k] !== 'object';
      }).slice(0, 8);
      for (var j = 0; j < extraKeys.length; j++) {
        specsHtml += '<div class="modal-spec-item"><span class="modal-spec-label">' + escapeHtml(extraKeys[j]) + '</span><span class="modal-spec-value">' + escapeHtml(String(allSpecs[extraKeys[j]])) + '</span></div>';
      }
    }

    modalContent.innerHTML = '' +
      '<div class="modal-layout">' +
        '<div class="modal-image-col">' +
          '<img src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.name) + '" loading="lazy">' +
        '</div>' +
        '<div class="modal-info-col">' +
          '<div class="modal-header">' +
            (product.brand ? '<span class="modal-brand">' + escapeHtml(product.brand) + '</span>' : '') +
            '<h2 class="modal-title">' + escapeHtml(product.name) + '</h2>' +
            (rating ? rating : '') +
            (product.price ? '<div class="modal-price">' + escapeHtml(product.price) + '</div>' : '') +
          '</div>' +
          (product.description ? '<p class="modal-description">' + escapeHtml(product.description) + '</p>' : '') +
          (specsHtml ? '<div class="modal-specs-grid">' + specsHtml + '</div>' : '<p class="modal-no-specs">Detailed specifications not available for this product.</p>') +
        '</div>' +
      '</div>';
  }

  /* ---- Stale Data Banner ---- */
  function updateStaleBanner() {
    var banner = document.querySelector('.stale-banner');
    if (!banner) return;
    var isStale = window.TSAPI && window.TSAPI.isStaleData && window.TSAPI.isStaleData();
    if (isStale) {
      banner.classList.add('show');
    } else {
      banner.classList.remove('show');
    }
  }

  function closeModal() {
    if (productModal) {
      productModal.setAttribute('aria-hidden', 'true');
      productModal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  function handleViewProductClick(e) {
    var target = e.target.closest('[data-view-product]');
    if (target) {
      e.preventDefault();
      var productId = target.getAttribute('data-view-product');
      if (productId) openModal(productId);
    }
  }

  /* ---- Search helper for search.js ---- */
  function searchProducts(query) {
    if (!query || !query.trim()) return Promise.resolve([]);
    return window.TSAPI.searchProducts(query, { size: 20 }).then(function(results) {
      return results;
    }).catch(function() {
      return [];
    });
  }

  function getCachedProducts() {
    return allProducts;
  }

  /* ---- Category Link Handling ---- */
  var categorySearchMap = {
    'laptops': 'Laptops',
    'phones': 'Smartphones',
    'audio': 'Headphones',
    'gaming': 'Gaming',
    'gear': 'Tech Accessories',
    'refrigerators': 'Refrigerators',
    'air-fryers': 'Air Fryers',
    'vacuum-cleaners': 'Robot Vacuum',
    'washing-machines': 'Washing Machines',
    'air-conditioners': 'Air Conditioners',
    'kitchen-appliances': 'Microwaves'
  };

  function handleCategoryClick(slug) {
    var searchTerm = categorySearchMap[slug];
    if (searchTerm && window.SearchModule) {
      window.SearchModule.openWithQuery(searchTerm);
    }
  }

  /* ---- Init ---- */
  function init() {
    gadgetCategories = [
      { name: 'Laptops', slug: 'laptops', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M2 21h20"/></svg>' },
      { name: 'Smartphones', slug: 'phones', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>' },
      { name: 'Audio', slug: 'audio', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>' },
      { name: 'Gaming', slug: 'gaming', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 12h4m-2-2v4m4-1h.01M16 12h.01M17 10h.01M19 14h.01"/><rect x="2" y="6" width="20" height="12" rx="2"/></svg>' },
      { name: 'Accessories', slug: 'gear', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>' }
    ];

    applianceCategories = [
      { name: 'Refrigerators', slug: 'refrigerators', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M2 8h20"/><path d="M7 12v4"/></svg>' },
      { name: 'Air Fryers', slug: 'air-fryers', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M18 6V4H6v2"/></svg>' },
      { name: 'Robot Vacuums', slug: 'vacuum-cleaners', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l2 2"/><path d="M8 3l2 3"/><path d="M16 3l-2 3"/></svg>' },
      { name: 'Washing Machines', slug: 'washing-machines', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="18" r="2"/><path d="M4 12h16"/><circle cx="8" cy="7" r="1"/><circle cx="12" cy="7" r="1"/></svg>' },
      { name: 'Air Conditioners', slug: 'air-conditioners', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 18v4"/><path d="M8 22h8"/><path d="M6 12h12"/></svg>' },
      { name: 'Microwaves', slug: 'kitchen-appliances', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 10v4"/><rect x="10" y="8" width="8" height="8" rx="1"/></svg>' }
    ];

    if (!window.TSAPI) {
      document.querySelectorAll('[data-spinner]').forEach(function(el) { el.style.display = 'none'; });
      showFallback('latest');
      showFallback('comparison');
      return;
    }

    window.TSAPI.fetchInitialProducts()
      .then(function(result) {
        allProducts = result.products;
        renderBestPicks(result.products);
        renderLatestReviews(result.products);
        renderBrowseCategories(result.categoryCounts);
        renderComparison(result.products);
        renderProductGrid(result.products.slice(0, 4), 'more-grid');
        updateStaleBanner();
      })
      .catch(function(err) {
        console.error('Failed to fetch products:', err);
        document.querySelectorAll('[data-spinner]').forEach(function(el) { el.style.display = 'none'; });
        updateStaleBanner();
        showFallback('bestpicks');
        showFallback('latest');
        showFallback('comparison');
        showFallback('gadgets');
        showFallback('appliances');
      });

    productModal = document.getElementById('product-modal');
    modalContent = document.getElementById('modal-content');

    document.addEventListener('click', function(e) {
      if (e.target.closest('[data-view-product]')) {
        handleViewProductClick(e);
      }
      if (e.target.closest('[data-modal-close]') || e.target === productModal) {
        closeModal();
      }
      if (e.target.closest('[data-retry]')) {
        var section = e.target.closest('[data-retry]').getAttribute('data-retry');
        hideFallback(section);
        showSpinner(section);
        init();
      }

      if (e.target.closest('[data-stale-dismiss]')) {
        var banner = document.querySelector('.stale-banner');
        if (banner) banner.classList.remove('show');
        if (window.TSAPI && window.TSAPI.clearStaleFlag) window.TSAPI.clearStaleFlag();
      }

      var categoryLink = e.target.closest('a[href^="/"]');
      if (categoryLink) {
        var href = categoryLink.getAttribute('href').replace(/\/$/, '');
        var slug = href.replace(/^\//, '');
        if (categorySearchMap[slug]) {
          e.preventDefault();
          handleCategoryClick(slug);
        }
      }
    });

    document.addEventListener('change', function(e) {
      if (e.target.closest('[data-comp-select]')) {
        var side = parseInt(e.target.getAttribute('data-comp-select'), 10);
        var idx = parseInt(e.target.value, 10);
        if (!isNaN(side) && !isNaN(idx)) {
          comparisonIdx[side] = idx;
          renderComparison(allProducts);
        }
      }
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeModal();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.__searchProducts = searchProducts;
  window.__allProducts = getCachedProducts;
  window.__productCardHTML = productCardHTML;
})();
