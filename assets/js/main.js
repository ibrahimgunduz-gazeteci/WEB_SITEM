/**
 * Ibrahim Gündüz Website
 * Main JavaScript File
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeMobileMenu();
    initializeSmoothScrolling();
    initializeHashLanding();
    initializeBackToTopButton();
    initializeFlashMessages();
    initializeForms();
  });
  
  /**
   * Mobile Menu Functionality
   */
  function initializeMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const nav = document.querySelector('nav');
    
    if (!mobileMenuBtn) return;
    
    const MOBILE_NAV_MAX = 1100;

    function applyNavMode() {
      if (window.innerWidth <= MOBILE_NAV_MAX) {
        mobileMenuBtn.style.display = 'block';
        if (!nav.classList.contains('nav-open')) {
          nav.style.display = 'none';
        }
      } else {
        mobileMenuBtn.style.display = 'none';
        nav.classList.remove('nav-open');
        nav.style.display = 'block';
        nav.style.position = '';
        nav.style.top = '';
        nav.style.left = '';
        nav.style.width = '';
        nav.style.backgroundColor = '';
        nav.style.padding = '';
        nav.style.boxShadow = '';
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
      }
    }

    applyNavMode();
    window.addEventListener('resize', applyNavMode);
    
    // Toggle mobile menu
    mobileMenuBtn.addEventListener('click', function() {
      const open = nav.classList.toggle('nav-open');
      nav.style.display = open ? 'block' : 'none';
      if (open) {
        nav.style.position = 'absolute';
        nav.style.top = '100%';
        nav.style.left = '0';
        nav.style.width = '100%';
        nav.style.padding = '8px';
        nav.style.boxShadow = '0 5px 10px rgba(0,0,0,0.1)';
        const ul = nav.querySelector('ul');
        if (ul) {
          ul.style.display = 'flex';
          ul.style.flexDirection = 'column';
        }
      }
      mobileMenuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    
    // Close mobile menu when a link is clicked
    const navLinks = nav.querySelectorAll('a');
    navLinks.forEach(link => {
      link.addEventListener('click', function() {
        if (window.innerWidth <= MOBILE_NAV_MAX) {
          nav.classList.remove('nav-open');
          nav.style.display = 'none';
          mobileMenuBtn.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }
  
  function getHeaderOffset() {
    var header = document.querySelector('header');
    return (header ? header.offsetHeight : 72) + 12;
  }

  function currentPageFile() {
    var file = (location.pathname.split('/').pop() || '').toLowerCase();
    return file || 'index.html';
  }

  function isSamePageHashLink(href) {
    if (!href || href.indexOf('#') === -1) return false;
    if (href.charAt(0) === '#') return true;
    if (/^https?:\/\//i.test(href) || href.charAt(0) === '/') return false;
    var parts = href.split('#');
    var path = parts[0];
    var hash = parts[1];
    if (!hash) return false;
    var targetFile = (path.split('/').pop() || '').toLowerCase() || 'index.html';
    var cur = currentPageFile();
    if (cur === targetFile) return true;
    if ((cur === 'index.html' || cur === '') && targetFile === 'index.html') return true;
    return false;
  }

  function scrollToId(id, behavior) {
    if (!id) return false;
    var el = document.getElementById(id);
    if (!el) return false;
    var top = el.getBoundingClientRect().top + window.pageYOffset - getHeaderOffset();
    window.scrollTo({ top: Math.max(0, top), behavior: behavior || 'smooth' });
    return true;
  }

  /**
   * Same-page hash: smooth scroll. Cross-page (index.html#videos from book page): do NOT preventDefault.
   */
  function initializeSmoothScrolling() {
    var links = document.querySelectorAll('header nav a, a.btn, a.back-button, a.book-back-link');
    links.forEach(function (link) {
      link.addEventListener('click', function (e) {
        var href = this.getAttribute('href');
        if (!href || href.indexOf('#') === -1) return;
        if (!isSamePageHashLink(href)) return; // allow full navigation
        var id = href.split('#')[1];
        if (!id || !document.getElementById(id)) return;
        e.preventDefault();
        scrollToId(id, 'smooth');
        if (history.replaceState) history.replaceState(null, '', '#' + id);
        else location.hash = id;
      });
    });
  }

  function initializeHashLanding() {
    var timers = [];
    function clearTimers() {
      timers.forEach(function (t) { clearTimeout(t); });
      timers = [];
    }
    function go(behavior) {
      var id = (location.hash || '').replace(/^#/, '');
      if (!id) return;
      scrollToId(id, behavior || 'auto');
    }
    function settle() {
      // Slider/JSON içerik yüksekliği değişince hash hedefini yeniden hizala
      clearTimers();
      go('auto');
      [80, 200, 500, 1000, 1800, 2800].forEach(function (ms) {
        timers.push(setTimeout(function () { go('auto'); }, ms));
      });
    }
    settle();
    window.addEventListener('hashchange', function () { settle(); });
    window.addEventListener('popstate', function () { settle(); });
    window.addEventListener('load', function () { if (location.hash) settle(); });
    // Yazı/video grid'leri DOM'a eklenince
    var mo = new MutationObserver(function () {
      if (location.hash) go('auto');
    });
    var root = document.querySelector('main') || document.body;
    if (root) mo.observe(root, { childList: true, subtree: true });
    setTimeout(function () { mo.disconnect(); }, 4000);
  }
  
  /**
   * Back to top button functionality
   */
  function initializeBackToTopButton() {
    const backToTopBtn = document.querySelector('.back-to-top');
    
    if (!backToTopBtn) return;
    
    window.addEventListener('scroll', function() {
      if (window.pageYOffset > 300) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    });
    
    backToTopBtn.addEventListener('click', function() {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
  
  /**
   * Initialize flash messages
   */
  function initializeFlashMessages() {
    const flashMessages = document.querySelectorAll('.flash-message');
    
    flashMessages.forEach(message => {
      // Add close button to each message
      const closeButton = document.createElement('button');
      closeButton.innerHTML = '&times;';
      closeButton.onclick = function() {
        message.style.display = 'none';
      };
      
      if (!message.querySelector('button')) {
        message.appendChild(closeButton);
      }
      
      // Auto-hide messages after 7 seconds
      setTimeout(function() {
        message.style.opacity = '0';
        message.style.transition = 'opacity 0.5s ease';
        
        // Remove the message after fade-out completes
        setTimeout(function() {
          message.style.display = 'none';
        }, 500);
      }, 7000);
    });
  }
  
  /**
   * Initialize forms with EmailJS
   */
  function initializeForms() {
    const contactForm = document.getElementById('contact-form');
    // Newsletter form is now handled in HTML script section
    
    if (contactForm) {
      contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = {
          name: contactForm.querySelector('input[name="ad"]').value,
          email: contactForm.querySelector('input[name="email"]').value,
          message: contactForm.querySelector('textarea[name="mesaj"]').value
        };
        
        // Show loading state
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Gönderiliyor...';
        submitBtn.disabled = true;
        
        // Send email using EmailJS
        emailjs.send('default_service', 'contact_form', formData, 'YOUR_USER_ID')
          .then(function(response) {
            // Show success message
            showFlashMessage('Mesajınız gönderildi. En kısa sürede size dönüş yapacağız.', 'success');
            
            // Reset form
            contactForm.reset();
            
            // Reset button
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
          })
          .catch(function(error) {
            // Show error message
            showFlashMessage('Mesaj gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.', 'error');
            
            // Reset button
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
          });
      });
    }
  }
  
  /**
   * Show flash message
   * @param {string} message - Message text
   * @param {string} type - Message type (success, error, info)
   */
  function showFlashMessage(message, type = 'success') {
    // Create container if it doesn't exist
    let flashContainer = document.querySelector('.flash-messages');
    
    if (!flashContainer) {
      flashContainer = document.createElement('div');
      flashContainer.className = 'flash-messages';
      document.body.appendChild(flashContainer);
    }
    
    // Create message element
    const flashMessage = document.createElement('div');
    flashMessage.className = 'flash-message';
    
    // Set color based on type
    if (type === 'error') {
      flashMessage.style.backgroundColor = '#e74c3c';
    } else if (type === 'info') {
      flashMessage.style.backgroundColor = '#3498db';
    } else {
      flashMessage.style.backgroundColor = '#2ecc71';
    }
    
    // Add message text
    flashMessage.textContent = message;
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.onclick = function() {
      flashMessage.style.display = 'none';
    };
    flashMessage.appendChild(closeButton);
    
    // Add to container
    flashContainer.appendChild(flashMessage);
    
    // Auto-hide after 7 seconds
    setTimeout(function() {
      flashMessage.style.opacity = '0';
      flashMessage.style.transition = 'opacity 0.5s ease';
      
      // Remove the message after fade-out completes
      setTimeout(function() {
        flashMessage.remove();
      }, 500);
    }, 7000);
  }
  
  /**
   * Initialize video players
   */
  function initializeVideoPlayers() {
    const videoThumbnails = document.querySelectorAll('.video-thumbnail');
    const videoModal = document.getElementById('videoModal');
    const videoPlayer = document.getElementById('videoPlayer');
    const videoSource = videoPlayer ? videoPlayer.querySelector('source') : null;
    const videoModalTitle = document.getElementById('videoModalTitle');
    const closeBtn = document.querySelector('.video-close-btn');
    
    if (!videoModal || !videoPlayer || !videoSource || !videoModalTitle || !closeBtn) {
      // Create video modal if it doesn't exist
      createVideoModal();
      return;
    }
    
    videoThumbnails.forEach(thumbnail => {
      thumbnail.addEventListener('click', function() {
        const videoPath = this.getAttribute('data-video-path');
        const videoTitle = this.getAttribute('data-video-title');
        
        // Set video source and title
        videoSource.src = 'assets/videos/content/' + videoPath;
        videoModalTitle.textContent = videoTitle;
        
        // Reload video
        videoPlayer.load();
        
        // Show modal
        videoModal.style.display = 'block';
        
        // Attempt to play automatically
        videoPlayer.play().catch(error => {
          console.log('Video autoplay was prevented:', error);
        });
        
        // Lock background scrolling
        document.body.style.overflow = 'hidden';
      });
    });
    
    // Close modal functionality
    closeBtn.addEventListener('click', function() {
      videoModal.style.display = 'none';
      videoPlayer.pause();
      document.body.style.overflow = 'auto';
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
      if (event.target === videoModal) {
        videoModal.style.display = 'none';
        videoPlayer.pause();
        document.body.style.overflow = 'auto';
      }
    });
    
    // Close modal on Escape key
    window.addEventListener('keydown', function(event) {
      if (event.key === 'Escape' && videoModal.style.display === 'block') {
        videoModal.style.display = 'none';
        videoPlayer.pause();
        document.body.style.overflow = 'auto';
      }
    });
  }
  
  /**
   * Create video modal if it doesn't exist
   */
  function createVideoModal() {
    // Check if modal already exists
    if (document.getElementById('videoModal')) return;
    
    // Create modal elements
    const videoModal = document.createElement('div');
    videoModal.id = 'videoModal';
    videoModal.className = 'video-modal';
    
    // Create modal content
    videoModal.innerHTML = `
      <div class="video-modal-content">
        <span class="video-close-btn">&times;</span>
        <h3 id="videoModalTitle" class="video-modal-title">Video Başlığı</h3>
        <div class="video-container">
          <video id="videoPlayer" controls>
            <source src="" type="video/mp4">
            Tarayıcınız video etiketini desteklemiyor.
          </video>
        </div>
      </div>
    `;
    
    // Add modal to body
    document.body.appendChild(videoModal);
    
    // Initialize video player functionality again
    initializeVideoPlayers();
  }
  
  /**
   * Initialize article sliders
   */
  function initializeArticleSliders() {
    const sliderWrappers = document.querySelectorAll('.articles-slider-wrapper');
    
    sliderWrappers.forEach(wrapper => {
      // Add mouse wheel scrolling
      wrapper.addEventListener('wheel', function(e) {
        if (e.deltaY !== 0) {
          e.preventDefault();
          this.scrollLeft += e.deltaY;
        }
      });
      
      // Navigation buttons functionality
      const container = wrapper.closest('.articles-slider-container');
      const prevBtn = container.querySelector('.prev-btn');
      const nextBtn = container.querySelector('.next-btn');
      
      // Calculate scroll amount (width of one card plus gap)
      const scrollAmount = 325; // 300px width + 25px gap
      
      if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', function() {
          wrapper.scrollBy({
            left: -scrollAmount,
            behavior: 'smooth'
          });
        });
        
        nextBtn.addEventListener('click', function() {
          wrapper.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
          });
        });
        
        // Update button states on scroll
        wrapper.addEventListener('scroll', function() {
          prevBtn.disabled = wrapper.scrollLeft <= 0;
          nextBtn.disabled = wrapper.scrollLeft >= wrapper.scrollWidth - wrapper.clientWidth;
          
          prevBtn.style.opacity = prevBtn.disabled ? '0.5' : '1';
          nextBtn.style.opacity = nextBtn.disabled ? '0.5' : '1';
        });
        
        // Initial button state
        setTimeout(() => {
          prevBtn.disabled = wrapper.scrollLeft <= 0;
          nextBtn.disabled = wrapper.scrollLeft >= wrapper.scrollWidth - wrapper.clientWidth;
          
          prevBtn.style.opacity = prevBtn.disabled ? '0.5' : '1';
          nextBtn.style.opacity = nextBtn.disabled ? '0.5' : '1';
        }, 100);
      }
    });
  }
  
  /**
   * Load data from JSON files
   * @param {string} url - Path to JSON file
   * @returns {Promise<Object>} - Parsed JSON data
   */
  function loadData(url) {
    return fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      });
  }