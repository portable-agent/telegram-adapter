import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        coverage: {
            provider: 'v8',
            reporter: ['text'],
            thresholds: {
                statements: 85,
                branches: 80,
                functions: 85,
                lines: 85,
            },
        },
    },
});
