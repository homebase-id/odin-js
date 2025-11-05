import { Input } from '@homebase-id/common-app';
import { CloseEye, Eye } from '@homebase-id/common-app/icons';
import React, { useState, useEffect, DetailedHTMLProps } from 'react';

export const MaskedInput = (
  props: DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>
) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setShow(false), 1000 * 15);
    return () => clearTimeout(timeout);
  }, [show]);

  return (
    <div className="relative">
      <Input
        {...props}
        ref={undefined}
        type="text"
        className={`appearance-none pr-10 ${props.className}`}
        style={{
          WebkitTextSecurity: show ? 'none' : 'disc', // Chrome/Safari/Edge
          MozTextSecurity: show ? 'none' : 'disc', // Some Firefox builds support this
        } as React.CSSProperties}
      />
      <a
        onClick={() => setShow(!show)}
        className="absolute bottom-0 right-0 top-0 flex cursor-pointer items-center justify-center pr-3 opacity-70 transition-opacity hover:opacity-100"
      >
        {show ? <CloseEye className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
      </a>
    </div>
  );
};
