import { useState, useEffect, useRef } from 'react';

export default function CountUp({
  value,
  duration = 700,
  decimals,
  prefix = '',
  suffix = '',
  className = ''
}) {
  const targetNum = typeof value === 'number' ? value : parseFloat(value) || 0;
  
  // Detect decimal places if not explicitly specified
  const effectiveDecimals = typeof decimals === 'number'
    ? decimals
    : (String(value).includes('.') ? String(value).split('.')[1].length : 0);

  const [displayValue, setDisplayValue] = useState(() => {
    // Check prefers-reduced-motion or SSR immediately
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return targetNum;
    }
    return 0;
  });

  const animRef = useRef(null);
  const startTimeRef = useRef(null);
  const startValueRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      animRef.current = requestAnimationFrame(() => {
        setDisplayValue(targetNum);
      });
      return () => {
        if (animRef.current) cancelAnimationFrame(animRef.current);
      };
    }

    startValueRef.current = 0;
    startTimeRef.current = null;

    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      
      // easeOutQuad curve
      const eased = 1 - (1 - progress) * (1 - progress);
      const current = startValueRef.current + (targetNum - startValueRef.current) * eased;

      setDisplayValue(current);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetNum);
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [targetNum, duration]);

  const formatted = effectiveDecimals > 0
    ? displayValue.toFixed(effectiveDecimals)
    : Math.round(displayValue).toLocaleString();

  return (
    <span className={`count-up-number font-mono ${className}`}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
