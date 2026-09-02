import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './ui/button'
import { Card } from './ui/card'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('App crashed:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-background p-6">
          <Card className="p-10 text-center">
            <p className="text-4xl font-bold text-primary">Oops!</p>
            <h1 className="mt-3 text-lg font-semibold text-foreground">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              An unexpected error occurred. Try reloading the page.
            </p>
            <Button className="mt-6" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </Card>
        </div>
      )
    }
    return this.props.children
  }
}
