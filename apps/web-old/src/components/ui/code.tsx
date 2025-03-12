import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import js from "react-syntax-highlighter/dist/esm/languages/hljs/javascript";
import bash from "react-syntax-highlighter/dist/esm/languages/hljs/bash";

SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("javascript", js);

export { SyntaxHighlighter as Code };
