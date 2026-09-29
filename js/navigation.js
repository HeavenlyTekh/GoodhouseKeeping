(function(){
  'use strict';

  window.NavigationModule = {
    init: function(){
      this.header = document.querySelector('.site-header');
      this.menuBtn = document.querySelector('[data-menu-open]');
      this.mobileMenu = document.querySelector('.mobile-menu');
      this.menuClose = document.querySelector('[data-menu-close]');
      this.overlay = document.querySelector('.overlay');
      this.themeToggle = document.querySelector('[data-theme-toggle]');

      this.bindEvents();
      this.initStickyHeader();
      this.initTheme();
    },

    bindEvents: function(){
      var self = this;

      if(this.menuBtn){
        this.menuBtn.addEventListener('click', function(){ self.openMobileMenu(); });
      }
      if(this.menuClose){
        this.menuClose.addEventListener('click', function(){ self.closeMobileMenu(); });
      }
      if(this.overlay){
        this.overlay.addEventListener('click', function(){ self.closeMobileMenu(); });
      }
      if(this.themeToggle){
        this.themeToggle.addEventListener('click', function(){ self.toggleTheme(); });
      }

      document.addEventListener('keydown', function(e){
        if(e.key === 'Escape') self.closeMobileMenu();
      });
    },

    initStickyHeader: function(){
      if(!this.header) return;
      var header = this.header;
      window.addEventListener('scroll', function(){
        header.classList.toggle('scrolled', window.pageYOffset > 100);
      });
    },

    initTheme: function(){
      var saved = localStorage.getItem('geargrid-theme') || 'light';
      document.documentElement.setAttribute('data-theme', saved);
      this.updateThemeIcons(saved);
    },

    toggleTheme: function(){
      var current = document.documentElement.getAttribute('data-theme') || 'light';
      var next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('geargrid-theme', next);
      this.updateThemeIcons(next);
    },

    updateThemeIcons: function(theme){
      var sun = document.querySelector('.sun-icon');
      var moon = document.querySelector('.moon-icon');
      if(!sun || !moon) return;
      if(theme === 'dark'){
        sun.style.display = 'none';
        moon.style.display = '';
      } else {
        sun.style.display = '';
        moon.style.display = 'none';
      }
    },

    openMobileMenu: function(){
      if(this.mobileMenu){
        this.mobileMenu.classList.add('open');
        if(this.overlay) this.overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    },

    closeMobileMenu: function(){
      if(this.mobileMenu){
        this.mobileMenu.classList.remove('open');
        if(this.overlay) this.overlay.classList.remove('active');
        document.body.style.overflow = '';
      }
    }
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ window.NavigationModule.init(); });
  } else {
    window.NavigationModule.init();
  }
})();
