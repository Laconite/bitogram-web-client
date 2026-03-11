import React from 'react';
import classes from "./Input.module.css";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {

}

function Input({ ...props }: InputProps) {
  return (
    <input className={classes.input} {...props}/>
  );
}

export default Input;