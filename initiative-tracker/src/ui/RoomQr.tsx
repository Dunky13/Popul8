import { useEffect, useState } from 'react';
import * as QRCode from 'qrcode';

export function RoomQr({ roomCode }: { roomCode: string }) {
  const joinUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
  const [dataUrl, setDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(joinUrl, { width: 320, margin: 1 }).then(setDataUrl).catch(() => setDataUrl(''));
  }, [joinUrl]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the link is shown below to copy manually */
    }
  }

  return (
    <details className="disclosure" open>
      <summary>Invite players</summary>
      <div className="disclosure__body">
        <div className="qr">
          {dataUrl && (
            <div className="qr__frame">
              <img src={dataUrl} alt={`Join QR code for room ${roomCode}`} />
            </div>
          )}
          <p className="hero__hint">Scan to join room {roomCode}</p>
          <div className="qr__url">
            <code>{joinUrl}</code>
            <button type="button" className="btn btn--ghost" onClick={copy}>
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </details>
  );
}
