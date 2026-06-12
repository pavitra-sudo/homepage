import { appConfig } from './config.js';

export function initSpotify() {
  const spotifyOverlay = document.getElementById('spotify-overlay');
  const spotifyClose = document.getElementById('spotify-close');
  
  spotifyClose.addEventListener('click', () => {
    spotifyOverlay.classList.remove('active');
  });

  spotifyOverlay.addEventListener('click', (e) => {
    if (e.target === spotifyOverlay) spotifyOverlay.classList.remove('active');
  });

  const nowPlayingWidget = document.getElementById('now-playing-widget');
  const npTitle = document.getElementById('np-title');
  let currentTrackUri = null;

  window.onSpotifyIframeApiReady = (IFrameAPI) => {
    const element = document.getElementById('spotify-iframe');
    const options = {
      width: '100%',
      height: '352',
      uri: appConfig.spotifyUri || 'spotify:playlist:16SjqfOmAiWIFoiC3elUwT'
    };
    const callback = (EmbedController) => {
      EmbedController.addListener('playback_update', e => {
        const { isPaused, isBuffering, playingURI } = e.data;
        
        if (!isPaused && !isBuffering) {
          nowPlayingWidget.classList.add('active');
          
          if (playingURI && playingURI !== currentTrackUri) {
            currentTrackUri = playingURI;
            npTitle.innerText = "Loading track data...";
            
            fetch(`https://open.spotify.com/oembed?url=${playingURI}`)
              .then(res => res.json())
              .then(data => {
                if (data && data.title) {
                  npTitle.innerText = data.title;
                } else {
                  npTitle.innerText = "Spotify Stream";
                }
              })
              .catch(err => {
                console.error("Error fetching track data", err);
                npTitle.innerText = "Spotify Stream";
              });
          }
        } else {
          nowPlayingWidget.classList.remove('active');
        }
      });
    };
    IFrameAPI.createController(element, options, callback);
  };
}
