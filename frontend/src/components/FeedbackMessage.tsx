export type Feedback = {
  type: 'success' | 'error' | 'loading' | 'info';
  text: string;
};

interface FeedbackMessageProps {
  feedback: Feedback | null;
  onDismiss?: () => void;
}

export function FeedbackMessage({ feedback, onDismiss }: FeedbackMessageProps) {
  if (!feedback) return null;

  return (
    <div
      className={`feedback-message feedback-${feedback.type}`}
      role={feedback.type === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <span className="feedback-icon" aria-hidden="true">
        {feedback.type === 'success' && '✓'}
        {feedback.type === 'error' && '!'}
        {feedback.type === 'loading' && <span className="loading-spinner"></span>}
        {feedback.type === 'info' && 'i'}
      </span>
      <span>{feedback.text}</span>
      {onDismiss && feedback.type !== 'loading' && (
        <button type="button" onClick={onDismiss} aria-label="Fechar mensagem">×</button>
      )}
    </div>
  );
}
