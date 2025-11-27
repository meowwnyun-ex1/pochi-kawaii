import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Sparkles, Star, Zap, User, MessageSquare } from 'lucide-react';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Textarea } from '@/components/ui/textarea';

const FeedbackForm = () => {
  const navigate = useNavigate();
  const { language, config } = useLanguage();
  const [name, setName] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL;
  const feedbackTexts = (config?.feedback_page as Record<string, Record<string, string>> | undefined) || {};
  const lang = language as 'th' | 'en' | 'jp';

  const getFeedbackText = (key: string, fallback: string) => {
    const textObj = feedbackTexts[key];
    if (!textObj) return fallback;
    return textObj[lang] || textObj.th || textObj.en || fallback;
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      showToast.error(getFeedbackText('ratingRequired', 'Please select a rating'));
      return;
    }

    if (!comment.trim()) {
      showToast.error(getFeedbackText('commentRequired', 'Please enter a comment'));
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
          language: lang,
        }),
      });

      if (response.ok) {
        showToast.success(getFeedbackText('successTitle', 'Thank you!'), {
          description: getFeedbackText('successMessage', 'Your feedback has been submitted successfully'),
          duration: 5000,
        });
        setName('');
        setRating(0);
        setComment('');
        setTimeout(() => navigate('/'), 2000);
      } else {
        showToast.error(getFeedbackText('errorMessage', 'Failed to submit feedback'));
      }
    } catch (error) {
      showToast.error(getFeedbackText('errorMessage', 'Failed to submit feedback'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 relative pt-16">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-pink-400/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-20 right-20 w-96 h-96 bg-rose-400/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        />
        <div
          className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-300/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '2s' }}
        />
      </div>

      <div className="relative w-full max-w-lg">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border-2 border-pink-100 overflow-hidden">
          <div className="relative bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500 p-4 text-white">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIiIG9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-20" />
            <div className="relative flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm shadow-lg">
                <Sparkles className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold mb-1">{getFeedbackText('title', 'Feedback')}</h1>
                <p className="text-pink-100 text-sm font-medium">{getFeedbackText('subtitle', 'Share your thoughts')}</p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-pink-700 mb-2">
                <User className="h-4 w-4" />
                {getFeedbackText('nameLabel', 'Name')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={getFeedbackText('namePlaceholder', 'Your name (optional)')}
                className="w-full px-4 py-3 text-sm bg-white border-2 border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all shadow-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-pink-700 mb-3 text-center">
                {getFeedbackText('ratingLabel', 'Rating')}
              </label>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`group relative p-2 transition-all duration-300 ${
                      rating >= star ? 'scale-110' : 'scale-100 hover:scale-110'
                    }`}>
                    <Star
                      className={`h-10 w-10 transition-all duration-300 ${
                        rating >= star
                          ? 'fill-yellow-400 text-yellow-400 drop-shadow-lg'
                          : 'fill-gray-200 text-gray-300 group-hover:fill-yellow-200 group-hover:text-yellow-300'
                      }`}
                    />
                    {rating >= star && (
                      <div className="absolute inset-0 animate-ping">
                        <Star className="h-10 w-10 fill-yellow-400 text-yellow-400 opacity-20" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-pink-700 mb-2">
                <MessageSquare className="h-4 w-4" />
                {getFeedbackText('commentLabel', 'Comment')}
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={getFeedbackText('commentPlaceholder', 'Enter your feedback...')}
                className="w-full min-h-[120px] px-4 py-3 text-sm bg-white border-2 border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all resize-none shadow-sm"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="relative w-full group overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500" />
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative px-6 py-4 flex items-center justify-center gap-3 text-white font-bold text-lg">
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{getFeedbackText('submitting', 'Sending...')}</span>
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    <span>{getFeedbackText('submit', 'Submit')}</span>
                    <Zap className="h-5 w-5 animate-pulse" />
                  </>
                )}
              </div>
            </button>

            <button
              onClick={() => navigate('/')}
              className="relative mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-pink-200 hover:bg-pink-50 hover:border-pink-300 rounded-xl transition-all duration-300 text-sm text-pink-700 font-semibold shadow-md hover:shadow-lg hover:scale-105">
              <ArrowLeft className="h-5 w-5" />
              {getFeedbackText('backToChat', 'Back to Chat')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackForm;

