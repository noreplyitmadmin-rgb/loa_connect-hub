"use client"

import { Component } from "react"
import ErrorState from "./ErrorState"

interface Props {
  children: React.ReactNode
  onRetry?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
    this.props.onRetry?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          message={this.state.error?.message}
          onRetry={this.handleRetry}
        />
      )
    }
    return this.props.children
  }
}
