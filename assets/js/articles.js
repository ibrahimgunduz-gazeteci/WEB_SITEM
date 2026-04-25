/**
 * Ibrahim Gündüz Website - Dinamik Makale Sistemi
 * Bu dosya assets/yazilar.txt dosyasını okur ve içeriği sayfalara basar.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Yazıları TXT dosyasından çek
    fetch('/assets/yazilar.txt')
        .then(response => response.text())
        .then(data => {
            const articles = parseArticlesTxt(data);

            // Hangi sayfada olduğumuzu kontrol et
            if (window.location.pathname.includes('tum-yazilar.html')) {
                // Eğer "Tüm Yazılar" sayfasındaysak (Grid yapısı)
                renderArticlesGrid(articles);
            } else {
                // Ana sayfadaysak (Slider yapısı)
                renderHomeSlider(articles);
            }
        })
        .catch(err => {
            console.error("Yazı listesi yüklenirken hata oluştu:", err);
            const container = document.querySelector('.articles-slider') || document.getElementById('all-articles-grid');
            if (container) container.innerHTML = '<p style="text-align:center; padding:20px;">Yazılar şu an yüklenemiyor.</p>';
        });
});

/**
 * TXT Verisini Temizler ve Nesne Dönüştürür
 */
function parseArticlesTxt(data) {
    const lines = data.split('\n');
    return lines
        .filter(line => line.trim() !== "" && !line.startsWith('._') && line.includes('.docx'))
        .map(line => {
            // Sadece satır sonundaki görünmez karakterleri (\r, \n) ve baş-son boşlukları temizler
            let fileName = line.replace(/[\r\n]/g, "").trim();
            
            // Başlık oluştur: dosya-adi.docx -> Dosya Adi
            let title = fileName.replace('.docx', '').replace(/-/g, ' ').replace(/_/g, ' ');
            title = title.split(' ')
                         .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                         .join(' ');

            return {
                fileName: fileName,
                title: title,
                // Python script'inin ayıklayıp kaydettiği JPG thumbnail yolu
                thumbnail: `assets/images/articles/${fileName.replace('.docx', '.jpg')}`
            };
        });
}

/**
 * ANA SAYFA: 3'lü Slider Yapısını Oluşturur (Artık Kaydırılabilir)
 */
function renderHomeSlider(articles) {
    const sliderContainer = document.querySelector('.articles-slider');
    if (!sliderContainer) return;

    sliderContainer.innerHTML = '';
    const sliderWrapper = document.createElement('div');
    sliderWrapper.className = 'articles-slider-wrapper'; // CSS buradaki class'a bağlanacak
    
    const recentArticles = articles.slice(0, 30);

    let htmlContent = '';
    recentArticles.forEach(article => {
        htmlContent += `
            <div class="article-card">
                <div class="article-image">
                    <img src="${article.thumbnail}" alt="${article.title}" 
                         onerror="this.onerror=null; this.src='assets/images/articles/deneme.jpg';">
                </div>
                <div class="article-content">
                    <h3 class="article-title">${article.title}</h3>
                    <p class="article-excerpt">Yazının detaylarını okumak için aşağıdaki bağlantıya tıklayabilirsiniz.</p>
                    <a href="haber.html?file=${encodeURIComponent(article.fileName)}" class="read-more">Devamını Oku →</a>
                </div>
            </div>
        `;
    });
    
    sliderWrapper.innerHTML = htmlContent;
    sliderContainer.appendChild(sliderWrapper);
    
    // Ok butonlarını oluştur (Daha önce yazdığımız fonksiyonu çağırır)
    initArticleSlider(sliderContainer, sliderWrapper);
}

/**
 * TÜM YAZILAR: Arama özellikli Grid yapısı
 */
function renderArticlesGrid(articles) {
    const grid = document.getElementById('all-articles-grid');
    const searchInput = document.getElementById('articleSearch');
    if (!grid) return;

    const display = (list) => {
        grid.innerHTML = '';
        list.forEach(article => {
            const card = document.createElement('div');
            card.className = 'article-card';
            card.innerHTML = `
                <div class="article-image">
                    <img src="${article.thumbnail}" alt="${article.title}" 
                         onerror="this.onerror=null; this.src='assets/images/articles/deneme.jpg';">
                </div>
                <div class="article-content">
                    <h3 class="article-title">${article.title}</h3>
                    <a href="haber.html?file=${encodeURIComponent(article.fileName)}" class="read-more">Devamını Oku →</a>
                </div>
            `;
            grid.appendChild(card);
        });
    };

    display(articles);

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const normalize = str => str.toLowerCase().replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');
            const term = normalize(e.target.value);
            const filtered = articles.filter(a => normalize(a.title).includes(term));
            display(filtered);
        });
    }
}

/**
 * Yazılar Slider Kontrolü (Videolar ile Aynı Kaydırma Mantığı)
 */
function initArticleSlider(container, wrapper) {
    // Varsa eski butonları temizle (üst üste binmemesi için)
    container.querySelectorAll('.article-nav-btn').forEach(btn => btn.remove());

    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.className = 'article-nav-btn article-prev';
    
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.className = 'article-nav-btn article-next';

    const scrollAmount = wrapper.offsetWidth / 3; // Dinamik kaydırma miktarı

    nextBtn.addEventListener('click', () => {
        wrapper.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    });

    prevBtn.addEventListener('click', () => {
        wrapper.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    });

    container.appendChild(prevBtn);
    container.appendChild(nextBtn);
}