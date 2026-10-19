// THE CHURCH OF PENTECOST - ROYAL TEMPLE WORSHIP CENTRE
// Photo Gallery Specific JavaScript (js/pages/gallery.js)
// Connects to /api/facebook/gallery backend endpoint for real photos.
// Falls back to static data if API call fails.

document.addEventListener('DOMContentLoaded', () => {
  /* ==========================================================================
     DOM REFERENCES & CONFIGURATION
     ========================================================================== */
  const API_BASE = '';
  const galleryGrid = document.getElementById('galleryGrid');
  const galleryStatus = document.getElementById('galleryStatus');
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxDate = document.getElementById('lightboxDate');
  const lightboxClose = document.getElementById('lightboxClose');
  const noResultsMsg = document.getElementById('no-gallery-msg');

  /* ==========================================================================
   FETCH GALLERY IMAGES FROM BACKEND
   ========================================================================== */
  async function fetchGalleryImages() {
    try {
      const response = await fetch(`${API_BASE}/api/facebook/gallery`);
      if (!response.ok) throw new Error('Failed to fetch gallery images');
      const data = await response.json();
      return data.data || [];
    } catch (err) {
      logger.warn('Failed to fetch gallery from API, falling back to static data', { error: err.message });
      // Return static fallback data
      return [
        {
          imageUrl: 'assets/images/hero.jpg',
          altText: 'Main Sanctuary Service',
          title: 'Sunday Worship Service',
          dateText: 'July 2026'
        },
        // ... static fallback images
      ];
    }
  }

  /* ==========================================================================
   INITIALIZE GALLERY WITH DATA (API or fallback)
   ========================================================================== */
  fetchGalleryImages().then(imagesData => {
    initGallery(imagesData);
  });

  function initGallery(imagesData) {
    loadGalleryPage(imagesData);

    // Lightbox handlers
    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);

    if (lightbox) {
      lightbox.addEventListener('click', (event) => {
        if (event.target === lightbox) {
          closeLightbox();
        }
      });
    }

    // Escape key to close
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && lightbox && !lightbox.classList.contains('hidden')) {
        closeLightbox();
      }
    });
  }

  /* ==========================================================================
   LOAD GALLERY PAGE
   ========================================================================== */
  function loadGalleryPage(images) {
    if (!galleryGrid) return;

    galleryGrid.innerHTML = '';

    if (images.length === 0) {
      if (galleryStatus) galleryStatus.textContent = 'No gallery images available.';
      if (noResultsMsg) noResultsMsg.style.display = 'block';
      return;
    }

    if (noResultsMsg) noResultsMsg.style.display = 'none';

    galleryStatus.textContent = `Showing ${images.length} photos from the church gallery.`;

    images.forEach((photo) => {
      const card = document.createElement('article');
      card.className = 'gallery-card';
      card.innerHTML = `
        <img src="${photo.imageUrl}" alt="${photo.altText}" loading="lazy" />
        <div class="gallery-card-body">
          <div class="gallery-card-title">${photo.title}</div>
          <div class="gallery-card-meta">${photo.dateText}</div>
        </div>
      `;
      card.addEventListener('click', () => openLightbox(photo));
      galleryGrid.appendChild(card);
    });
  }

  /* ==========================================================================
   LIGHTBOX HANDLERS
   ========================================================================== */
  function openLightbox(photo) {
    lightboxImage.src = photo.imageUrl;
    lightboxImage.alt = photo.altText;
    lightboxCaption.textContent = photo.title;
    lightboxDate.textContent = photo.dateText;
    lightbox.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.add('hidden');
    document.body.style.overflow = '';
  }
});