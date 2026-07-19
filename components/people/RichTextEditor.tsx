"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import {
  BoldIcon,
  Heading2Icon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { normalizeTiptapDoc } from "@/lib/people";
import type { TiptapDoc } from "@/entities";

type RichTextEditorProps = {
  value: TiptapDoc;
  onChange: (value: TiptapDoc) => void;
  editable?: boolean;
  placeholder?: string;
  className?: string;
};

const toolbarItems = [
  {
    label: "Heading",
    icon: Heading2Icon,
    action: "heading",
  },
  {
    label: "Bold",
    icon: BoldIcon,
    action: "bold",
  },
  {
    label: "Italic",
    icon: ItalicIcon,
    action: "italic",
  },
  {
    label: "Bullet list",
    icon: ListIcon,
    action: "bulletList",
  },
  {
    label: "Numbered list",
    icon: ListOrderedIcon,
    action: "orderedList",
  },
];

export function RichTextEditor({
  value,
  onChange,
  editable = true,
  placeholder,
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: value,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "rich-text-content min-h-[180px] w-full px-4 py-3 text-[15px] leading-7 outline-none",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(normalizeTiptapDoc(currentEditor.getJSON()));
    },
  });

  const runAction = (action: string) => {
    if (!editor) return;

    if (action === "heading") {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    } else if (action === "bold") {
      editor.chain().focus().toggleBold().run();
    } else if (action === "italic") {
      editor.chain().focus().toggleItalic().run();
    } else if (action === "bulletList") {
      editor.chain().focus().toggleBulletList().run();
    } else if (action === "orderedList") {
      editor.chain().focus().toggleOrderedList().run();
    }
  };

  const isActive = (action: string) => {
    if (!editor) return false;

    if (action === "heading") {
      return editor.isActive("heading", { level: 2 });
    }

    if (action === "bulletList") {
      return editor.isActive("bulletList");
    }

    if (action === "orderedList") {
      return editor.isActive("orderedList");
    }

    return editor.isActive(action);
  };

  return (
    <div className={cn("overflow-hidden rounded-lg border border-gray-200 bg-white", className)}>
      {editable && (
        <div className="flex gap-1 overflow-x-auto border-b border-gray-100 bg-gray-50/70 px-2 py-2">
          {toolbarItems.map((item) => (
            <Button
              key={item.action}
              type="button"
              variant={isActive(item.action) ? "secondary" : "ghost"}
              size="icon"
              className="h-9 w-9 shrink-0 rounded-md"
              onClick={() => runAction(item.action)}
              aria-label={item.label}
              title={item.label}
            >
              <item.icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
      )}
      <div className="relative">
        {placeholder && editor?.isEmpty && editable && (
          <p className="pointer-events-none absolute left-4 top-3 text-[15px] leading-7 text-gray-400">
            {placeholder}
          </p>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
