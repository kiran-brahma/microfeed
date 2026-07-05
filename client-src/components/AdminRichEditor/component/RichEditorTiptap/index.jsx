import React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import RichEditorMediaDialog from "../RichEditorMediaDialog";

function ToolbarButton({ label, isActive, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={!!isActive}
      className={`lh-btn mr-1 mb-1 ${isActive ? "lh-btn-brand-dark" : "lh-btn-white"}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children || label}
    </button>
  );
}

export default function RichEditorTiptap({ value, onChange, extra }) {
  const [isMediaOpen, setIsMediaOpen] = React.useState(false);
  const [mediaType, setMediaType] = React.useState("image");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      ImageExtension,
      LinkExtension.configure({ openOnClick: false }),
    ],
    content: value || "",
    onUpdate: ({ editor: updatedEditor }) => {
      if (onChange) {
        onChange(updatedEditor.getHTML());
      }
    },
  });

  React.useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || "";
    if (next !== current) {
      editor.commands.setContent(next, false);
    }
  }, [value, editor]);

  React.useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, [editor]);

  const insertMedia = (url, insertedMediaType) => {
    if (!editor || !url) {
      return;
    }
    if (insertedMediaType === "image") {
      editor.chain().focus().setImage({ src: url }).run();
    } else {
      editor
        .chain()
        .focus()
        .insertContent(`<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`)
        .run();
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div>
      <div className="lh-rich-editor-toolbar flex flex-wrap items-center p-1 border rounded-tl rounded-tr">
        <ToolbarButton
          label="Bold"
          isActive={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          isActive={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          label="Heading"
          isActive={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          label="Bullet List"
          isActive={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          List
        </ToolbarButton>
        <ToolbarButton
          label="Ordered List"
          isActive={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. List
        </ToolbarButton>
        <ToolbarButton
          label="Link"
          isActive={editor.isActive("link")}
          onClick={() => {
            setMediaType("link");
            setIsMediaOpen(true);
          }}
        >
          Link
        </ToolbarButton>
        <ToolbarButton
          label="Image"
          isActive={false}
          onClick={() => {
            setMediaType("image");
            setIsMediaOpen(true);
          }}
        >
          Image
        </ToolbarButton>
      </div>
      <div className="border rounded-bl rounded-br">
        <EditorContent className="lh-rich-editor-content px-3 py-2" editor={editor} />
      </div>
      <RichEditorMediaDialog
        isOpen={isMediaOpen}
        setIsOpen={setIsMediaOpen}
        mediaType={mediaType}
        onInsert={insertMedia}
        extra={extra}
      />
    </div>
  );
}
