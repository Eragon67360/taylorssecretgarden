"use client";

import type { Editor } from "@tiptap/react";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { type FormEvent, type ReactNode, useId, useState } from "react";

import { cn } from "@/lib/utils";

import { NoteSheet, PAPERS, PinnedPhoto, ruling, TEXT_INSET } from "./note-paper";

/** Blank lines left at the end of a Post (pressing Enter once too often). */
const withoutTrailingBlankLines = (html: string) => html.replace(/(<p><\/p>)+$/, "");

type ComposerProps = {
  member: { name: string; avatarUrl: string | null };
  /** Publishes the Post's HTML; resolves true once it is published. */
  onPublish: (html: string) => Promise<boolean>;
  /** Controls beside the Member's name (e.g. sign out). */
  memberActions?: ReactNode;
};

/**
 * Writing a Post: a blank page from the exercise book, the same paper the
 * feed's lined notes are on, so a Post looks as it will once it is passed.
 * Tiptap with bold, italic, bullet and numbered lists and links; it writes
 * HTML, which the server sanitises when the Post is published.
 */
export default function Composer({ member, onPublish, memberActions }: ComposerProps) {
  const headingId = useId();
  const [publishing, setPublishing] = useState(false);

  const editor = useEditor({
    // Rendered in the browser only, after hydration: no server/client mismatch.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        blockquote: false,
        code: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        trailingNode: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          protocols: ["http", "https", "mailto"],
        },
      }),
      Placeholder.configure({ placeholder: "ok but did you hear the bridge on track 5??" }),
    ],
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Write a Post",
        class: cn("post-content min-h-[140px] pr-5 pb-7 text-[16.5px] break-words outline-none sm:pr-8", TEXT_INSET),
      },
    },
  });

  const isEmpty = useEditorState({ editor, selector: ({ editor }) => editor?.isEmpty ?? true });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editor || editor.isEmpty) return;

    setPublishing(true);
    try {
      if (await onPublish(withoutTrailingBlankLines(editor.getHTML()))) editor.commands.clearContent(true);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <form
      aria-labelledby={headingId}
      className="relative drop-shadow-[0_10px_12px_rgba(40,20,10,.18)]"
      style={{ rotate: `${PAPERS.lined.tilt}deg`, color: PAPERS.lined.ink }}
      onSubmit={handleSubmit}
    >
      <NoteSheet paper="lined" />
      <PinnedPhoto name={member.name} src={member.avatarUrl} />

      <header className={cn("relative flex min-h-[76px] flex-wrap items-start justify-between gap-x-3 gap-y-1 pt-4 pr-4 sm:pr-6", TEXT_INSET)}>
        <div className="min-w-0">
          <h2 className="font-hand text-[26px] leading-[1.05] font-bold" id={headingId}>
            Pass a note
          </h2>
          <p className="truncate text-[13px] font-semibold" style={{ color: PAPERS.lined.soft }}>
            writing as {member.name}
          </p>
        </div>
        {memberActions}
      </header>

      <Toolbar editor={editor} />

      {/* Until the editor mounts, blank lines of the same height. */}
      <div className="relative cursor-text" style={ruling("lined")}>
        {editor ? <EditorContent editor={editor} /> : <div aria-hidden="true" className="min-h-[168px]" />}
      </div>

      <footer className={cn("relative flex items-center justify-between gap-3 pr-4 pb-6 sm:pr-6", TEXT_INSET)}>
        <p aria-hidden="true" className="font-hand text-[19px] font-bold whitespace-nowrap" style={{ color: PAPERS.lined.soft }}>
          (pass it on ♡)
        </p>
        <button
          className="bg-accent text-on-accent focus-ring inline-flex min-h-11 items-center gap-2 rounded-[4px] px-5 text-[15px] font-bold tracking-wide shadow-[0_2px_0_rgba(0,0,0,.15),0_8px_18px_-8px_rgba(60,20,20,.5)] transition-transform duration-200 disabled:opacity-60 motion-safe:active:scale-[.97] motion-safe:enabled:hover:-translate-y-0.5"
          disabled={!editor || isEmpty || publishing}
          type="submit"
        >
          Post
          <span aria-hidden="true">→</span>
        </button>
      </footer>
    </form>
  );
}

type Mark = "bold" | "italic" | "bulletList" | "orderedList" | "link";

