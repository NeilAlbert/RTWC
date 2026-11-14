/* Photo gallery: photos come from the church Facebook page through /api/facebook/photos.
   The Facebook access token stays on the server. */

(() => {
  const grid = document.getElementById('photo-grid');
  const status = document.getElementById('gallery-status');
  const moreButton = document.getElementById('more-photos');
  const viewer = document.getElementById('photo-viewer');
  const largePhoto = document.getElementById('photo-large');
  const caption = document.getElementById('photo-caption');
  const photoDate = document.getElementById('photo-date');

  let nextCursor = null;

  function showPhoto(photo) {
    largePhoto.src = photo.imageUrl;
    largePhoto.alt = photo.altText;
    if (photo.width && photo.height) {
      largePhoto.width = photo.width;
      largePhoto.height = photo.height;
    }
    caption.textContent = photo.title;
    photoDate.textContent = photo.createdTime ? window.rtwc.formatDate(photo.createdTime) : '';
    // showModal() traps focus, closes on Escape and returns focus to the thumbnail.
    viewer.showModal();
  }

  async function loadPhotos() {
    moreButton.disabled = true;
    try {
      const url = nextCursor ? `/api/facebook/photos?after=${encodeURIComponent(nextCursor)}` : '/api/facebook/photos';
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Gallery API returned HTTP ${response.status}.`);
      const payload = await response.json();
      if (!payload.success || payload.data.error) throw new Error(payload.data?.error || 'Gallery API returned an invalid response.');

      const photos = payload.data.photos.filter(photo => photo.imageUrl);
      photos.forEach(photo => {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        const image = document.createElement('img');
        image.src = photo.imageUrl;
        image.alt = photo.altText;
        image.width = 400;
        image.height = 300;
        image.loading = 'lazy';
        button.append(image);
        button.addEventListener('click', () => showPhoto(photo));
        item.append(button);
        grid.append(item);
      });

      nextCursor = payload.data.hasMore ? payload.data.nextCursor : null;
      moreButton.hidden = !nextCursor;
      status.textContent = grid.children.length === 0 ? 'There are no photos to show yet.' : '';
    } catch (error) {
      console.error('Could not load gallery photos.', error);
      status.textContent = 'Photos could not be loaded. You can see them on our Facebook page.';
    } finally {
      moreButton.disabled = false;
    }
  }

  moreButton.addEventListener('click', loadPhotos);
  document.getElementById('close-photo').addEventListener('click', () => viewer.close());
  // A click on the dark area around the photo lands on the dialog element itself.
  viewer.addEventListener('click', event => {
    if (event.target === viewer) viewer.close();
  });

  loadPhotos();
})();
