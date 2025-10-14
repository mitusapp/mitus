import * as React from 'react';
import { Command as CommandPrimitive } from 'cmdk';

export function Command({ className = '', ...props }) {
  return (
    <CommandPrimitive
      className={[
        'flex h-full w-full flex-col overflow-hidden rounded-md border border-gray-200 bg-white text-gray-900',
        className,
      ].join(' ')}
      {...props}
    />
  );
}

export const CommandInput = React.forwardRef(function CommandInput(
  { className = '', ...props },
  ref
) {
  return (
    <div className="p-2">
      <CommandPrimitive.Input
        ref={ref}
        className={[
          'w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm outline-none',
          'focus:ring-2 focus:ring-[#9E7977] focus:border-transparent',
          className,
        ].join(' ')}
        {...props}
      />
    </div>
  );
});

export const CommandList = React.forwardRef(function CommandList(
  { className = '', ...props },
  ref
) {
  return (
    <CommandPrimitive.List
      ref={ref}
      className={['max-h-56 overflow-auto p-1', className].join(' ')}
      {...props}
    />
  );
});

export const CommandEmpty = function CommandEmpty({ className = '', ...props }) {
  return (
    <CommandPrimitive.Empty
      className={['px-3 py-2 text-sm text-gray-500', className].join(' ')}
      {...props}
    />
  );
};

export const CommandGroup = React.forwardRef(function CommandGroup(
  { className = '', ...props },
  ref
) {
  return (
    <CommandPrimitive.Group
      ref={ref}
      className={['p-1', className].join(' ')}
      {...props}
    />
  );
});

export const CommandItem = React.forwardRef(function CommandItem(
  { className = '', ...props },
  ref
) {
  return (
    <CommandPrimitive.Item
      ref={ref}
      className={[
        'flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm',
        'data-[selected=true]:bg-gray-100',
        className,
      ].join(' ')}
      {...props}
    />
  );
});
