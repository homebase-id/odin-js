/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { ReactNode } from 'react';

type ErrorBoundaryProps = {
  children: ReactNode; // like this
};
type ErrorBoundaryState = {
  hasError: boolean; // like this
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: unknown) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(_error: unknown, _errorInfo: unknown) {
    this.setState({ hasError: true });
    // You can also log the error to an error reporting service
    //   logErrorToMyService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}
