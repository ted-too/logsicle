/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_PUBLIC_API_URL: string;
	readonly DEV: boolean;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
