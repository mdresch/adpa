import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { ChevronRight, MoreHorizontal } from "./icons-shim"

import { cn } from "@/lib/utils"

const Breadcrumb = React.forwardRef(function Breadcrumb(
  props: React.ComponentPropsWithoutRef<'nav'> & { separator?: React.ReactNode },
  ref: React.ForwardedRef<HTMLElement>
) {
  return <nav ref={ref} aria-label="breadcrumb" {...props} />
})
Breadcrumb.displayName = "Breadcrumb"

const BreadcrumbList = React.forwardRef(function BreadcrumbList(
  props: React.ComponentPropsWithoutRef<'ol'>,
  ref: React.ForwardedRef<HTMLOListElement>
) {
  const { className, ...rest } = props

  return (
    <ol
      ref={ref}
      className={cn(
        "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5",
        className
      )}
      {...rest}
    />
  )
})
BreadcrumbList.displayName = "BreadcrumbList"

const BreadcrumbItem = React.forwardRef(function BreadcrumbItem(
  props: React.ComponentPropsWithoutRef<'li'>,
  ref: React.ForwardedRef<HTMLLIElement>
) {
  const { className, ...rest } = props

  return (
    <li ref={ref} className={cn("inline-flex items-center gap-1.5", className)} {...rest} />
  )
})
BreadcrumbItem.displayName = "BreadcrumbItem"

const BreadcrumbLink = React.forwardRef(function BreadcrumbLink(
  { asChild, className, ...props }: React.ComponentPropsWithoutRef<'a'> & { asChild?: boolean },
  ref: React.ForwardedRef<HTMLAnchorElement>
) {
  const Comp: any = asChild ? Slot : 'a'

  return <Comp ref={ref} className={cn("transition-colors hover:text-foreground", className)} {...props} />
})
BreadcrumbLink.displayName = "BreadcrumbLink"

const BreadcrumbPage = React.forwardRef(function BreadcrumbPage(
  props: React.ComponentPropsWithoutRef<'span'>,
  ref: React.ForwardedRef<HTMLSpanElement>
) {
  const { className, ...rest } = props

  return (
    <span
      ref={ref}
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("font-normal text-foreground", className)}
      {...rest}
    />
  )
})
BreadcrumbPage.displayName = "BreadcrumbPage"

const BreadcrumbSeparator = ({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) => (
  <li
    role="presentation"
    aria-hidden="true"
    className={cn("[&>svg]:w-3.5 [&>svg]:h-3.5", className)}
    {...props}
  >
    {children ?? <ChevronRight />}
  </li>
)
BreadcrumbSeparator.displayName = "BreadcrumbSeparator"

const BreadcrumbEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    role="presentation"
    aria-hidden="true"
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More</span>
  </span>
)
BreadcrumbEllipsis.displayName = "BreadcrumbElipssis"

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
}
