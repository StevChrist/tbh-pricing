"use client";

import { useRef, useEffect } from "react";

interface OtpInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  error?: boolean;
}

export function OtpInput({ value, onChange, disabled = false, error = false }: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus the first empty input or the first input on mount
    const firstEmptyIndex = value.findIndex((digit) => !digit);
    const focusIndex = firstEmptyIndex === -1 ? 0 : firstEmptyIndex;
    inputRefs.current[focusIndex]?.focus();
  }, []);

  useEffect(() => {
    // If the entire array is cleared, focus the first box
    if (value.every((digit) => !digit)) {
      inputRefs.current[0]?.focus();
    }
  }, [value]);

  const handleChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[index] = digit;
    onChange(next);

    // Auto-advance
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (value[index]) {
        const next = [...value];
        next[index] = "";
        onChange(next);
      } else if (index > 0) {
        const next = [...value];
        next[index - 1] = "";
        onChange(next);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    if (disabled) return;
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = Array(6).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    onChange(next);
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        justifyContent: "center",
      }}
      onPaste={handlePaste}
    >
      {value.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          style={{
            width: "38px",
            height: "46px",
            borderRadius: "8px",
            border: `2px solid ${
              error
                ? "var(--accent-orange)"
                : digit
                ? "var(--primary)"
                : "var(--border)"
            }`,
            backgroundColor: "var(--surface-offset)",
            color: "var(--text)",
            fontSize: "1.25rem",
            fontWeight: 700,
            textAlign: "center",
            outline: "none",
            transition: "border-color 150ms ease",
            caretColor: "transparent",
            opacity: disabled ? 0.6 : 1,
          }}
        />
      ))}
    </div>
  );
}
