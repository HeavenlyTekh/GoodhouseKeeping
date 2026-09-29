(function(){
  'use strict';

  window.PaginationModule = {
    currentPage: 1,
    totalPages: 3,
    perPage: 8,

    init: function(){
      this.getCurrentPageFromURL();
      this.renderPagination();
      this.bindEvents();
    },

    getCurrentPageFromURL: function(){
      var params = new URLSearchParams(window.location.search);
      var page = parseInt(params.get('page'));
      if(page && page > 0 && page <= this.totalPages) this.currentPage = page;
    },

    renderPagination: function(){
      var container = document.querySelector('.pagination');
      if(!container) return;
      var html = '';
      html += '<button class="pagination-btn pagination-prev"' + (this.currentPage === 1 ? ' disabled' : '') + '><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button>';
      for(var i = 1; i <= this.totalPages; i++){
        html += '<button class="pagination-btn' + (i === this.currentPage ? ' active' : '') + '" data-page="' + i + '">' + i + '</button>';
      }
      html += '<button class="pagination-btn pagination-next"' + (this.currentPage === this.totalPages ? ' disabled' : '') + '><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></button>';
      container.innerHTML = html;
    },

    bindEvents: function(){
      var self = this;
      var container = document.querySelector('.pagination');
      if(!container) return;
      container.addEventListener('click', function(e){
        var target = e.target.closest('.pagination-btn');
        if(!target || target.disabled) return;
        if(target.classList.contains('pagination-prev')) self.goToPage(self.currentPage - 1);
        else if(target.classList.contains('pagination-next')) self.goToPage(self.currentPage + 1);
        else if(target.dataset.page) self.goToPage(parseInt(target.dataset.page));
      });
    },

    goToPage: function(page){
      if(page < 1 || page > this.totalPages) return;
      var url = new URL(window.location);
      url.searchParams.set('page', page);
      window.location.href = url.toString();
    }
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ window.PaginationModule.init(); });
  } else {
    window.PaginationModule.init();
  }
})();
