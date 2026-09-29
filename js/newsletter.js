(function(){
  'use strict';

  window.NewsletterModule = {
    init: function(){
      this.forms = document.querySelectorAll('[data-newsletter]');
      this.initForms();
    },

    initForms: function(){
      var self = this;
      this.forms.forEach(function(form){
        form.addEventListener('submit', function(e){
          e.preventDefault();
          self.handleSubmit(this);
        });
      });
    },

    handleSubmit: function(form){
      var emailInput = form.querySelector('input[type="email"]');
      var submitBtn = form.querySelector('button[type="submit"]');
      if(!emailInput || !emailInput.value){
        this.showMessage(form, 'Please enter your email address.', 'error');
        return;
      }
      if(!this.validateEmail(emailInput.value)){
        this.showMessage(form, 'Please enter a valid email address.', 'error');
        return;
      }
      if(submitBtn){
        submitBtn.disabled = true;
        submitBtn.textContent = 'Subscribing...';
      }
      setTimeout(function(){
        if(submitBtn){
          submitBtn.disabled = false;
          submitBtn.textContent = 'Subscribe';
        }
        localStorage.setItem('geargrid_subscribed', 'true');
        localStorage.setItem('geargrid_email', emailInput.value);
        this.showMessage(form, 'Thanks for subscribing!', 'success');
        form.reset();
        if(window.showToast) window.showToast('Subscribed!');
      }.bind(this), 1000);
    },

    validateEmail: function(email){
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    showMessage: function(form, message, type){
      var existing = form.querySelector('.newsletter-message');
      if(existing) existing.remove();
      var msgEl = document.createElement('div');
      msgEl.className = 'newsletter-message newsletter-message-' + type;
      msgEl.textContent = message;
      msgEl.style.cssText = 'margin-top:10px;font-size:14px;color:' + (type === 'error' ? 'var(--color-error)' : 'var(--color-success)') + ';';
      form.appendChild(msgEl);
      if(type === 'success'){
        setTimeout(function(){ msgEl.remove(); }, 4000);
      }
    }
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ window.NewsletterModule.init(); });
  } else {
    window.NewsletterModule.init();
  }
})();
