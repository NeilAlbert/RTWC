// THE CHURCH OF PENTECOST - ROYAL TEMPLE WORSHIP CENTRE
// Photo Gallery Specific JavaScript (js/pages/gallery.js)
// Loads cursor-paginated photos from the church's configured Facebook page.

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
  const loadMoreButton = document.getElementById('loadMoreButton');
  let nextCursor = null;
  let hasMore = false;

  /* ==========================================================================
   FETCH GALLERY IMAGES FROM BACKEND
   ========================================================================== */
  async function fetchGalleryImages(cursor = null) {
    try {
      const query = cursor ? `?after=${encodeURIComponent(cursor)}` : '';
      const response = await fetch(`${API_BASE}/api/facebook/photos${query}`);
      if (!response.ok) throw new Error('Failed to fetch gallery images');
      const data = await response.json();
      return data.data || { photos: [], nextCursor: null, hasMore: false };
    } catch (err) {
      console.warn('Gallery photos are unavailable.', err);
      return { photos: [], nextCursor: null, hasMore: false, error: true };
    }
  }

  /* ==========================================================================
   INITIALIZE GALLERY WITH DATA (API or fallback)
   ========================================================================== */
  fetchGalleryImages().then((page) => {
    initGallery(page);
  });

  function initGallery(page) {
    nextCursor = page.nextCursor;
    hasMore = page.hasMore;
    loadGalleryPage(page.photos, page.error);
    updateLoadMoreButton();

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
  function loadGalleryPage(images, hasError = false) {
    if (!galleryGrid) return;

    galleryGrid.innerHTML = '';

    if (images.length === 0) {
      if (galleryStatus) galleryStatus.textContent = hasError
        ? 'The gallery could not be loaded right now.'
        : 'No gallery images are available right now.';
      if (noResultsMsg) noResultsMsg.style.display = 'block';
      return;
    }

    if (noResultsMsg) noResultsMsg.style.display = 'none';

    if (galleryStatus) galleryStatus.textContent = `Showing ${galleryGrid.children.length + images.length} photos from the church gallery.`;

    images.forEach((photo) => {
      const imageUrl = window.safePublicUrl(photo.imageUrl);
      if (!imageUrl) return;
      const card = document.createElement('article');
      card.className = 'gallery-card';
      const image = document.createElement('img');
      image.src = imageUrl;
      image.alt = photo.altText || photo.title || 'Church gallery photo';
      image.loading = 'lazy';
      const body = document.createElement('div');
      body.className = 'gallery-card-body';
      const title = document.createElement('div');
      title.className = 'gallery-card-title';
      title.textContent = photo.title || 'Church photo';
      const date = document.createElement('div');
      date.className = 'gallery-card-meta';
      date.textContent = photo.dateText || '';
      body.append(title, date);
      card.append(image, body);
      card.addEventListener('click', () => openLightbox(photo));
      galleryGrid.appendChild(card);
    });
  }

  /* ==========================================================================
   LIGHTBOX HANDLERS
   ========================================================================== */
  function openLightbox(photo) {
    const imageUrl = window.safePublicUrl(photo.imageUrl);
    if (!imageUrl) return;
    lightboxImage.src = imageUrl;
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

  function updateLoadMoreButton() {
    if (loadMoreButton) loadMoreButton.classList.toggle('hidden', !hasMore);
  }

  if (loadMoreButton) {
    loadMoreButton.addEventListener('click', async () => {
      loadMoreButton.disabled = true;
      try {
        const page = await fetchGalleryImages(nextCursor);
        nextCursor = page.nextCursor;
        hasMore = page.hasMore;
        loadGalleryPage(page.photos, page.error);
        updateLoadMoreButton();
      } finally {
        loadMoreButton.disabled = false;
      }
    });
  }
});
