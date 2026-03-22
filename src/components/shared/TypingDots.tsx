export function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label="печатает...">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-current opacity-50"
          style={{
            animation: `typing-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="typing-bounce"] { animation: none !important; opacity: 0.5 !important; }
        }
      `}</style>
    </span>
  );
}
