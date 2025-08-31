// Portfolio Gallery Module

function initializePortfolioGallery() {
  var isFullscreen = false;
  var fullscreenContainer = null;
  
  function activateThumb(selector) {
    document.querySelectorAll('.portfolio-thumb').forEach(function(thumb) {
      thumb.classList.remove('active');
    });
    if (selector) {
      selector.classList.add('active');
    }
  }
  
  function updateMainImage(thumbElement) {
    var thumbImg = thumbElement.querySelector('img');
    if (thumbImg) {
      var mainImg = document.querySelector('.portfolio-main img');
      var mainCaption = document.querySelector('.image-caption');
      
      if (mainImg) {
        mainImg.setAttribute('src', thumbImg.getAttribute('src'));
        mainImg.setAttribute('alt', thumbImg.getAttribute('alt'));
      }
      
      // Update caption if it exists
      if (mainCaption) {
        var thumbCaption = thumbElement.querySelector('.thumb-caption');
        if (thumbCaption) {
          mainCaption.innerHTML = thumbCaption.innerHTML;
        } else {
          mainCaption.style.display = 'none';
        }
      }
    }
  }

  // Full-screen functionality
  function enterFullscreen() {
    if (isFullscreen) return;
    
    var mainImg = document.querySelector('.portfolio-main img');
    if (!mainImg) return;
    
    // Create full-screen container
    fullscreenContainer = document.createElement('div');
    fullscreenContainer.className = 'gallery-fullscreen';
    fullscreenContainer.innerHTML = `
      <div class="fullscreen-content">
        <button class="fullscreen-close" aria-label="Close full-screen">×</button>
        <button class="fullscreen-nav fullscreen-nav-left" aria-label="Previous image">‹</button>
        <img src="${mainImg.src}" alt="${mainImg.alt}" />
        <button class="fullscreen-nav fullscreen-nav-right" aria-label="Next image">›</button>
        <div class="fullscreen-caption"></div>
      </div>
    `;
    
    // Copy caption if it exists
    var mainCaption = document.querySelector('.image-caption');
    if (mainCaption) {
      var fullscreenCaption = fullscreenContainer.querySelector('.fullscreen-caption');
      fullscreenCaption.innerHTML = mainCaption.innerHTML;
    }
    
    // Add to body
    document.body.appendChild(fullscreenContainer);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Add event listeners
    fullscreenContainer.querySelector('.fullscreen-close').addEventListener('click', exitFullscreen);
    fullscreenContainer.querySelector('.fullscreen-nav-left').addEventListener('click', function() {
      navigateToImage(-1);
    });
    fullscreenContainer.querySelector('.fullscreen-nav-right').addEventListener('click', function() {
      navigateToImage(1);
    });
    
    // Animate in
    setTimeout(function() {
      fullscreenContainer.classList.add('active');
    }, 10);
    
    isFullscreen = true;
  }
  
  function exitFullscreen() {
    if (!isFullscreen || !fullscreenContainer) return;
    
    // Animate out
    fullscreenContainer.classList.remove('active');
    
    setTimeout(function() {
      if (fullscreenContainer && fullscreenContainer.parentNode) {
        fullscreenContainer.parentNode.removeChild(fullscreenContainer);
      }
      fullscreenContainer = null;
      
      // Restore body scroll
      document.body.style.overflow = '';
      
      isFullscreen = false;
    }, 300);
  }
  
  function updateFullscreenImage() {
    if (!isFullscreen || !fullscreenContainer) return;
    
    var mainImg = document.querySelector('.portfolio-main img');
    var fullscreenImg = fullscreenContainer.querySelector('img');
    var fullscreenCaption = fullscreenContainer.querySelector('.fullscreen-caption');
    
    if (mainImg && fullscreenImg) {
      fullscreenImg.src = mainImg.src;
      fullscreenImg.alt = mainImg.alt;
    }
    
    // Update caption
    var mainCaption = document.querySelector('.image-caption');
    if (mainCaption && fullscreenCaption) {
      fullscreenCaption.innerHTML = mainCaption.innerHTML;
    }
  }

  // Helper function for navigation
  function navigateToImage(direction) {
    var thumbs = document.querySelectorAll('.portfolio-thumb');
    var currentActive = document.querySelector('.portfolio-thumb.active');
    var currentIndex = Array.from(thumbs).indexOf(currentActive);
    
    var newIndex;
    if (direction === -1) {
      newIndex = Math.max(0, currentIndex - 1);
    } else {
      newIndex = Math.min(thumbs.length - 1, currentIndex + 1);
    }
    
    activateThumb(thumbs[newIndex]);
    updateMainImage(thumbs[newIndex]);
    updateFullscreenImage(); // Update full-screen if active
    thumbs[newIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Initialize thumbnail click handlers
  document.querySelectorAll('.portfolio-thumb img').forEach(function(img) {
    img.addEventListener('click', function() {
      activateThumb(this.parentElement);
      updateMainImage(this.parentElement);
    });
  });

  // Add click-to-fullscreen to main image
  var mainImg = document.querySelector('.portfolio-main img');
  if (mainImg) {
    mainImg.style.cursor = 'pointer';
    mainImg.addEventListener('click', enterFullscreen);
  }

  // Activate the first image
  var firstThumb = document.querySelector('.portfolio-thumb');
  if (firstThumb) {
    activateThumb(firstThumb);
    updateMainImage(firstThumb);
  }
  
  // Add keyboard navigation
  document.addEventListener('keydown', function(e) {
    var thumbs = document.querySelectorAll('.portfolio-thumb');
    var currentActive = document.querySelector('.portfolio-thumb.active');
    var currentIndex = Array.from(thumbs).indexOf(currentActive);
    
    switch(e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        navigateToImage(-1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        navigateToImage(1);
        break;
      case 'Escape':
        if (isFullscreen) {
          e.preventDefault();
          exitFullscreen();
        }
        break;
      case 'f':
      case 'F':
        if (!isFullscreen) {
          e.preventDefault();
          enterFullscreen();
        }
        break;
    }
  });
  
  // Add arrow button navigation
  var leftArrow = document.querySelector('.gallery-nav-left');
  var rightArrow = document.querySelector('.gallery-nav-right');
  
  if (leftArrow) {
    leftArrow.addEventListener('click', function() {
      navigateToImage(-1);
    });
  }
  
  if (rightArrow) {
    rightArrow.addEventListener('click', function() {
      navigateToImage(1);
    });
  }
}

// Auto-initialize if DOM is ready, otherwise wait for it
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePortfolioGallery);
} else {
  initializePortfolioGallery();
}
