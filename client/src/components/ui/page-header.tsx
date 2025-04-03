import React from 'react';

interface PageHeaderProps {
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ children, className }: PageHeaderProps) {
  return (
    <div className={`flex flex-col gap-1 ${className || ''}`}>
      {children}
    </div>
  );
}

interface PageHeaderHeadingProps {
  children?: React.ReactNode;
  className?: string;
}

export function PageHeaderHeading({ children, className }: PageHeaderHeadingProps) {
  return (
    <h1 className={`text-2xl font-bold tracking-tight ${className || ''}`}>
      {children}
    </h1>
  );
}

interface PageHeaderDescriptionProps {
  children?: React.ReactNode;
  className?: string;
}

export function PageHeaderDescription({ children, className }: PageHeaderDescriptionProps) {
  return (
    <p className={`text-muted-foreground ${className || ''}`}>
      {children}
    </p>
  );
}