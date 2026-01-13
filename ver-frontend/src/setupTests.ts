import '@testing-library/jest-dom';

// Fix for Ant Design ResizeObserver issue in jsdom
// @ts-ignore
window.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};
