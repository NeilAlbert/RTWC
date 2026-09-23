// BACKEND REMOVED — see Facebook photo gallery previously called /api/facebook/gallery. Reconnect when backend is rebuilt.

/**
 * THE CHURCH OF PENTECOST - ROYAL TEMPLE WORSHIP CENTRE
 * Photo Gallery Specific JavaScript (js/pages/gallery.js)
 * Note: Reconnect the Facebook backend endpoint (/api/facebook/gallery) later to pull real live photos.
 */

const galleryGrid = document.getElementById('galleryGrid');
const galleryStatus = document.getElementById('galleryStatus');
const loadMoreButton = document.getElementById('loadMoreButton');
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxCaption = document.getElementById('lightboxCaption');
const lightboxDate = document.getElementById('lightboxDate');
const lightboxClose = document.getElementById('lightboxClose');

// Static local set of placeholder images from /assets/images
const staticPhotos = [
  {
    imageUrl: 'assets/images/hero.jpg',
    altText: 'Main Sanctuary Service',
    title: 'Sunday Worship Service',
    dateText: 'July 2026'
  },
  {
    imageUrl: 'assets/images/welcome-pastor.jpg',
    altText: 'Resident Pastor & Church Leadership',
    title: 'Word & Prayer Fellowship',
    dateText: 'July 2026'
  },
  {
    imageUrl: 'assets/images/sermon-latest.jpg',
    altText: 'Anointed Message & Preaching',
    title: 'Spiritual Awakening Revival',
    dateText: 'July 2026'
  },
  {
    imageUrl: 'assets/images/hero.jpg',
    altText: 'Congregation Praise & Fellowship',
    title: 'Youth & Convention Gathering',
    dateText: 'June 2026'
  }
];

function loadGalleryPage() {
  if (!galleryGrid) return;

  galleryGrid.innerHTML = '';
  if (loadMoreButton) loadMoreButton.classList.add('hidden');

  staticPhotos.forEach((photo) => {
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

  if (galleryStatus) {
    galleryStatus.textContent = `Showing ${staticPhotos.length} photos from the church gallery.`;
  }
}

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

if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
if (lightbox) {
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && lightbox && !lightbox.classList.contains('hidden')) {
    closeLightbox();
  }
});

if (galleryGrid) {
  loadGalleryPage();
}
