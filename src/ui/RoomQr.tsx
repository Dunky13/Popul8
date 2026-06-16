import { useEffect, useState } from 'react';
import * as QRCode from 'qrcode';

export function RoomQr({ roomCode }: { roomCode: string }) {
  const joinUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    QRCode.toDataURL(joinUrl, { width: 192 }).then(setDataUrl).catch(() => setDataUrl(''));
  }, [joinUrl]);

  return (
    <div>
      <h2>Room {roomCode}</h2>
      {dataUrl && <img src={dataUrl} alt={`Join QR for room ${roomCode}`} width={192} height={192} />}
      <p><a href={joinUrl}>{joinUrl}</a></p>
    </div>
  );
}
