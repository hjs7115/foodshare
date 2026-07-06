import { ImgHTMLAttributes, useEffect, useState } from 'react';
import { API_BASE_URL, resolveImageUrl } from '../../api/config';

const imageCache = new Map<string, string>();

type BackendImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string | null;
  fallbackSrc?: string;
};

export default function BackendImage({ src, fallbackSrc = '/assets/food-placeholder.png', ...props }: BackendImageProps) {
  const [displaySrc, setDisplaySrc] = useState(() => src ? resolveImageUrl(src) : fallbackSrc);

  useEffect(() => {
    const resolvedSrc = src ? resolveImageUrl(src) : fallbackSrc;
    setDisplaySrc(resolvedSrc);

    if (!resolvedSrc.startsWith(`${API_BASE_URL}/uploads/`)) {
      return;
    }

    if (imageCache.has(resolvedSrc)) {
      setDisplaySrc(imageCache.get(resolvedSrc)!);
      return;
    }

    let isMounted = true;

    fetch(resolvedSrc, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
      mode: 'cors',
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Image request failed: ${response.status}`);
        }
        return response.blob();
      })
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        imageCache.set(resolvedSrc, objectUrl);
        if (isMounted) {
          setDisplaySrc(objectUrl);
        }
      })
      .catch(() => {
        if (isMounted) {
          setDisplaySrc(fallbackSrc);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [fallbackSrc, src]);

  return <img src={displaySrc} {...props} />;
}
