import React, { useRef, useEffect } from 'react';
import classes from "./Textarea.module.css";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {

}

function Textarea({ className, ...props }: TextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [props.value]);

  return (
    <textarea
      className={`${classes.input} ${className || ''}`}
      ref={textareaRef}
      rows={1}
      {...props}
    />
  );
}

export default Textarea;