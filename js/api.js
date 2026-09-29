(function() {
  'use strict';

  var cfg = window.RA_CONFIG;
  var API_AVAILABLE = !!(cfg && cfg.RAPIDAPI_KEY);

  if (!API_AVAILABLE) {
    console.warn('RapidAPI key not configured. Running in cache-only mode. Add your key in js/config.js for live data.');
  }

  var cacheStore = {};

  function getCacheKey(endpoint, params) {
    return endpoint + '?' + JSON.stringify(params || {});
  }

  function getCacheItem(key) {
    var item = cacheStore[key];
    if (!item) {
      try {
        var raw = localStorage.getItem('ra_cache_' + key);
        if (raw) {
          item = JSON.parse(raw);
          cacheStore[key] = item;
        }
      } catch(e) {}
    }
    return item || null;
  }

  function getFromCache(key) {
    var item = getCacheItem(key);
    if (item && Date.now() - item.ts < cfg.CACHE_TTL) return item.data;
    return null;
  }

  function getStaleFromCache(key) {
    var item = getCacheItem(key);
    if (item && Date.now() - item.ts < cfg.STALE_TTL) return item.data;
    return null;
  }

  function setCache(key, data) {
    var entry = { data: data, ts: Date.now() };
    cacheStore[key] = entry;
    try {
      localStorage.setItem('ra_cache_' + key, JSON.stringify(entry));
    } catch(e) {}
  }

  function getRateLimitState() {
    try {
      var raw = localStorage.getItem('ra_rate_limit');
      if (!raw) return { count: 0, windowStart: Date.now() };
      return JSON.parse(raw);
    } catch(e) {
      return { count: 0, windowStart: Date.now() };
    }
  }

  function updateRateLimit() {
    var state = getRateLimitState();
    var now = Date.now();
    if (now - state.windowStart > cfg.RATE_WINDOW) {
      state = { count: 0, windowStart: now };
    }
    state.count++;
    try {
      localStorage.setItem('ra_rate_limit', JSON.stringify(state));
    } catch(e) {}
    return state;
  }

  function canMakeRequest() {
    var state = getRateLimitState();
    var now = Date.now();
    if (now - state.windowStart > cfg.RATE_WINDOW) return true;
    return state.count < cfg.RATE_LIMIT;
  }

  function getRemainingRequests() {
    var state = getRateLimitState();
    var now = Date.now();
    if (now - state.windowStart > cfg.RATE_WINDOW) return cfg.RATE_LIMIT;
    return Math.max(0, cfg.RATE_LIMIT - state.count);
  }

  function showToast(msg) {
    var el = document.querySelector('.toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(function() { el.classList.remove('show'); }, 4000);
  }

  function markStaleServed() {
    if (!window.__staleDataServed) {
      window.__staleDataServed = true;
    }
  }

  function tryServeStale(key, toastMsg) {
    var data = getStaleFromCache(key);
    if (data) {
      markStaleServed();
      showToast(toastMsg || 'Showing cached data (API unavailable).');
      return data;
    }
    return null;
  }

  function apiRequest(endpoint, params) {
    var cacheKey = getCacheKey(endpoint, params);
    var cached = getFromCache(cacheKey);
    if (cached) return Promise.resolve(cached);

    // If API key is not configured, try to serve stale cache only
    if (!API_AVAILABLE) {
      var stale = tryServeStale(cacheKey, 'Showing cached/stale data (API not configured).');
      if (stale) return Promise.resolve(stale);
      return Promise.reject(new Error('API_NOT_CONFIGURED'));
    }

    if (!canMakeRequest()) {
      var stale = tryServeStale(cacheKey, 'Rate limit reached. Showing cached results.');
      if (stale) return Promise.resolve(stale);
      showToast('API rate limit reached. Please wait before searching again.');
      return Promise.reject(new Error('RATE_LIMITED'));
    }

    var url = cfg.BASE_URL + endpoint;
    var queryParts = [];
    if (params) {
      Object.keys(params).forEach(function(k) {
        if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
          queryParts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
        }
      });
    }
    if (queryParts.length) url += '?' + queryParts.join('&');

    return fetch(url, {
      headers: {
        'X-RapidAPI-Key': cfg.RAPIDAPI_KEY,
        'X-RapidAPI-Host': cfg.RAPIDAPI_HOST,
        'Accept': 'application/json'
      }
    }).then(function(res) {
      updateRateLimit();
      if (!res.ok) {
        if (res.status === 429) {
          var stale = tryServeStale(cacheKey, 'Rate limit reached. Showing cached results.');
          if (stale) return stale;
          showToast('Rate limit exceeded. Please wait before searching again.');
          return Promise.reject(new Error('RATE_LIMITED'));
        }
        return res.json().then(function(err) {
          return Promise.reject(new Error(err.error && err.error.message || err.message || 'API request failed'));
        }).catch(function() {
          return Promise.reject(new Error('API request failed with status ' + res.status));
        });
      }
      return res.json();
    }).then(function(data) {
      setCache(cacheKey, data);
      window.__staleDataServed = false;
      return data;
    }).catch(function(err) {
      var stale = tryServeStale(cacheKey, 'API unavailable. Showing cached data.');
      if (stale) return stale;
      return Promise.reject(err);
    });
  }

  function extractProducts(data) {
    if (!data) return [];
    if (data.data && data.data.products && Array.isArray(data.data.products)) {
      return data.data.products;
    }
    if (Array.isArray(data)) return data;
    if (data.products && Array.isArray(data.products)) return data.products;
    if (data.results && Array.isArray(data.results)) return data.results;
    return [];
  }

  function extractDetailProduct(data) {
    if (!data) return null;
    if (data.data && data.data.asin) return data.data;
    if (data.asin) return data;
    return null;
  }

  function extractBrand(title, productInfo, productDetails) {
    if (productInfo && productInfo.Brand) return productInfo.Brand;
    if (productDetails && productDetails.Brand) return productDetails.Brand;
    if (!title) return '';
    var parts = title.trim().split(/\s+/);
    return parts[0] || '';
  }

  function mapSearchSpecs(p) {
    var specs = {};
    if (p.sales_volume) specs.sales = p.sales_volume;
    if (p.is_prime) specs.prime = 'Prime eligible';
    if (p.delivery) specs.delivery = p.delivery;
    return specs;
  }

  function mapDetailSpecs(productInfo) {
    var specs = {};
    if (!productInfo || typeof productInfo !== 'object') return specs;

    var m = {
      display: ['Screen Size', 'screen size', 'Display Size', 'display size', 'Screen'],
      processor: ['Processor Series', 'processor series', 'CPU Model', 'cpu model', 'Processor', 'processor'],
      ram: ['RAM Memory Installed', 'ram memory installed', 'Ram Memory Installed Size', 'RAM', 'ram'],
      storage: ['Memory Storage Capacity', 'memory storage capacity', 'Storage', 'storage', 'Memory'],
      camera: ['Camera Description', 'camera description', 'Rear Facing Camera Photo Sensor Resolution', 'Camera'],
      battery: ['Battery Capacity', 'battery capacity', 'Battery Power', 'battery power'],
      weight: ['Item Weight', 'item weight', 'Weight', 'weight'],
      os: ['Operating System', 'operating system', 'OS', 'os']
    };

    Object.keys(m).forEach(function(key) {
      var aliases = m[key];
      for (var i = 0; i < aliases.length; i++) {
        var val = productInfo[aliases[i]];
        if (val !== undefined && val !== null && val !== '') {
          specs[key] = String(val);
          break;
        }
      }
    });

    return specs;
  }

  function fallbackImage(brand, name) {
    var text = encodeURIComponent((brand || '') + ' ' + (name || 'Product')).slice(0, 30);
    return 'https://placehold.co/400x300/1a1a2e/6b7280?text=' + text;
  }

  function normalizeSearchProduct(p) {
    var brand = extractBrand(p.product_title);
    var img = p.product_photo || '';
    if (!img) img = fallbackImage(brand, p.product_title);
    return {
      id: p.asin || '',
      name: p.product_title || '',
      brand: brand,
      image: img,
      description: p.product_availability || '',
      price: p.product_price || '',
      rating: parseFloat(p.product_star_rating) || 0,
      specs: mapSearchSpecs(p),
      rawSpecs: { asin: p.asin, sales_volume: p.sales_volume, is_prime: p.is_prime, product_original_price: p.product_original_price, product_num_ratings: p.product_num_ratings, delivery: p.delivery, is_best_seller: p.is_best_seller, is_amazon_choice: p.is_amazon_choice },
      category: '',
      releaseDate: ''
    };
  }

  function normalizeDetailProduct(p) {
    var productInfo = p.product_information || p.product_details || {};
    var desc = '';
    if (p.about_product && p.about_product.length > 0) {
      desc = p.about_product[0];
    } else if (p.product_description) {
      desc = p.product_description;
    }

    var img = p.product_photo || '';
    if (!img && p.product_photos && p.product_photos.length > 0) {
      img = p.product_photos[0];
    }
    if (!img) img = fallbackImage(p.product_information && p.product_information.Brand || '', p.product_title);

    var cat = '';
    if (p.category_path && p.category_path.length > 0) {
      cat = p.category_path.map(function(c) { return c.name; }).join(' > ');
    } else if (p.category && p.category.name) {
      cat = p.category.name;
    }

    return {
      id: p.asin || '',
      name: p.product_title || '',
      brand: extractBrand(p.product_title, productInfo, p.product_details),
      image: img,
      description: desc,
      price: p.product_price || '',
      rating: parseFloat(p.product_star_rating) || 0,
      specs: mapDetailSpecs(productInfo),
      rawSpecs: productInfo,
      category: cat,
      releaseDate: (productInfo['Model Year'] || '') + ''
    };
  }

  window.TSAPI = {
    searchProducts: function(query, opts) {
      opts = opts || {};
      var params = { query: query || '', country: 'US' };
      if (opts.page !== undefined) params.page = opts.page;
      return apiRequest('/search', params).then(function(data) {
        var products = extractProducts(data);
        return products.map(normalizeSearchProduct).filter(function(p) { return p.name; });
      }).catch(function(err) {
        if (err.message === 'RATE_LIMITED') return [];
        throw err;
      });
    },

    getProductDetail: function(productId) {
      if (!productId) return Promise.reject(new Error('Product ID (ASIN) required'));
      return apiRequest('/product-details', { asin: productId, country: 'US' })
        .then(function(data) {
          var product = extractDetailProduct(data);
          if (product) return normalizeDetailProduct(product);
          return null;
        });
    },

    fetchInitialProducts: function() {
      var queries = [
        { query: 'Samsung Galaxy S25 Ultra', key: 'samsung-phone', category: 'phones' },
        { query: 'Google Pixel 10 Pro', key: 'pixel', category: 'phones' },
        { query: 'iPhone 16 Pro', key: 'iphone', category: 'phones' },
        { query: 'MacBook Pro M4 laptop', key: 'macbook', category: 'laptops' },
        { query: 'Dell XPS 16 laptop', key: 'dell', category: 'laptops' },
        { query: 'Lenovo ThinkPad X1 laptop', key: 'lenovo', category: 'laptops' },
        { query: 'Sony WH-1000XM6 headphones', key: 'sony-headphones', category: 'audio' },
        { query: 'AirPods Pro 3', key: 'airpods', category: 'audio' },
        { query: 'Asus ROG Zephyrus gaming laptop', key: 'asus-rog', category: 'gaming' },
        { query: 'iRobot Roomba robot vacuum', key: 'roomba', category: 'vacuum-cleaners' },
        { query: 'Dyson V15 Detect vacuum', key: 'dyson-vacuum', category: 'vacuum-cleaners' },
        { query: 'Ninja Air Fryer Pro', key: 'air-fryer', category: 'air-fryers' },
        { query: 'Samsung Bespoke Refrigerator', key: 'fridge', category: 'refrigerators' },
        { query: 'LG WashTower washing machine', key: 'washer', category: 'washing-machines' }
      ];

      return Promise.all(queries.map(function(q) {
        return window.TSAPI.searchProducts(q.query)
          .then(function(products) {
            return { key: q.key, products: products, query: q.query, category: q.category };
          })
          .catch(function() {
            var emptyKey = '/search?' + JSON.stringify({ query: q.query, country: 'US' });
            setCache(emptyKey, { data: { products: [] }, ts: Date.now() });
            return { key: q.key, products: [], query: q.query, category: q.category };
          });
      })).then(function(results) {
        var all = [];
        var seen = {};
        var categoryCounts = {};
        results.forEach(function(r) {
          categoryCounts[r.category] = (categoryCounts[r.category] || 0) + r.products.length;
          r.products.forEach(function(p) {
            var dedupKey = p.name + '|' + p.brand;
            if (!seen[dedupKey]) {
              seen[dedupKey] = true;
              p.category = r.category;
              all.push(p);
            }
          });
        });
        return {
          products: all,
          results: results,
          categoryCounts: categoryCounts
        };
      });
    },

    getRemainingRequests: getRemainingRequests,
    isStaleData: function() {
      return !!window.__staleDataServed;
    },
    clearStaleFlag: function() {
      window.__staleDataServed = false;
    }
  };
})();
