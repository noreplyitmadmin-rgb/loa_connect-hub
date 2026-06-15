"use client"

import IosButton from "./IosButton"
import type { ComponentProps } from "react"

type IosButtonProps = ComponentProps<typeof IosButton>

interface SubmitButtonProps extends Omit<IosButtonProps, "variant"> {
  variant?: "primary" | "secondary" | "success" | "danger" | "ios-primary" | "ios-tinted" | "ios-gray" | "ios-plain" | "ios-destructive"
}

const legacyToNew: Record<string, "primary" | "tinted" | "success" | "destructive" | "gray" | "plain"> = {
  primary: "primary",
  secondary: "gray",
  success: "success",
  danger: "destructive",
  "ios-primary": "primary",
  "ios-tinted": "tinted",
  "ios-gray": "gray",
  "ios-plain": "plain",
  "ios-destructive": "destructive",
}

export default function SubmitButton({
  variant = "primary",
  ...props
}: SubmitButtonProps) {
  return <IosButton variant={legacyToNew[variant]} {...props} />
}
