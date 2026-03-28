import React from 'react';
import classes from "./Input.module.css";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  
}

function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={`${classes.input} ${className || ''}`}
      {...props}
    />
  );
}

export default Input;