import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { Button, Field } from './ui';

interface Props {
  onDetected: (code: string) => void;
  disabled?: boolean;
}

/**
 * Extract a GTIN from a raw scan. Handles GS1 DataMatrix (AI 01 = GTIN-14,
 * spec §7 pharma note) by pulling the GTIN and normalising to EAN-13 when possible.
 */
export function extractGtin(raw: string): string {
  const cleaned = raw.trim();
  const gs1 = cleaned.match(/01(\d{14})/);
  if (gs1) {
    const g14 = gs1[1];
    return g14.startsWith('0') ? g14.slice(1) : g14; // GTIN-14 → EAN-13 when leading 0
  }
  return cleaned;
}

type Detected = { rawValue: string };
interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<Detected[]>;
}
interface BarcodeDetectorCtor {
  new (opts?: { formats?: string[] }): BarcodeDetectorLike;
}

export function BarcodeScanner({ onDetected, disabled }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopRef = useRef<() => void>(() => {});
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState('');

  useEffect(() => () => stopRef.current(), []);

  function finish(code: string) {
    stopRef.current();
    setScanning(false);
    const gtin = extractGtin(code);
    if (gtin) onDetected(gtin);
  }

  async function start() {
    setError(null);
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;

    // 1. Native BarcodeDetector (Android Chrome).
    if (Detector) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        setScanning(true);
        const detector = new Detector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'data_matrix', 'qr_code'],
        });
        let active = true;
        stopRef.current = () => {
          active = false;
          stream.getTracks().forEach((t) => t.stop());
        };
        const tick = async () => {
          if (!active) return;
          try {
            const codes = await detector.detect(video);
            if (codes.length && codes[0].rawValue) {
              finish(codes[0].rawValue);
              return;
            }
          } catch {
            /* transient decode error — keep trying */
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        return;
      } catch {
        /* fall through to ZXing */
      }
    }

    // 2. ZXing fallback.
    try {
      const reader = new BrowserMultiFormatReader();
      setScanning(true);
      let controls: IScannerControls | null = null;
      controls = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
        if (result) finish(result.getText());
      });
      stopRef.current = () => controls?.stop();
    } catch {
      setScanning(false);
      setError(
        'Caméra indisponible. Vérifiez les permissions du navigateur (HTTPS ou localhost requis) ou utilisez la saisie manuelle.',
      );
    }
  }

  function stop() {
    stopRef.current();
    setScanning(false);
  }

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    const code = manual.trim();
    if (code) {
      setManual('');
      onDetected(extractGtin(code));
    }
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg bg-black" style={{ aspectRatio: '4 / 3' }}>
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          muted
          playsInline
          style={{ display: scanning ? 'block' : 'none' }}
        />
        {!scanning && (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
            Caméra éteinte
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {!scanning ? (
          <Button type="button" onClick={start} disabled={disabled} className="flex-1">
            📷 Scanner
          </Button>
        ) : (
          <Button type="button" variant="secondary" onClick={stop} className="flex-1">
            Arrêter
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <form onSubmit={submitManual} className="flex items-end gap-2">
        <div className="flex-1">
          <Field
            label="Saisie manuelle du code"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Code-barres / GTIN"
            inputMode="numeric"
            disabled={disabled}
          />
        </div>
        <Button type="submit" variant="secondary" disabled={disabled || !manual.trim()}>
          Valider
        </Button>
      </form>
    </div>
  );
}
