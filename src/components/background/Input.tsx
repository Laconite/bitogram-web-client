import React from 'react';
import classes from "./Input.module.css";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  isError: boolean;
}

function Input({ isError, ...props }: InputProps) {
  const inputClass = `${classes.input} ${isError ? classes.inputError : ''}`.trim();

  return (
    <input className={inputClass} {...props}/>
  );
}

export default Input;