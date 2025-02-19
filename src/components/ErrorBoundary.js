import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return this.props.fallback || (_jsxs("div", { className: "error-boundary", children: [_jsx("h2", { children: "Something went wrong." }), _jsx("button", { onClick: () => this.setState({ hasError: false }), children: "Try again" })] }));
        }
        return this.props.children;
    }
}
