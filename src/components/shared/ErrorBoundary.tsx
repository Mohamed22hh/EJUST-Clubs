import { Component, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a] px-4">
          <div className="max-w-md w-full text-center">
            <img src="/logo.png" alt="E-JUST" className="h-12 w-12 mx-auto mb-6 rounded-2xl opacity-50" />
            <h2 className="font-serif text-2xl text-[#0a0a0a] dark:text-[#f0f0f0] mb-2">Something went wrong</h2>
            <p className="text-sm text-[#ababab] mb-8 leading-relaxed">
              An unexpected error occurred. Please refresh the page and try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
