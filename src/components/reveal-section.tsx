"use client";

import { useEffect, useRef, useState } from "react";

export function RevealSection({
  children,
  className = "",
  staggerSelector = "[data-reveal-child]"
}: {
  children: React.ReactNode;
  className?: string;
  staggerSelector?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;

    if (!node) {
      return undefined;
    }

    const childrenToStagger = Array.from(node.querySelectorAll<HTMLElement>(staggerSelector));
    childrenToStagger.forEach((child, index) => {
      child.style.transitionDelay = `${index * 100}ms`;
    });

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return;
        }

        setIsVisible(true);
        observer.disconnect();
      },
      {
        threshold: 0.18,
        rootMargin: "0px 0px -12% 0px"
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [staggerSelector]);

  return (
    <section ref={ref} className={["reveal", isVisible ? "visible" : "", className].filter(Boolean).join(" ")}>
      {children}
    </section>
  );
}
