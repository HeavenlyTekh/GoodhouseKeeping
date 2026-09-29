'use strict';

/**
 * ShuffleGrid — Animated image shuffle grid
 * Re-creates the framer-motion shuffle effect using vanilla JS + CSS transitions
 */
var ShuffleGrid = (function () {
  var TIMEOUT_MS = 3000;
  var COLS = 4;
  var ROWS = 4;
  var TOTAL = COLS * ROWS;
  var timeoutRef = null;

  var squareData = [
    { id: 1,  src: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop' },
    { id: 2,  src: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400&h=400&fit=crop' },
    { id: 3,  src: 'https://images.unsplash.com/photo-1546868871-af0de0ae72be?w=400&h=400&fit=crop' },
    { id: 4,  src: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=400&fit=crop' },
    { id: 5,  src: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&h=400&fit=crop' },
    { id: 6,  src: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop' },
    { id: 7,  src: 'https://images.unsplash.com/photo-1574920162043-b872f3a42e27?w=400&h=400&fit=crop' },
    { id: 8,  src: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop' },
    { id: 9,  src: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=400&fit=crop' },
    { id: 10, src: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop' },
    { id: 11, src: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=400&h=400&fit=crop' },
    { id: 12, src: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop' },
    { id: 13, src: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=400&fit=crop' },
    { id: 14, src: 'https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=400&h=400&fit=crop' },
    { id: 15, src: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=400&fit=crop' },
    { id: 16, src: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=400&h=400&fit=crop' },
  ];

  function shuffle(array) {
    var arr = array.slice();
    var currentIndex = arr.length;
    var randomIndex;
    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      var temp = arr[currentIndex];
      arr[currentIndex] = arr[randomIndex];
      arr[randomIndex] = temp;
    }
    return arr;
  }

  function createSquares() {
    var shuffled = shuffle(squareData);
    var fragment = document.createDocumentFragment();
    for (var i = 0; i < shuffled.length; i++) {
      var div = document.createElement('div');
      div.className = 'shuffle-grid__square';
      div.style.backgroundImage = 'url(' + shuffled[i].src + ')';
      div.setAttribute('aria-hidden', 'true');
      fragment.appendChild(div);
    }
    return fragment;
  }

  function shuffleSquares(container) {
    container.style.opacity = '0';
    container.style.transform = 'scale(0.96)';

    setTimeout(function () {
      container.innerHTML = '';
      container.appendChild(createSquares());
      container.style.opacity = '1';
      container.style.transform = 'scale(1)';
    }, 300);

    timeoutRef = setTimeout(function () {
      shuffleSquares(container);
    }, TIMEOUT_MS);
  }

  function init() {
    var container = document.getElementById('shuffle-grid');
    if (!container) return;

    container.innerHTML = '';
    container.appendChild(createSquares());

    timeoutRef = setTimeout(function () {
      shuffleSquares(container);
    }, TIMEOUT_MS);
  }

  return { init: init };
})();

document.addEventListener('DOMContentLoaded', function () {
  ShuffleGrid.init();
});
