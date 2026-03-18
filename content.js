(() => {
  'use strict';

  const SHORTS_URL_PREFIX = '/shorts/';

  function removeShortsAnchoredNodes(root = document) {
    const shortsLinks = root.querySelectorAll('a[href^="/shorts/"]');

    for (const link of shortsLinks) {
      const removableContainer =
        link.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, ytd-rich-shelf-renderer, ytd-reel-shelf-renderer, ytd-item-section-renderer') ||
        link;

      if (removableContainer instanceof HTMLElement) {
        removableContainer.remove();
      }
    }

    const knownShortsBlocks = root.querySelectorAll(
      'ytd-reel-shelf-renderer, ytd-rich-shelf-renderer[is-shorts]'
    );

    for (const block of knownShortsBlocks) {
      if (block instanceof HTMLElement) {
        block.remove();
      }
    }
  }

  function hideWatchPageRecommendations() {
    const watchSecondary = document.querySelector(
      'ytd-watch-next-secondary-results-renderer'
    );
    if (watchSecondary instanceof HTMLElement) {
      watchSecondary.style.display = 'none';
    }

    const related = document.querySelector('#related');
    if (related instanceof HTMLElement) {
      related.style.display = 'none';
    }
  }

  function redirectIfOnShortsPage() {
    if (location.pathname.startsWith(SHORTS_URL_PREFIX)) {
      location.replace('https://www.youtube.com/');
    }
  }

  function enforce() {
    redirectIfOnShortsPage();
    removeShortsAnchoredNodes(document);
    hideWatchPageRecommendations();
  }

  let lastHref = location.href;

  const observer = new MutationObserver((mutations) => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      enforce();
      return;
    }

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          removeShortsAnchoredNodes(node);
          hideWatchPageRecommendations();
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  enforce();
  setInterval(enforce, 1500);
})();
