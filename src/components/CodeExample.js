import React, { useState } from 'react';
import './CodeExample.css';

const CodeExample = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="code-example">
      <div className="code-header">
        <span className="code-language">Python</span>
        <button className="copy-button" onClick={handleCopy}>
          {copied ? '✓ Copied!' : '📋 Copy'}
        </button>
      </div>
      <pre className="code-content">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export default CodeExample;
