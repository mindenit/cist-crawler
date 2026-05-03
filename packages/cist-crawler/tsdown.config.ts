import { defineConfig } from 'tsdown'

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm', 'cjs'],
	clean: true,
	dts: true,
	bundle: true,
	minify: true,
	skipNodeModulesBundle: false,
	target: 'es2020',
	outDir: 'dist',
	treeshake: true,
	hash: false,
})