/** Formatting buttons, written on the note like margin doodles. */
function Toolbar({ editor }: { editor: Editor | null }) {
  const [linking, setLinking] = useState(false);
  const active = useEditorState({
    editor,
    selector: ({ editor }): Record<Mark, boolean> => ({
      bold: editor?.isActive("bold") ?? false,
      italic: editor?.isActive("italic") ?? false,
      bulletList: editor?.isActive("bulletList") ?? false,
      orderedList: editor?.isActive("orderedList") ?? false,
      link: editor?.isActive("link") ?? false,
    }),
  });

  const run = (command: (editor: Editor) => void) => () => {
    if (editor) command(editor);
  };

  return (
    <div className={cn("relative pr-4 pb-2 sm:pr-6", TEXT_INSET)}>
      <div aria-label="Formatting" className="flex flex-wrap gap-1" role="toolbar">
        <ToolButton label="Bold" pressed={active?.bold} onClick={run((e) => e.chain().focus().toggleBold().run())}>
          <span className="font-extrabold">B</span>
        </ToolButton>
        <ToolButton label="Italic" pressed={active?.italic} onClick={run((e) => e.chain().focus().toggleItalic().run())}>
          <span className="font-serif italic">i</span>
        </ToolButton>
        <ToolButton label="Bullet list" pressed={active?.bulletList} onClick={run((e) => e.chain().focus().toggleBulletList().run())}>
          <BulletIcon />
        </ToolButton>
        <ToolButton label="Numbered list" pressed={active?.orderedList} onClick={run((e) => e.chain().focus().toggleOrderedList().run())}>
          <NumberIcon />
        </ToolButton>
        <ToolButton expanded={linking} label="Link" pressed={active?.link} onClick={() => setLinking((open) => !open)}>
          <LinkIcon />
        </ToolButton>
      </div>
      {linking && editor && <LinkField editor={editor} hasLink={!!active?.link} onDone={() => setLinking(false)} />}
    </div>
  );
}

type ToolButtonProps = { label: string; pressed?: boolean; expanded?: boolean; onClick: () => void; children: ReactNode };

function ToolButton({ label, pressed = false, expanded, onClick, children }: ToolButtonProps) {
  return (
    <button
      aria-expanded={expanded}
      aria-label={label}
      aria-pressed={expanded === undefined ? pressed : undefined}
      className={cn(
        "focus-ring flex size-8 items-center justify-center rounded-[6px] border-[1.5px] text-[17px] leading-none transition-colors",
        pressed || expanded ? "border-current bg-[#23397a] text-[#fffefa]" : "border-[#bcd3e6] bg-[#fffefa] hover:border-current",
      )}
      title={label}
      type="button"
      // Keep the editor's selection: the button acts on it without taking focus.
      onClick={onClick}
      onMouseDown={(event) => event.preventDefault()}
    >
      {children}
    </button>
  );
}

/** Adds a link to the selected words (or the link address itself), or removes one. */
function LinkField({ editor, hasLink, onDone }: { editor: Editor; hasLink: boolean; onDone: () => void }) {
  const inputId = useId();
  const [href, setHref] = useState<string>(() => (editor.getAttributes("link").href as string | undefined) ?? "");

  const addLink = () => {
    const address = href.trim();

    if (!address) return;
    const url = /^(https?:|mailto:)/i.test(address) ? address : `https://${address}`;
    const chain = editor.chain().focus().extendMarkRange("link");

    if (editor.state.selection.empty && !hasLink) {
      chain.insertContent({ type: "text", text: address, marks: [{ type: "link", attrs: { href: url } }] }).run();
    } else {
      chain.setLink({ href: url }).run();
    }
    onDone();
  };

  const removeLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    onDone();
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={inputId}>
        Link address
      </label>
      <input
        // The field opens because the Member asked for it: take them there.
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        className="focus-ring min-h-9 min-w-0 flex-1 rounded-[6px] border-[1.5px] border-[#bcd3e6] bg-[#fffefa] px-2 text-[15px] placeholder:text-[#46557f]"
        id={inputId}
        inputMode="url"
        placeholder="https://…"
        type="text"
        value={href}
        onChange={(event) => setHref(event.target.value)}
        onKeyDown={(event) => {
          // Enter adds the link rather than submitting the Post.
          if (event.key === "Enter") {
            event.preventDefault();
            addLink();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            onDone();
            editor.commands.focus();
          }
        }}
      />
      <button className="focus-ring min-h-9 rounded-[6px] bg-[#23397a] px-3 text-[14px] font-bold text-[#fffefa]" type="button" onClick={addLink}>
        Add link
      </button>
      {hasLink && (
        <button className="focus-ring min-h-9 rounded-[6px] px-2 text-[14px] font-bold underline" type="button" onClick={removeLink}>
          Remove link
        </button>
      )}
    </div>
  );
}

const icon = { "aria-hidden": true, focusable: false, className: "size-[18px]", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeWidth: 2, viewBox: "0 0 24 24" } as const;

function BulletIcon() {
  return (
    <svg {...icon}>
      <circle cx="5" cy="7" fill="currentColor" r="1.4" stroke="none" />
      <circle cx="5" cy="17" fill="currentColor" r="1.4" stroke="none" />
      <path d="M10 7 C14 6.5 17 7.5 20 7 M10 17 C14 16.5 17 17.5 20 17" />
    </svg>
  );
}

function NumberIcon() {
  return (
    <svg {...icon}>
      <path d="M4 5 L5.5 4 V10 M4 14.5 C4.5 13.5 7 13.5 7 15 C7 16.5 4 17.5 4 19.5 H7.2" strokeWidth={1.6} />
      <path d="M11 7 C14 6.5 17 7.5 20 7 M11 17 C14 16.5 17 17.5 20 17" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg {...icon}>
      <path d="M10 14 a4 4 0 0 0 5.6 0 l3-3 a4 4 0 0 0 -5.6 -5.6 l-1 1" />
      <path d="M14 10 a4 4 0 0 0 -5.6 0 l-3 3 a4 4 0 0 0 5.6 5.6 l1 -1" />
    </svg>
  );
}
