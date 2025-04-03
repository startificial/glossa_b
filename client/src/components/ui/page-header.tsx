import { cn } from "@/lib/utils";
import React from "react";

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

function PageHeader({ className, ...props }: PageHeaderProps) {
  return (
    <div className={cn("grid gap-1", className)} {...props} />
  );
}

interface PageHeaderHeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {}

function PageHeaderHeading({ className, ...props }: PageHeaderHeadingProps) {
  return (
    <h1 className={cn("text-2xl font-bold tracking-tight", className)} {...props} />
  );
}

interface PageHeaderDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

function PageHeaderDescription({ className, ...props }: PageHeaderDescriptionProps) {
  return (
    <p
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  );
}

export { PageHeader, PageHeaderHeading, PageHeaderDescription };