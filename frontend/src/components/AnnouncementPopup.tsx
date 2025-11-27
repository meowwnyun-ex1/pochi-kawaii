import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Announcement {
  id: number;
  title?: string;
  image_url: string;
  link_url?: string;
  display_order: number;
}

const AnnouncementPopup = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const apiBaseUrl = import.meta.env.VITE_API_URL || '';
    const basePath = import.meta.env.VITE_BASE_PATH || '/pochi-kawaii';
    const controller = new AbortController();
    let autoCloseTimer: ReturnType<typeof setTimeout> | null = null;
    
    const fetchAnnouncements = async () => {
      try {
        const apiPath = apiBaseUrl 
          ? `${apiBaseUrl}/api/announcements/active` 
          : `${basePath}/api/announcements/active`;
        const response = await fetch(apiPath, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Response is not JSON');
        }

        const data = await response.json();
        
        if (data && data.announcements && Array.isArray(data.announcements) && data.announcements.length > 0) {
          const activeAnnouncements = data.announcements.filter((ann: Announcement) => ann.image_url);
          
          const closedAnnouncements = JSON.parse(localStorage.getItem('closed_announcements') || '[]');
          const visibleAnnouncements = activeAnnouncements.filter(
            (ann: Announcement) => !closedAnnouncements.includes(ann.id)
          );
          
          if (visibleAnnouncements.length > 0) {
            setAnnouncements(visibleAnnouncements);
            setIsVisible(true);

            autoCloseTimer = setTimeout(() => {
              handleClose();
            }, 20000);
          }
        }
      } catch (err) {
        if (import.meta.env.DEV && err instanceof Error && err.name !== 'AbortError') {
          console.error('Failed to fetch announcements:', err);
        }
      }
    };

    fetchAnnouncements();

    return () => {
      controller.abort();
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
      }
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    try {
      const closedAnnouncements = JSON.parse(localStorage.getItem('closed_announcements') || '[]');
      announcements.forEach(ann => {
        if (ann?.id && !closedAnnouncements.includes(ann.id)) {
          closedAnnouncements.push(ann.id);
        }
      });
      localStorage.setItem('closed_announcements', JSON.stringify(closedAnnouncements));
    } catch (error) {
      console.warn('Failed to save closed announcements:', error);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % announcements.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
  };

  const handleImageClick = () => {
    const announcement = announcements[currentIndex];
    if (announcement.link_url) {
      window.open(announcement.link_url, '_blank', 'noopener,noreferrer');
    }
  };

  if (!isVisible || announcements.length === 0) {
    return null;
  }

  const currentAnnouncement = announcements[currentIndex];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={handleBackdropClick}>
      <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-4xl w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-300 border-2 border-gray-200/50">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm rounded-full p-2.5 shadow-xl hover:bg-white hover:scale-110 transition-all duration-200"
          aria-label="Close announcement">
          <X className="h-6 w-6 text-gray-700" />
        </button>

        {/* Image Container */}
        <div className="relative">
          <img
            src={currentAnnouncement.image_url}
            alt={currentAnnouncement.title || 'Announcement'}
            className={`w-full h-auto max-h-[80vh] object-contain ${
              currentAnnouncement.link_url ? 'cursor-pointer' : ''
            }`}
            onClick={handleImageClick}
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="800"%3E%3Crect fill="%23f3f4f6" width="800" height="800"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" fill="%239ca3af"%3EImage not found%3C/text%3E%3C/svg%3E';
            }}
          />

          {/* Navigation Arrows (if multiple announcements) */}
          {announcements.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full p-3 shadow-xl hover:scale-110 transition-all duration-200"
                aria-label="Previous announcement">
                <svg
                  className="w-6 h-6 text-gray-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full p-3 shadow-xl hover:scale-110 transition-all duration-200"
                aria-label="Next announcement">
                <svg
                  className="w-6 h-6 text-gray-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Dots Indicator */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-white/80 backdrop-blur-sm px-3 py-2 rounded-full shadow-lg">
                {announcements.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentIndex
                        ? 'bg-blue-600 w-8'
                        : 'bg-gray-300 w-2 hover:bg-gray-400'
                    }`}
                    aria-label={`Go to announcement ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default AnnouncementPopup;
