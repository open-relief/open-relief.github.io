import './Greeting.css';

import { useState } from 'react';
import { JSLogo } from '../JSLogo/JSLogo.tsx';
import { Greeting as KotlinGreeting } from 'shared';
import type { AnimationEvent } from 'react';

export function Greeting() {
  // the Kotlin/JS library is built separately; during initial development
  // it might not exist yet, so fall back to a dummy implementation rather than
  // crashing the whole app.
  let greeting: { greet: () => string };
  try {
    greeting = new KotlinGreeting();
  } catch (e) {
    console.warn('shared module not available, using fallback', e);
    greeting = {
      greet: () => '(shared library not loaded)'
    };
  }

  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  const handleClick = () => {
    if (isVisible) {
      setIsAnimating(true);
    } else {
      setIsVisible(true);
    }
  };

  const handleAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.animationName === 'fadeOut') {
      setIsVisible(false);
      setIsAnimating(false);
    }
  };

  return (
    <div className="greeting-container">
      <button onClick={handleClick} className="greeting-button">
        Click me!
      </button>

      {isVisible && (
        <div className={isAnimating ? 'greeting-content fade-out' : 'greeting-content'} onAnimationEnd={handleAnimationEnd}>
          <JSLogo />
          <div>React: {greeting.greet()}</div>
        </div>
      )}
    </div>
  );
}