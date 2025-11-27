import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Star, User, MessageSquare } from 'lucide-react';
import { showToast } from '@/utils/toast';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';

const FeedbackForm = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  const handleSubmit = async () => {
    if (rating === 0) {
      showToast.error(t('feedback:ratingRequired'));
      return;
    }

    if (!comment.trim()) {
      showToast.error(t('feedback:commentRequired'));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim() || 'Anonymous',
          rating,
          comment: comment.trim(),
        }),
      });

      if (response.ok) {
        showToast.success(t('feedback:successTitle'), {
          description: t('feedback:successMessage'),
          duration: 5000,
        });
        setName('');
        setRating(0);
        setComment('');
        setTimeout(() => navigate('/'), 2000);
      } else {
        showToast.error(t('feedback:errorMessage'));
      }
    } catch (error) {
      showToast.error(t('feedback:errorMessage'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex items-center justify-center p-4 relative min-h-full">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-blue-200/5 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-200/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        />
        <div
          className="absolute top-1/2 left-1/2 w-80 h-80 bg-slate-200/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '2s' }}
        />
      </div>

      <div className="relative w-full max-w-md my-auto -mt-8">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden">
          <div className="relative bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 p-5 text-gray-800 border-b border-gray-100">
            <div className="relative flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <img src={`${import.meta.env.VITE_BASE_PATH || '/pochi-kawaii'}/ai-avatar.svg`} alt="Logo" className="h-7 w-7" onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.style.display = 'none';
                }} />
              </div>
              <div>
                <h1 className="text-xl font-bold mb-0.5">{t('feedback:title')}</h1>
                <p className="text-gray-600 text-xs font-medium">{t('feedback:subtitle')}</p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <User className="h-4 w-4 text-blue-500" />
                {t('feedback:nameLabel')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('feedback:namePlaceholder')}
                className="w-full px-3 py-2.5 text-sm bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 transition-all shadow-sm hover:border-gray-300"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3 text-center">
                {t('feedback:ratingLabel')}
              </label>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`group relative p-1.5 transition-all duration-300 ${
                      rating >= star ? 'scale-110' : 'scale-100 hover:scale-110'
                    }`}>
                    <Star
                      className={`h-7 w-7 transition-all duration-300 ${
                        rating >= star
                          ? 'fill-amber-400 text-amber-500 drop-shadow-lg'
                          : 'fill-gray-100 text-gray-300 group-hover:fill-amber-100 group-hover:text-amber-200'
                      }`}
                    />
                    {rating >= star && (
                      <div className="absolute inset-0 animate-ping">
                        <Star className="h-7 w-7 fill-amber-400 text-amber-500 opacity-20" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-center text-xs text-gray-500 mt-2">
                  {rating === 5 && '⭐⭐⭐⭐⭐'}
                  {rating === 4 && '⭐⭐⭐⭐'}
                  {rating === 3 && '⭐⭐⭐'}
                  {rating === 2 && '⭐⭐'}
                  {rating === 1 && '⭐'}
                </p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                {t('feedback:commentLabel')}
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('feedback:commentPlaceholder')}
                className="w-full min-h-[100px] px-3 py-2.5 text-sm bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 transition-all resize-none shadow-sm hover:border-gray-300"
                maxLength={1000}
              />
              <div className="flex justify-between items-center mt-1.5">
                <p className="text-xs text-gray-400">
                  {t('feedback:commentHint')}
                </p>
                <p className={`text-xs font-medium ${
                  comment.length > 900 ? 'text-red-500' : 
                  comment.length > 700 ? 'text-amber-500' : 
                  'text-gray-400'
                }`}>
                  {comment.length}/1000
                </p>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || rating === 0 || !comment.trim()}
              className="relative w-full group overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500" />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative px-5 py-3 flex items-center justify-center gap-2 text-white font-semibold text-sm">
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t('feedback:submitting')}</span>
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    <span>{t('feedback:submit')}</span>
                  </>
                )}
              </div>
            </button>

            <button
              onClick={() => navigate('/')}
              className="relative mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-lg transition-all duration-300 text-xs text-gray-700 font-semibold shadow-sm hover:shadow-md">
              <ArrowLeft className="h-4 w-4" />
              {t('feedback:backToChat')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackForm;

