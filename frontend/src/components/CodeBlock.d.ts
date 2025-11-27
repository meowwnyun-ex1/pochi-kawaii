interface CodeBlockProps {
    code: string;
    language?: string;
    title?: string;
}
declare const CodeBlock: ({ code, language, title }: CodeBlockProps) => any;
export default CodeBlock;
