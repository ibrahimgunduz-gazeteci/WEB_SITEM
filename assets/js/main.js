/**
 * Ibrahim Gündüz Website
 * Main JavaScript File
 */

document.addEventListener('DOMContentLoaded', function() {
    // Mobile Menu Functionality
    initializeMobileMenu();
    
    // Smooth scrolling for navigation links
    initializeSmoothScrolling();
    
    // Back to top button
    initializeBackToTopButton();
    
    // Initialize flash messages
    initializeFlashMessages();
    
    // Initialize forms if they exist
    initializeForms();
    
  });
  
  /**
   * Mobile Menu Functionality
   */
  function initializeMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const nav = document.querySelector('nav');
    
    if (!mobileMenuBtn) return;
    
    // Show/hide mobile menu button based on screen size
    if (window.innerWidth <= 768) {
      mobileMenuBtn.style.display = 'block';
      nav.style.display = 'none';
    } else {
      mobileMenuBtn.style.display = 'none';
      nav.style.display = 'block';
    }
    
    window.addEventListener('resize', function() {
      if (window.innerWidth <= 768) {
        mobileMenuBtn.style.display = 'block';
        nav.style.display = 'none';
      } else {
        mobileMenuBtn.style.display = 'none';
        nav.style.display = 'block';
        nav.style.position = '';
        nav.style.top = '';
        nav.style.left = '';
        nav.style.width = '';
        nav.style.backgroundColor = '';
        nav.style.padding = '';
        nav.style.boxShadow = '';
      }
    });
    
    // Toggle mobile menu
    mobileMenuBtn.addEventListener('click', function() {
      if (nav.style.display === 'none' || nav.style.display === '') {
        nav.style.display = 'block';
        nav.style.position = 'absolute';
        nav.style.top = '100%';
        nav.style.left = '0';
        nav.style.width = '100%';
        nav.style.backgroundColor = 'white';
        nav.style.padding = '20px';
        nav.style.boxShadow = '0 5px 10px rgba(0,0,0,0.1)';
        
        const ul = nav.querySelector('ul');
        ul.style.display = 'flex';
        ul.style.flexDirection = 'column';
        
        const lis = ul.querySelectorAll('li');
        lis.forEach(li => {
          li.style.margin = '10px 0';
        });
      } else {
        nav.style.display = 'none';
      }
    });
    
    // Close mobile menu when a link is clicked
    const navLinks = nav.querySelectorAll('a');
    navLinks.forEach(link => {
      link.addEventListener('click', function() {
        if (window.innerWidth <= 768) {
          nav.style.display = 'none';
        }
      });
    });
  }
  
  /**
   * Smooth scrolling for navigation links
   */
  function initializeSmoothScrolling() {
    const links = document.querySelectorAll('nav a');
    
    links.forEach(link => {
      link.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        
        // Check if the href is a hash link on the current page (not to another file)
        if (href.includes('#') && !href.startsWith('/') && !href.startsWith('http') && !href.includes('.html')) {
          e.preventDefault();
          
          const targetId = href.split('#')[1];
          const targetElement = document.getElementById(targetId);
          
          if (targetElement) {
            window.scrollTo({
              top: targetElement.offsetTop - 80,
              behavior: 'smooth'
            });
          }
        }
        // For links that go to different pages with hash (like file.html#section), 
        // allow normal navigation - the browser will handle it
      });
    });
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