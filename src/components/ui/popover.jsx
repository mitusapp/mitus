import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export const PopoverContent = React.forwardRef(
  ({ className = '', align = 'start', sideOffset = 4, ...props }, ref) => (
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={[
        // base
        'z-50 rounded-md border border-gray-200 bg-white p-2 shadow-md outline-none',
        // anim / positioning helpers opcionales
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1',
        className,
      ].join(' ')}
      {...props}
    />
  )
);
PopoverContent.displayName = 'PopoverContent';
