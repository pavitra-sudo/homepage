export function initQRGenerator() {
  const qrOverlay = document.getElementById('qr-overlay');
  const qrClose = document.getElementById('qr-close');
  const qrInput = document.getElementById('qr-input');
  const qrGenerateBtn = document.getElementById('qr-generate-btn');
  const qrImage = document.getElementById('qr-image');
  const qrPlaceholder = document.getElementById('qr-placeholder');
  const qrDownloadBtn = document.getElementById('qr-download-btn');

  qrClose.addEventListener('click', () => {
    qrOverlay.classList.remove('active');
  });

  qrOverlay.addEventListener('click', (e) => {
    if (e.target === qrOverlay) qrOverlay.classList.remove('active');
  });

  qrGenerateBtn.addEventListener('click', () => {
    const text = qrInput.value.trim();
    if (!text) return;

    qrImage.style.display = 'none';
    qrDownloadBtn.style.display = 'none';
    qrPlaceholder.style.display = 'block';
    qrPlaceholder.innerText = 'Encoding Matrix...';

    const size = '200x200';
    const fgColor = 'ff003c';
    const bgColor = '111111';
    const margin = '10';
    
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(text)}&size=${size}&color=${fgColor}&bgcolor=${bgColor}&margin=${margin}&format=png`;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      qrImage.src = img.src;
      qrPlaceholder.style.display = 'none';
      qrImage.style.display = 'block';
      qrDownloadBtn.style.display = 'block';
    };
    img.onerror = () => {
      qrPlaceholder.innerText = 'Error generating QR code.';
    };
    img.src = qrUrl;
  });

  qrInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      qrGenerateBtn.click();
    }
  });

  qrDownloadBtn.addEventListener('click', () => {
    if (!qrImage.src) return;
    
    fetch(qrImage.src)
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'cyber_qr.png';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      })
      .catch(err => {
        console.error('Download failed:', err);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = qrImage.src;
        a.download = 'cyber_qr.png';
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
  });
}
