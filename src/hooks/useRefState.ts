import { useRef, useState, useCallback } from 'react';

type SetStateAction<T> = T | ((prevState: T) => T);

function useRefState<T>(initialValue: T): [T, (value: SetStateAction<T>) => void, React.RefObject<T>] {
  const [state, setState] = useState<T>(initialValue);
  const ref = useRef<T>(state);
  
  const setRefState = useCallback((newValue: SetStateAction<T>) => {
    ref.current = typeof newValue === 'function' 
      ? (newValue as (prev: T) => T)(ref.current) 
      : newValue;
    setState(ref.current);
  }, []);
  
  return [state, setRefState, ref];
}

export default useRefState;