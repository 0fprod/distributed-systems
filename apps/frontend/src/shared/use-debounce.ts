import { useEffect, useState } from "react";

export function useDebounce(
  externalValue: string,
  onCommit: (value: string) => void,
  delay = 1500,
) {
  const [input, setInput] = useState(externalValue);

  useEffect(() => {
    const timer = setTimeout(() => onCommit(input), delay);
    return () => clearTimeout(timer);
  }, [input, onCommit, delay]);

  return [input, setInput] as const;
}
