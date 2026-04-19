document.addEventListener('DOMContentLoaded', function() {
    const apiKey = "AIzaSyB-MZkLM4oqc5qbCKJXAGdFUXfrXMlIGN8"; 
    const handle = "@İbrahimGündüz-Gazeteci"; 
    const maxResults = 12; 
    
    const container = document.getElementById('youtube-videos-container');

    if (!container) return;

    // 1. Kanal bilgilerini al
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`;

    fetch(channelUrl)
        .then(response => response.json())
        .then(channelData => {
            if (!channelData.items || channelData.items.length === 0) throw new Error("Kanal bulunamadı.");
            const uploadsId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

            // 2. Videoları çek
            return fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=${maxResults}&key=${apiKey}`);
        })
        .then(response => response.json())
        .then(data => {
            if (!data.items || data.items.length === 0) {
                container.innerHTML = "<p style='text-align:center;'>Video bulunamadı.</p>";
                return;
            }

            let htmlContent = '';
            data.items.forEach(item => {
                const videoID = item.snippet.resourceId.videoId;
                const title = item.snippet.title;
                const thumbnail = item.snippet.thumbnails.high ? item.snippet.thumbnails.high.url : item.snippet.thumbnails.default.url;
                const videoUrl = `https://www.youtube.com/watch?v=${videoID}`;
                
                htmlContent += `
                    <a href="${videoUrl}" target="_blank" class="article-card video-link">
                        <div class="article-image">
                            <img src="${thumbnail}" alt="${title}">
                            <div class="play-button-overlay">
                                <i class="fas fa-play-circle"></i>
                            </div>
                        </div>
                        <div class="article-content">
                            <h3 class="article-title">${title}</h3>
                            <span class="read-more">İzle →</span>
                        </div>
                    </a>
                `;
            });
            container.innerHTML = htmlContent;
            
            // Initialize video slider buttons
            initializeVideoSlider();
        })
        .catch(err => {
            container.innerHTML = `<p style="color:red; text-align: center;">Hata: ${err.message}</p>`;
        });
});

/**
 * Initialize video slider navigation buttons
 */
function initializeVideoSlider() {
    const container = document.getElementById('youtube-videos-container');
    const sliderContainer = container?.closest('.articles-slider');
    
    if (!container || !sliderContainer) return;
    
    const prevBtn = sliderContainer.querySelector('.article-prev');
    const nextBtn = sliderContainer.querySelector('.article-next');
    
    if (!prevBtn || !nextBtn) return;
    
    const scrollAmount = 325; // card width + gap
    
    // Previous button
    prevBtn.addEventListener('click', function() {
        container.scrollBy({
            left: -scrollAmount,
            behavior: 'smooth'
        });
    });
    
    // Next button
    nextBtn.addEventListener('click', function() {
        container.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
        });
    });
}