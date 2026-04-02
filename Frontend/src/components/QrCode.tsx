import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrCode({ value, size = 96 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const url = await QRCode.toDataURL(value, { width: size, margin: 1 });
      if (!cancelled) setDataUrl(url);
    })();
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!dataUrl) {
    return <div style={{ width: size, height: size }} className="rounded-lg bg-muted animate-pulse" aria-label="QR code loading" />;
  }

  return <img src={dataUrl} alt="QR Code" width={size} height={size} className="rounded-lg border border-border bg-white" />;
}

