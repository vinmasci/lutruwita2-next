import { FC } from 'react';

interface RichTextEditorProps {
  value?: string;
  onChange: (value: string) => void;
}

declare const RichTextEditor: FC<RichTextEditorProps>;

export { RichTextEditor, RichTextEditorProps };
