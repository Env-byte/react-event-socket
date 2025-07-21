import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import {fail} from "node:assert";

export default defineConfig(({ command }) => {
    const plugins = command === 'serve' ? [react()] : [dts({ tsconfigPath: './tsconfig.app.json', rollupTypes: false })];
    return {
        plugins,
        test: {
            globals: true,
            environment: 'jsdom',
            coverage: {
                provider: 'istanbul',
                reporter: ['json', 'json-summary'],
                reportsDirectory: './coverage',
                include: ['src/**'],
                exclude: ['node_modules/**', 'dist/**', 'build/**', 'src/**/*.test.tsx']
            }
        },
        build: {
            lib: {
                // Could also be a dictionary or array of multiple entry points
                entry: resolve(__dirname, 'src/index.ts'),
                name: 'index',
                // the proper extensions will be added
                fileName: 'index'
            },
            rollupOptions: {
                // make sure to externalize deps that shouldn't be bundled
                // into your library
                external: ['react', 'react-dom'],
                output: {
                    // Provide global variables to use in the UMD build
                    // for externalized deps
                    globals: {
                        react: 'React'
                    }
                }
            }
        }
    };
});
