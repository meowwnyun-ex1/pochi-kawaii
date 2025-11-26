import { useState, useImperativeHandle, forwardRef, useRef, useEffect } from 'react';
import { Loader2, Paperclip, X, Brain, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { showToast } from '@/utils/toast';

interface ChatInputProps {
  onSendMessage: (message: string, files?: File[], deepThink?: boolean) => void;
  isLoading: boolean;
}

export interface ChatInputHandle {
  setMessage: (message: string) => void;
}

const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(
  ({ onSendMessage, isLoading }, ref) => {
    const { t, language } = useLanguage();
    const [message, setMessage] = useState('');
    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
    const [deepThinkEnabled, setDeepThinkEnabled] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const MAX_MESSAGE_LENGTH = 2000;

    useImperativeHandle(ref, () => ({
      setMessage: (newMessage: string) => {
        setMessage(newMessage);
      },
    }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Check if adding these files would exceed the 10-file limit (per chat message)
    const totalFiles = attachedFiles.length + files.length;
    if (totalFiles > 10) {
      const fileLimitMsg = t('file:limit_reached') || t('file.limit_reached') || 'Maximum 10 files allowed';
      const detailedMsg = `${fileLimitMsg}\n\n${attachedFiles.length} → +${files.length} = ${totalFiles}`;
      showToast.error(detailedMsg, { duration: 5000, whiteSpace: 'pre-line' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
    const validFiles = files.filter((file) => {
      const isValidSize = file.size <= MAX_FILE_SIZE;

      // Support multiple file types: images, documents, spreadsheets, code files
      const isValidType =
        file.type.startsWith('image/') ||
        file.type === 'application/pdf' ||
        // Excel
        file.type === 'application/vnd.ms-excel' ||
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        // Word
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword' ||
        // PowerPoint
        file.type === 'application/vnd.ms-powerpoint' ||
        file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
        // Text & CSV
        file.type === 'text/plain' ||
        file.type === 'text/csv' ||
        file.type === 'application/csv' ||
        // JSON & XML
        file.type === 'application/json' ||
        file.type === 'text/xml' ||
        file.type === 'application/xml' ||
        // Code files by extension
        /\.(csv|txt|json|xml|py|js|ts|tsx|jsx|java|cpp|c|h|cs|php|rb|go|rs|swift|kt|sql|html|css|scss|md|yaml|yml|sh|bat)$/i.test(file.name);

      if (!isValidSize) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        const sizeErrorMsg = t('file:size_error') || t('file.size_error') || 'File too large (max 10MB)';
        showToast.error(`❌ ${file.name}\n${sizeErrorMsg}\nSize: ${fileSizeMB} MB`, { duration: 4000, whiteSpace: 'pre-line' });
        return false;
      }
      if (!isValidType) {
        const typeErrorMsg = t('file:type_error') || t('file.type_error') || 'File type not supported';
        showToast.error(`❌ ${file.name}\n${typeErrorMsg}`, { duration: 5000, whiteSpace: 'pre-line' });
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      const successMsg = t('file:added') || t('file.added') || 'File added';
      const totalCount = attachedFiles.length + validFiles.length;
      showToast.success(`✅ ${successMsg} (${totalCount}/10)`, { duration: 2000 });
    }

    setAttachedFiles((prev) => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setAttachedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    if (newMessage.length <= MAX_MESSAGE_LENGTH) {
      setMessage(newMessage);
    } else {
      const errorMessages = {
        th: `ขอโทษค่ะ ข้อความยาวเกินไปแล้วนะคะ สูงสุด ${MAX_MESSAGE_LENGTH} ตัวอักษรค่ะ (ตอนนี้ ${newMessage.length} ตัวอักษร)`,
        en: `Message too long! Maximum ${MAX_MESSAGE_LENGTH} characters (currently ${newMessage.length} characters)`,
        ja: `メッセージが長すぎます！最大${MAX_MESSAGE_LENGTH}文字（現在${newMessage.length}文字）`
      };
      showToast.error(errorMessages[language as keyof typeof errorMessages] || errorMessages.th);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((message.trim() || attachedFiles.length > 0) && !isLoading) {
      if (deepThinkEnabled) {
        const thinkMsg = t('chat:deep_think_processing') || t('chat.deep_think_processing') || '🧠 Deep thinking...';
        showToast.info(thinkMsg);
      }
      onSendMessage(message.trim(), attachedFiles.length > 0 ? attachedFiles : undefined, deepThinkEnabled);
      setMessage('');
      setAttachedFiles([]);
      // Note: deepThinkEnabled stays as is, will reset on refresh
    }
  };

  const toggleDeepThink = () => {
    if (!isLoading) {
      setDeepThinkEnabled(!deepThinkEnabled);
      const toggleMsg = !deepThinkEnabled
        ? (t('chat:deep_think_enabled') || t('chat.deep_think_enabled') || '🧠 Deep Think enabled')
        : (t('chat:deep_think_disabled') || t('chat.deep_think_disabled') || '⚡ Normal mode');
      showToast.info(toggleMsg, { duration: 2000 });
    }
  };

  // Clear files when component unmounts or page refreshes (for privacy)
  useEffect(() => {
    const handleBeforeUnload = () => {
      clearAllFiles();
    };

    const handleUnload = () => {
      clearAllFiles();
    };

    // Clear files on page refresh or close
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    // Clear files on component unmount
    return () => {
      clearAllFiles();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

    return (
      <div className="chat-input-container sticky bottom-0 p-4 border-t border-gray-200/50 bg-white/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-gray-200/50 shadow-xl hover:shadow-2xl transition-all duration-300">
            {attachedFiles.length > 0 && (
              <div className="p-4 border-b border-gray-200/50 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-100" style={{ scrollbarWidth: 'thin' }}>
                  {attachedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-gradient-to-r from-blue-100 to-indigo-100 border-2 border-blue-300 rounded-xl px-4 py-2 text-sm whitespace-nowrap flex-shrink-0 shadow-sm hover:shadow-md transition-all">
                      <span className="text-blue-700 font-medium">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="text-blue-600 hover:text-red-600 hover:bg-red-50 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-lg p-0.5"
                        aria-label={t('file:remove') || t('file.remove') || 'Remove file'}
                        title={t('file:remove') || t('file.remove') || 'Remove file'}>
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex items-end gap-3 p-4">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.xlsx,.xls,.docx,.doc,.pptx,.ppt,.csv,.txt,.json,.xml,.py,.js,.ts,.tsx,.jsx,.java,.cpp,.c,.h,.cs,.php,.rb,.go,.rs,.swift,.kt,.sql,.html,.css,.scss,.md,.yaml,.yml,.sh,.bat"
                onChange={handleFileChange}
                className="hidden"
                aria-label="File input"
              />

              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || attachedFiles.length >= 10}
                variant="ghost"
                size="icon"
                className="h-11 w-11 text-blue-600 hover:text-blue-700 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 relative"
                aria-label={attachedFiles.length >= 10 ? (t('file:limit_reached') || t('file.limit_reached') || 'Maximum 10 files allowed') : (t('file:attach_tooltip') || t('file.attach_tooltip') || 'Attach file')}
                title={
                  attachedFiles.length >= 10
                    ? (t('file:limit_reached') || t('file.limit_reached') || 'Maximum 10 files allowed')
                    : (t('file:attach_tooltip') || t('file.attach_tooltip') || 'Attach file')
                }>
                <Paperclip className="h-5 w-5" />
                {attachedFiles.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold shadow-lg border-2 border-white">
                    {attachedFiles.length}
                  </span>
                )}
              </Button>

              <div className="flex-1 relative">
                <Textarea
                  value={message}
                  onChange={handleMessageChange}
                  onKeyDown={handleKeyPress}
                  placeholder={t('chat:type_message') || 'Type your message...'}
                  className="resize-none min-h-[20px] max-h-32 border-0 focus:ring-0 bg-transparent text-gray-800 placeholder:text-gray-400 text-base leading-6 pr-20"
                  disabled={isLoading}
                  rows={1}
                  aria-label={t('chat:type_message') || 'Message input'}
                  aria-describedby="message-length"
                  maxLength={MAX_MESSAGE_LENGTH}
                  style={{
                    height: 'auto',
                    minHeight: '48px',
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                  }}
                />
                <div 
                  id="message-length"
                  className="absolute bottom-3 right-3 text-xs pointer-events-none font-medium px-2 py-1 rounded-md bg-gray-100/50" 
                  style={{
                    color: message.length >= MAX_MESSAGE_LENGTH ? '#DC2626' :
                           message.length > MAX_MESSAGE_LENGTH * 0.8 ? '#F59E0B' :
                           '#6B7280'
                  }}
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {message.length}/{MAX_MESSAGE_LENGTH}
                </div>
              </div>

              {/* Deep Think Toggle */}
              <Button
                type="button"
                onClick={toggleDeepThink}
                disabled={isLoading}
                className={`h-11 w-11 rounded-xl transition-all duration-300 disabled:opacity-50 group focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 shadow-md hover:shadow-lg ${
                  deepThinkEnabled
                    ? 'bg-gradient-to-br from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 shadow-purple-500/50'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                }`}
                size="icon"
                title={t('chat:deep_think_tooltip') || t('chat.deep_think_tooltip') || 'Toggle Deep Think mode'}
                aria-label={t('chat:deep_think_tooltip') || t('chat.deep_think_tooltip') || 'Toggle Deep Think mode'}
                aria-pressed={deepThinkEnabled}>
                <Brain
                  className={`h-5 w-5 group-hover:scale-110 transition-transform ${
                    deepThinkEnabled ? 'text-white' : 'text-gray-600'
                  }`}
                  aria-hidden="true"
                />
              </Button>

              {/* Send Button */}
              <Button
                type="submit"
                disabled={(!message.trim() && attachedFiles.length === 0) || isLoading}
                className="h-11 w-11 bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:bg-gray-300 rounded-xl transition-all duration-300 disabled:opacity-50 group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg hover:shadow-xl"
                size="icon"
                title={t('chat:normal_send_tooltip') || t('chat.normal_send_tooltip') || 'Send message'}
                aria-label={isLoading ? (t('chat:sending') || t('chat.sending') || 'Sending message...') : (t('chat:send') || t('chat.send') || 'Send message')}
                aria-busy={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white" aria-hidden="true" />
                ) : (
                  <Zap className="h-5 w-5 text-white group-hover:scale-110 transition-transform" aria-hidden="true" />
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }
);

ChatInput.displayName = 'ChatInput';

export default ChatInput;
