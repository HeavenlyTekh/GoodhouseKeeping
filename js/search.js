(function(){
  'use strict';

  var searchTimer = null;

  window.SearchModule = {
    init: function(){
      this.searchBtn = document.querySelector('[data-search-open]');
      this.searchModal = document.querySelector('.search-modal');
      this.searchClose = document.querySelector('[data-search-close]');
      this.searchInput = document.querySelector('.search-input');
      this.searchResults = document.querySelector('.search-results');
      this.searchCount = document.querySelector('.search-result-count');
      this.bindEvents();
    },

    bindEvents: function(){
      var self = this;

      if(this.searchBtn){
        this.searchBtn.addEventListener('click', function(e){
          e.preventDefault();
          self.open();
        });
      }

      if(this.searchClose){
        this.searchClose.addEventListener('click', function(){
          self.close();
        });
      }

      if(this.searchInput){
        this.searchInput.addEventListener('input', function(e){
          var val = e.target.value;
          clearTimeout(searchTimer);
          searchTimer = setTimeout(function() {
            self.performSearch(val);
          }, 350);
        });
        this.searchInput.addEventListener('keydown', function(e){
          if(e.key === 'Escape') self.close();
        });
      }

      document.addEventListener('click', function(e){
        if(e.target === self.searchModal) self.close();
      });
    },

    open: function(){
      if(this.searchModal){
        this.searchModal.classList.add('open');
        document.body.style.overflow = 'hidden';
        var self = this;
        setTimeout(function(){
          if(self.searchInput) self.searchInput.focus();
        }, 100);
      }
    },

    openWithQuery: function(query){
      this.open();
      if (this.searchInput) {
        this.searchInput.value = query;
      }
      var self = this;
      setTimeout(function() {
        self.performSearch(query);
      }, 150);
    },

    close: function(){
      if(this.searchModal){
        this.searchModal.classList.remove('open');
        document.body.style.overflow = '';
        if(this.searchInput) this.searchInput.value = '';
        if(this.searchResults) this.searchResults.innerHTML = '';
        if(this.searchCount) this.searchCount.textContent = '';
      }
    },

    performSearch: function(query){
      var resultsContainer = this.searchResults;
      var countEl = this.searchCount;

      if(!query.trim()){
        if(resultsContainer) resultsContainer.innerHTML = '';
        if(countEl) countEl.textContent = '';
        return;
      }

      if(countEl){
        countEl.textContent = 'Searching...';
      }
      if(resultsContainer){
        resultsContainer.innerHTML = '<div class="search-loading"><div class="loading-spinner"></div></div>';
      }

      var searchFn = window.__searchProducts;
      if (typeof searchFn === 'function') {
        searchFn(query).then(function(results) {
          self.renderResults(results, query);
        }).catch(function() {
          self.renderResults([], query);
        });
      } else {
        var localProducts = typeof window.__allProducts === 'function' ? window.__allProducts() : [];
        var q = query.toLowerCase();
        var filtered = localProducts.filter(function(p) {
          return p.name.toLowerCase().includes(q) ||
                 (p.brand && p.brand.toLowerCase().includes(q)) ||
                 (p.category && p.category.toLowerCase().includes(q)) ||
                 (p.description && p.description.toLowerCase().includes(q));
        });
        self.renderResults(filtered, query);
      }
    },

    renderResults: function(results, query) {
      var resultsContainer = this.searchResults;
      var countEl = this.searchCount;

      if (countEl) {
        countEl.textContent = 'Found ' + results.length + ' result' + (results.length !== 1 ? 's' : '');
      }

      if (resultsContainer) {
        resultsContainer.innerHTML = '';
        if (results.length === 0) {
          resultsContainer.innerHTML = '<div class="search-no-results">No results found for "' + query + '"</div>';
          return;
        }

        var grid = document.createElement('div');
        grid.className = 'product-grid';

        var cardFn = window.__productCardHTML;
        results.forEach(function(p) {
          var html;
          if (typeof cardFn === 'function') {
            html = cardFn(p);
          } else {
            html = '<article class="product-card" data-product-id="' + simpleEscape(p.id) + '">' +
              '<div class="product-card-image">' +
                '<img src="' + simpleEscape(p.image) + '" alt="' + simpleEscape(p.name) + '" loading="lazy">' +
                (p.brand ? '<span class="product-card-brand">' + simpleEscape(p.brand) + '</span>' : '') +
              '</div>' +
              '<div class="product-card-body">' +
                '<h3 class="product-card-name">' + simpleEscape(p.name) + '</h3>' +
                '<div class="product-card-footer">' +
                  (p.price ? '<span class="product-card-price">' + simpleEscape(p.price) + '</span>' : '') +
                  '<button class="btn btn-primary btn-sm view-details-btn" data-view-product="' + simpleEscape(p.id) + '">View Details</button>' +
                '</div>' +
              '</div>' +
            '</article>';
          }

          if (query && p.name) {
            var escapedName = simpleEscape(p.name);
            var highlighted = highlightText(escapedName, query);
            if (highlighted !== escapedName) {
              html = html.split(escapedName).join(highlighted);
            }
          }

          var temp = document.createElement('div');
          temp.innerHTML = html;
          var article = temp.firstElementChild;
          if (article) grid.appendChild(article);
        });

        resultsContainer.appendChild(grid);

        grid.querySelectorAll('[data-view-product]').forEach(function(el) {
          el.addEventListener('click', function(e) {
            e.preventDefault();
            var id = this.getAttribute('data-view-product');
            if (id) {
              self.close();
              setTimeout(function() {
                var event = new CustomEvent('open-product-detail', { detail: { productId: id } });
                document.dispatchEvent(event);
              }, 300);
            }
          });
        });
      }
    }
  };

  function simpleEscape(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function highlightText(text, query){
    if(!query) return text;
    var regex = new RegExp('(' + escapeRegExp(query) + ')', 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  function escapeRegExp(string){
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ window.SearchModule.init(); });
  } else {
    window.SearchModule.init();
  }

  var self = window.SearchModule;

  document.addEventListener('open-product-detail', function(e) {
    if (e.detail && e.detail.productId) {
      var clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      var fakeTarget = document.createElement('div');
      fakeTarget.setAttribute('data-view-product', e.detail.productId);
      fakeTarget.style.display = 'none';
      document.body.appendChild(fakeTarget);
      fakeTarget.dispatchEvent(clickEvent);
      document.body.removeChild(fakeTarget);
    }
  });
})();
