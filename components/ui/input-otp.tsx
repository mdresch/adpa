"use client"

import * as React from "react"
import { OTPInput, OTPInputContext } from "input-otp"
import Icons from "./icons-shim"

import { cn } from "@/lib/utils"

const InputOTP = React.forwardRef(function InputOTP(
  props: React.ComponentPropsWithoutRef<typeof OTPInput>,
  ref: React.ForwardedRef<any>
) {
  const { className, containerClassName, ...rest } = props

  return (
    <OTPInput
      ref={ref}
      containerClassName={cn(
        "flex items-center gap-2 has-[:disabled]:opacity-50",
        containerClassName
      )}
      className={cn("disabled:cursor-not-allowed", className)}
      {...rest}
    />
  )
})
InputOTP.displayName = "InputOTP"

const InputOTPGroup = React.forwardRef(function InputOTPGroup(
  props: React.ComponentPropsWithoutRef<"div">,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const { className, ...rest } = props

  return <div ref={ref} className={cn("flex items-center", className)} {...rest} />
})
InputOTPGroup.displayName = "InputOTPGroup"

const InputOTPSlot = React.forwardRef(function InputOTPSlot(
  props: React.ComponentPropsWithoutRef<"div"> & { index: number },
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const { index, className, ...rest } = props
  const inputOTPContext = React.useContext(OTPInputContext)
  const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index]

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex h-10 w-10 items-center justify-center border-y border-r border-input text-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md",
        isActive && "z-10 ring-2 ring-ring ring-offset-background",
        className
      )}
      {...rest}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>
  )
})
InputOTPSlot.displayName = "InputOTPSlot"

const InputOTPSeparator = React.forwardRef(function InputOTPSeparator(
  props: React.ComponentPropsWithoutRef<"div">,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const { ...rest } = props

  return (
    <div ref={ref} role="separator" {...rest}>
      <Icons.Circle />
    </div>
  )
})
InputOTPSeparator.displayName = "InputOTPSeparator"

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }
